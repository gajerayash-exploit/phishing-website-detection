"""
111-feature extractor for the phishing Random Forest.

    IMPORTANT — READ BEFORE TRUSTING THE OUTPUT
    ------------------------------------------------------------------
    The model in models/phishing_rf_model.pkl was trained on features produced
    by the *original* extractor that shipped with the Vrbančič phishing dataset.
    That extractor's source is not in this repository, and data/dataset_full.csv
    contains only the finished feature columns — there is no `url` column — so
    there is no way to verify a reimplementation against ground truth here.

    Evidence that the conventions are not recoverable from the data alone: in the
    first row of dataset_full.csv, length_url = 25 while domain_length (17) +
    directory_length (8) + file_length (7) = 32. The URL sections are therefore
    not a clean partition of the string, and the exact rule cannot be inferred.

    What that means in practice: this module is a good-faith reimplementation.
    Where it differs from the original, predictions will drift — silently, because
    a Random Forest will happily score an out-of-distribution vector. Every
    assumption is marked `ASSUMPTION:` below so they can be corrected one at a
    time. Run validate_extractor.py to see which features fall outside the ranges
    actually observed in training; that is the closest thing to a check available
    without the original URLs.
    ------------------------------------------------------------------

Conventions that ARE confirmed from the data:
  * An absent URL section encodes as -1 across all of its features. Row 1 of
    dataset_full.csv has no query string and carries -1 for all 20 params
    columns (17 char counts, params_length, tld_present_params, qty_params).
  * An unavailable lookup also encodes as -1 — the same row has
    time_domain_activation = -1 and time_domain_expiration = -1.
  * time_response is a float in seconds (0.207316).
  * asn_ip is the raw AS number (60781), not an index.
"""

from __future__ import annotations

import ipaddress
import re
import socket
import ssl
import time
from urllib.parse import urlparse

# ---------------------------------------------------------------------------
# Feature order
# ---------------------------------------------------------------------------
# Copied verbatim from the header of data/X_train_scaled.csv, which is the order
# StandardScaler was fitted in. Order matters: the scaler and the forest both
# index positionally, so a single transposition silently corrupts every result.

SPECIAL_CHARS = [
    ("dot", "."),
    ("hyphen", "-"),
    ("underline", "_"),
    ("slash", "/"),
    ("questionmark", "?"),
    ("equal", "="),
    ("at", "@"),
    ("and", "&"),
    ("exclamation", "!"),
    ("space", " "),
    ("tilde", "~"),
    ("comma", ","),
    ("plus", "+"),
    ("asterisk", "*"),
    ("hashtag", "#"),
    ("dollar", "$"),
    ("percent", "%"),
]

FEATURE_ORDER = (
    [f"qty_{name}_url" for name, _ in SPECIAL_CHARS]
    + ["qty_tld_url", "length_url"]
    + [f"qty_{name}_domain" for name, _ in SPECIAL_CHARS]
    + ["qty_vowels_domain", "domain_length", "domain_in_ip", "server_client_domain"]
    + [f"qty_{name}_directory" for name, _ in SPECIAL_CHARS]
    + ["directory_length"]
    + [f"qty_{name}_file" for name, _ in SPECIAL_CHARS]
    + ["file_length"]
    + [f"qty_{name}_params" for name, _ in SPECIAL_CHARS]
    + ["params_length", "tld_present_params", "qty_params"]
    + [
        "email_in_url",
        "time_response",
        "domain_spf",
        "asn_ip",
        "time_domain_activation",
        "time_domain_expiration",
        "qty_ip_resolved",
        "qty_nameservers",
        "qty_mx_servers",
        "ttl_hostname",
        "tls_ssl_certificate",
        "qty_redirects",
        "url_google_index",
        "domain_google_index",
        "url_shortened",
    ]
)

assert len(FEATURE_ORDER) == 111, f"expected 111 features, built {len(FEATURE_ORDER)}"

MISSING = -1  # The dataset's encoding for "absent or could not be determined".

