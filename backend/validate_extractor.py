"""
Feature-drift checker.

WHY THIS EXISTS
    The model was trained on features produced by an extractor that isn't in this
    repository, and dataset_full.csv has no `url` column — so there is no way to
    compare features.py against ground truth directly.

    What can be checked is whether the values features.py produces fall inside
    the range the model actually saw during training. If a feature comes out
    systematically outside that range, the extractor's convention for it is
    wrong, and every prediction is being made on an out-of-distribution input.
    A Random Forest will not complain; it will just be confidently wrong.

USAGE
    python validate_extractor.py                     # built-in sample URLs
    python validate_extractor.py urls.txt            # one URL per line
    python validate_extractor.py --no-network        # lexical features only

Read the OUT-OF-RANGE and ALWAYS-MISSING sections of the report first. Those are
where real problems show up.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import pandas as pd

from features import DEGENERATE_FEATURES, FEATURE_ORDER, TRAINING_CLIP_BOUNDS, extract_features

DATASET = Path(__file__).resolve().parent.parent / "data" / "cleaned_phishing_dataset.csv"

SAMPLE_URLS = [
    "https://www.google.com",
    "https://github.com/torvalds/linux",
    "https://en.wikipedia.org/wiki/Phishing",
    "http://example.com/a/b/c/file.php?x=1&y=2",
    "https://accounts.google.com/signin/v2/identifier",
    "http://192.168.1.1/admin/login.php",
    "https://bit.ly/3xYz",
]


def load_training_ranges() -> pd.DataFrame:
    if not DATASET.exists():
        sys.exit(f"training data not found at {DATASET}")
    frame = pd.read_csv(DATASET)
    frame = frame.drop(columns=[c for c in ("phishing",) if c in frame.columns])

    missing = [c for c in FEATURE_ORDER if c not in frame.columns]
    extra = [c for c in frame.columns if c not in FEATURE_ORDER]
    if missing or extra:
        print("!! FEATURE_ORDER does not match the dataset columns.")
        if missing:
            print(f"   missing from dataset: {missing}")
        if extra:
            print(f"   present in dataset but not in FEATURE_ORDER: {extra}")
        sys.exit(1)

    # Column order check too, since the scaler indexes positionally.
    if list(frame.columns) != FEATURE_ORDER:
        print("!! Column ORDER differs between FEATURE_ORDER and the dataset.")
        for index, (expected, actual) in enumerate(zip(FEATURE_ORDER, frame.columns)):
            if expected != actual:
                print(f"   first mismatch at index {index}: {expected!r} vs {actual!r}")
                break
        sys.exit(1)

    return frame.agg(["min", "max", "mean", "std"]).T


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("urls_file", nargs="?", help="file with one URL per line")
    parser.add_argument("--no-network", action="store_true", help="skip live lookups")
    args = parser.parse_args()

    urls = SAMPLE_URLS
    if args.urls_file:
        urls = [
            line.strip()
            for line in Path(args.urls_file).read_text(encoding="utf-8").splitlines()
            if line.strip()
        ]

    ranges = load_training_ranges()
    print(f"FEATURE_ORDER matches the dataset: 111 columns, correct order.\n")
    print(f"Extracting {len(urls)} URL(s) with network={'off' if args.no_network else 'on'}...\n")

    extracted: dict[str, list[float]] = {name: [] for name in FEATURE_ORDER}
    for url in urls:
        _, named, _clamped = extract_features(url, with_network=not args.no_network)
        for name in FEATURE_ORDER:
            extracted[name].append(named[name])

    out_of_range: list[str] = []
    always_missing: list[str] = []

    for name in FEATURE_ORDER:
        values = extracted[name]
        low, high = ranges.loc[name, "min"], ranges.loc[name, "max"]

        if all(v == -1 for v in values):
            # -1 is legitimate for absent sections and failed lookups, but a
            # feature that is ALWAYS -1 contributes nothing.
            always_missing.append(name)
            continue

        offenders = [v for v in values if v != -1 and not (low <= v <= high)]
        if offenders:
            out_of_range.append(
                f"  {name:<28} training [{low:g}, {high:g}]  got {sorted(set(offenders))[:5]}"
            )

    print("=" * 72)
    print("OUT-OF-RANGE  (extractor convention probably differs from training)")
    print("=" * 72)
    print("\n".join(out_of_range) if out_of_range else "  none — every value sits inside training range")

    print()
    print("=" * 72)
    print("ALWAYS MISSING  (-1 for every URL tried)")
    print("=" * 72)
    if always_missing:
        print("  " + ", ".join(always_missing))
        print()
        print("  Expected here: url_google_index and domain_google_index (no public API).")
        print("  Anything else means a lookup is failing or a library is not installed —")
        print("  check that dnspython, python-whois and requests are present.")
    else:
        print("  none")

    print()
    print("=" * 72)
    print("REMINDER")
    print("=" * 72)
    print("  Passing this check means values are plausible, NOT that they are correct.")
    print("  Two extractors can both stay in range and still disagree on every value.")
    print("  The only real fix is the original extraction script.")


if __name__ == "__main__":
    main()