# ---------------------------------------------------------------------------
# Training-time outlier clipping — MUST be applied before scaling
# ---------------------------------------------------------------------------
# notebook/preprocessing_phishing.ipynb cell [23] IQR-clipped exactly five
# columns before the split, so the model never saw a raw value outside these
# bounds. Inference has to do the same or it feeds the forest inputs unlike
# anything in training.
#
# Reproduced exactly: quantiles taken on dataset_full.csv after drop_duplicates
# (87,209 rows), bounds = Q1 - 1.5*IQR to Q3 + 1.5*IQR. Verified against the
# min/max actually present in cleaned_phishing_dataset.csv — all five match.
#
#   column          Q1    Q3   IQR    lower   upper
#   length_url      17    39    22      -16      72
#   qty_redirects    0     1     1     -1.5     2.5
#   qty_dot_url      2     2     0        2       2   <- collapsed to a constant
#   qty_at_url       0     0     0        0       0   <- collapsed to a constant
#   url_shortened    0     0     0        0       0   <- collapsed to a constant
#
# WHAT THIS COSTS: for the three concentrated columns Q1 == Q3, so IQR == 0 and
# the bounds collapsed to a single value. Those features are dead — every row in
# training carries the same number, so the model cannot learn from them and
# cannot use them at inference:
#
#   * qty_at_url    always 0 — an "@" in the URL is a classic credential-hiding
#                   trick, and this destroyed the model's ability to see it.
#   * url_shortened always 0 — shortener detection is gone entirely.
#   * qty_dot_url   always 2 — dot count in the URL carries no signal.
#
# length_url is capped at 72 characters. It is the 6th most important feature in
# the model, so every URL longer than 72 characters looks identical to it on that
# dimension. Plenty of legitimate URLs exceed 72 characters.
#
# This is a property of how the model was trained, not a bug in this file. Fixing
# it means re-running preprocessing without the IQR step (or applying it only to
# genuinely long-tailed columns) and retraining.
TRAINING_CLIP_BOUNDS: dict[str, tuple[float, float]] = {
    "length_url": (-16.0, 72.0),
    "qty_redirects": (-1.5, 2.5),
    "qty_dot_url": (2.0, 2.0),
    "qty_at_url": (0.0, 0.0),
    "url_shortened": (0.0, 0.0),
}

# Features the clipping renders constant, and therefore useless as inputs.
DEGENERATE_FEATURES = tuple(
    name for name, (lo, hi) in TRAINING_CLIP_BOUNDS.items() if lo == hi
)


def apply_training_clip(features: dict[str, float]) -> tuple[dict[str, float], list[str]]:
    """
    Clamps the five columns the training pipeline clipped.

    Returns (clipped_features, names_that_were_actually_clamped) so the caller can
    tell the user when a real measurement was discarded — e.g. a 120-character URL
    being reported to the model as 72.
    """
    clipped = dict(features)
    clamped: list[str] = []
    for name, (low, high) in TRAINING_CLIP_BOUNDS.items():
        value = clipped.get(name)
        if value is None:
            continue
        bounded = min(max(value, low), high)
        if bounded != value:
            clamped.append(name)
        clipped[name] = bounded
    return clipped, clamped


# ---------------------------------------------------------------------------
# Lexical helpers
# ---------------------------------------------------------------------------

VOWELS = set("aeiou")

# ASSUMPTION: url_shortened is a boolean over a known-shortener list. The
# original list is unpublished; this covers the common services. A shortener not
# on this list reads as 0 rather than -1, because absence of evidence here is
# genuinely "not shortened" rather than "unknown".
SHORTENER_DOMAINS = {
    "bit.ly", "goo.gl", "tinyurl.com", "t.co", "ow.ly", "is.gd", "buff.ly",
    "adf.ly", "bit.do", "cutt.ly", "rebrand.ly", "shorte.st", "tiny.cc",
    "rb.gy", "s.id", "soo.gd", "clck.ru", "shorturl.at", "v.gd", "qr.ae",
    "t.ly", "lnkd.in", "db.tt", "youtu.be", "wp.me", "trib.al", "j.mp",
}

# ASSUMPTION: qty_tld_url counts how many dot-separated tokens anywhere in the
# URL are recognisable TLDs. Without the original TLD list this uses a common
# subset, so URLs on rarer TLDs will undercount. The dataset description reads
# "number of TLDs in URL", which is why this counts occurrences rather than
# measuring the TLD's length — but that reading is not certain.
COMMON_TLDS = {
    "com", "org", "net", "edu", "gov", "mil", "int", "io", "co", "us", "uk",
    "de", "fr", "it", "es", "nl", "ru", "cn", "jp", "kr", "in", "br", "au",
    "ca", "ch", "se", "no", "fi", "dk", "pl", "cz", "at", "be", "pt", "gr",
    "tr", "mx", "ar", "cl", "za", "ng", "ke", "eg", "info", "biz", "name",
    "pro", "mobi", "xyz", "top", "site", "online", "club", "shop", "app",
    "dev", "ai", "me", "tv", "cc", "ws", "to", "ly", "sh", "gg", "id", "vn",
    "th", "my", "sg", "ph", "pk", "bd", "ir", "ua", "ro", "hu", "bg", "hr",
}

EMAIL_RE = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}")


def _char_counts(section: str | None) -> list[int]:
    """17 per-character counts, or 17 × -1 when the section is absent."""
    if section is None:
        return [MISSING] * len(SPECIAL_CHARS)
    return [section.count(char) for _, char in SPECIAL_CHARS]


def _length(section: str | None) -> int:
    return MISSING if section is None else len(section)


def split_url(raw_url: str) -> dict[str, str | None]:
    """
    Decompose a URL into the dataset's five sections.

    ASSUMPTION: this is the standard reading — domain is the hostname without
    port, directory is the path up to and including the last separator, file is
    the final path segment, params is the raw query string. `None` marks an
    absent section so it can encode as -1.

    Note the caveat in the module docstring: the training data's own numbers do
    not add up under this reading, so at least one of these boundaries differs
    from the original extractor.
    """
    url = raw_url.strip()
    if not re.match(r"^[a-zA-Z][a-zA-Z0-9+.\-]*://", url):
        # ASSUMPTION: protocol-less input is treated as http. This changes
        # length_url by 7 characters, which matters — length_url is the 6th most
        # important feature in the model.
        url = "http://" + url

    parsed = urlparse(url)
    hostname = parsed.hostname or ""
    path = parsed.path or ""

    if path and path != "/":
        if "/" in path.lstrip("/"):
            head, _, tail = path.rpartition("/")
            directory = head or None
            file_part = tail or None
        else:
            directory = None
            file_part = path.lstrip("/") or None
    else:
        directory = None
        file_part = None

    return {
        "url": url,
        "domain": hostname or None,
        "directory": directory,
        "file": file_part,
        "params": parsed.query or None,
    }


def _is_ip(host: str) -> int:
    try:
        ipaddress.ip_address(host)
        return 1
    except ValueError:
        return 0


def extract_lexical(raw_url: str) -> dict[str, float]:
    """
    The ~96 features derivable from the URL string alone. No network access, so
    this is fast and deterministic.
    """
    parts = split_url(raw_url)
    url, domain = parts["url"], parts["domain"]
    directory, file_part, params = parts["directory"], parts["file"], parts["params"]

    out: dict[str, float] = {}

    # --- url ---
    for (name, _), value in zip(SPECIAL_CHARS, _char_counts(url)):
        out[f"qty_{name}_url"] = value
    tokens = re.split(r"[^A-Za-z0-9]+", url.lower())
    out["qty_tld_url"] = sum(1 for token in tokens if token in COMMON_TLDS)
    out["length_url"] = _length(url)

    # --- domain ---
    for (name, _), value in zip(SPECIAL_CHARS, _char_counts(domain)):
        out[f"qty_{name}_domain"] = value
    out["qty_vowels_domain"] = (
        MISSING if domain is None else sum(1 for ch in domain.lower() if ch in VOWELS)
    )
    out["domain_length"] = _length(domain)
    out["domain_in_ip"] = MISSING if domain is None else _is_ip(domain)
    # ASSUMPTION: server_client_domain flags the literal words "server" or
    # "client" appearing in the hostname — a documented phishing tell.
    out["server_client_domain"] = (
        MISSING
        if domain is None
        else int("server" in domain.lower() or "client" in domain.lower())
    )

    # --- directory ---
    for (name, _), value in zip(SPECIAL_CHARS, _char_counts(directory)):
        out[f"qty_{name}_directory"] = value
    out["directory_length"] = _length(directory)

    # --- file ---
    for (name, _), value in zip(SPECIAL_CHARS, _char_counts(file_part)):
        out[f"qty_{name}_file"] = value
    out["file_length"] = _length(file_part)

    # --- params ---
    for (name, _), value in zip(SPECIAL_CHARS, _char_counts(params)):
        out[f"qty_{name}_params"] = value
    out["params_length"] = _length(params)
    if params is None:
        out["tld_present_params"] = MISSING
        out["qty_params"] = MISSING
    else:
        param_tokens = re.split(r"[^A-Za-z0-9]+", params.lower())
        out["tld_present_params"] = int(any(t in COMMON_TLDS for t in param_tokens))
        out["qty_params"] = len([p for p in params.split("&") if p])

    out["email_in_url"] = int(bool(EMAIL_RE.search(url)))

    # ASSUMPTION: shortener check is on the registered hostname, with a leading
    # "www." removed. Note: str.lstrip("www.") would strip any leading w/.
    # characters — turning "wallet.com" into "allet.com" — so the prefix is
    # removed explicitly.
    if domain is None:
        out["url_shortened"] = MISSING
    else:
        host = domain.lower()
        if host.startswith("www."):
            host = host[4:]
        out["url_shortened"] = int(host in SHORTENER_DOMAINS)

    return out


# ---------------------------------------------------------------------------
# Network features
# ---------------------------------------------------------------------------
# Each of these can fail, hang, or be blocked. Every one is individually wrapped
# and degrades to MISSING, matching how the training data encodes an unavailable
# lookup — so a dead domain still produces a scoreable vector.


def _dns_features(domain: str, timeout: float) -> dict[str, float]:
    out = {
        "domain_spf": MISSING,
        "qty_ip_resolved": MISSING,
        "qty_nameservers": MISSING,
        "qty_mx_servers": MISSING,
        "ttl_hostname": MISSING,
    }
    try:
        import dns.resolver  # type: ignore
    except ImportError:
        # dnspython absent: leave every DNS feature MISSING rather than guessing.
        return out

    resolver = dns.resolver.Resolver()
    resolver.timeout = timeout
    resolver.lifetime = timeout

    def query(record: str):
        try:
            return resolver.resolve(domain, record)
        except Exception:
            return None

    a_records = query("A")
    if a_records is not None:
        out["qty_ip_resolved"] = len(a_records)
        # ttl_hostname is the A record's TTL in seconds (892 in the sample row).
        rrset = getattr(a_records, "rrset", None)
        if rrset is not None:
            out["ttl_hostname"] = int(rrset.ttl)

    ns_records = query("NS")
    if ns_records is not None:
        out["qty_nameservers"] = len(ns_records)

    mx_records = query("MX")
    out["qty_mx_servers"] = 0 if mx_records is None else len(mx_records)

    txt_records = query("TXT")
    if txt_records is not None:
        joined = " ".join(str(r) for r in txt_records).lower()
        out["domain_spf"] = int("v=spf1" in joined)
    return out


def _whois_features(domain: str) -> dict[str, float]:
    """
    time_domain_activation / _expiration in days. Both are -1 in the sample row,
    so -1 on failure is faithful to the training distribution.
    """
    out = {"time_domain_activation": MISSING, "time_domain_expiration": MISSING}
    try:
        import whois  # type: ignore
    except ImportError:
        return out

    try:
        record = whois.whois(domain)
    except Exception:
        return out

    def to_days(value, past: bool) -> float:
        if isinstance(value, list):
            value = value[0] if value else None
        if value is None:
            return MISSING
        try:
            delta = (time.time() - value.timestamp()) / 86400.0
        except Exception:
            return MISSING
        return int(delta if past else -delta)

    out["time_domain_activation"] = to_days(record.creation_date, past=True)
    out["time_domain_expiration"] = to_days(record.expiration_date, past=False)
    return out


def _tls_feature(domain: str, timeout: float) -> float:
    """1 if a valid certificate chain is presented on 443, else 0."""
    try:
        context = ssl.create_default_context()
        with socket.create_connection((domain, 443), timeout=timeout) as sock:
            with context.wrap_socket(sock, server_hostname=domain) as tls:
                return int(bool(tls.getpeercert()))
    except Exception:
        # A refused connection or invalid chain is real evidence of "no valid
        # certificate", so 0 rather than MISSING.
        return 0


def _http_features(url: str, timeout: float) -> dict[str, float]:
    out = {"time_response": MISSING, "qty_redirects": MISSING}
    try:
        import requests  # type: ignore
    except ImportError:
        return out
    try:
        started = time.perf_counter()
        response = requests.get(url, timeout=timeout, allow_redirects=True)
        out["time_response"] = round(time.perf_counter() - started, 6)
        out["qty_redirects"] = len(response.history)
    except Exception:
        pass
    return out


def _asn_feature(domain: str, timeout: float) -> float:
    """
    asn_ip is a raw AS number. Resolving IP → ASN needs an external source
    (Team Cymru DNS, or a MaxMind database). Attempted via Cymru's DNS service
    when dnspython is available.
    """
    try:
        import dns.resolver  # type: ignore
    except ImportError:
        return MISSING
    try:
        ip = socket.gethostbyname(domain)
    except Exception:
        return MISSING
    try:
        reversed_ip = ".".join(reversed(ip.split(".")))
        resolver = dns.resolver.Resolver()
        resolver.timeout = timeout
        resolver.lifetime = timeout
        answer = resolver.resolve(f"{reversed_ip}.origin.asn.cymru.com", "TXT")
        return int(str(answer[0]).strip('"').split("|")[0].strip().split()[0])
    except Exception:
        return MISSING


def extract_network(raw_url: str, timeout: float = 4.0) -> dict[str, float]:
    parts = split_url(raw_url)
    domain, url = parts["domain"], parts["url"]

    out: dict[str, float] = {
        "domain_spf": MISSING,
        "asn_ip": MISSING,
        "time_domain_activation": MISSING,
        "time_domain_expiration": MISSING,
        "qty_ip_resolved": MISSING,
        "qty_nameservers": MISSING,
        "qty_mx_servers": MISSING,
        "ttl_hostname": MISSING,
        "tls_ssl_certificate": 0,
        "time_response": MISSING,
        "qty_redirects": MISSING,
        # These two need Google's index, which has no legitimate public API.
        # They are -1 in the sample row too, so the model has seen this value.
        "url_google_index": MISSING,
        "domain_google_index": MISSING,
    }
    if not domain:
        return out

    out.update(_dns_features(domain, timeout))
    out.update(_whois_features(domain))
    out.update(_http_features(url, timeout))
    out["tls_ssl_certificate"] = _tls_feature(domain, timeout)
    out["asn_ip"] = _asn_feature(domain, timeout)
    return out


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------


def extract_features(
    raw_url: str,
    *,
    with_network: bool = True,
    timeout: float = 4.0,
    overrides: dict[str, float] | None = None,
    clip: bool = True,
) -> tuple[list[float], dict[str, float], list[str]]:
    """
    Returns (vector_in_training_order, named_dict, clamped_feature_names).

    with_network=False skips every lookup and leaves those 13 features at -1.
    That is a supported mode — the model has seen -1 for these columns — but
    accuracy will be lower, since time_domain_activation, ttl_hostname, asn_ip
    and time_response are four of its ten most important features.

    `overrides` lets a caller supply known values (e.g. from the Scanner's
    advanced panel), applied before clipping so an override can't smuggle in an
    out-of-range value either.

    clip=True applies the training pipeline's IQR bounds. Leave it on: the model
    was trained on clipped data, so passing raw values makes the input
    out-of-distribution. clip=False exists only for inspecting true measurements.
    """
    features = {name: MISSING for name in FEATURE_ORDER}
    features.update(extract_lexical(raw_url))

    if with_network:
        features.update(extract_network(raw_url, timeout=timeout))

    if overrides:
        for key, value in overrides.items():
            if key in features and value is not None:
                features[key] = value

    unexpected = set(features) - set(FEATURE_ORDER)
    if unexpected:
        raise ValueError(f"extractor produced unknown features: {sorted(unexpected)}")

    clamped: list[str] = []
    if clip:
        features, clamped = apply_training_clip(features)

    return [float(features[name]) for name in FEATURE_ORDER], features, clamped
