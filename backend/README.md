# Backend — phishing detection API

Serves `models/phishing_rf_model.pkl` over HTTP so the frontend can make real
predictions instead of the simulated ones it ships with.

## Run

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt
python app.py                     # http://localhost:5000
```

Check it came up correctly:

```bash
curl http://localhost:5000/health
```

That reports the model class, tree count, and how many features the scaler
expects. It should say 111. Then point the frontend at it — in `Designing/.env`:

```
VITE_API_URL=http://localhost:5000
VITE_USE_MOCK=false
```

## Read this before trusting a prediction

**The feature extractor is a reimplementation, not the original.**

The model was trained on 111 features produced by the extractor that shipped with
the Vrbančič phishing dataset. That script is not in this repository, and
`data/dataset_full.csv` contains only the finished feature columns — there is no
`url` column. So there is no way to verify `features.py` against ground truth
here.

Concrete evidence the conventions aren't guessable: in the first row of
`dataset_full.csv`, `length_url` is 25 while `domain_length` (17) +
`directory_length` (8) + `file_length` (7) sum to 32. The URL sections are
therefore not a clean partition of the string, and the actual rule can't be
inferred from the numbers alone.

What follows from that: predictions will be *plausible* but their accuracy is
unknown, and it is not the 97.01% from the notebook. That figure was measured on
features from the original extractor. Where this reimplementation's conventions
differ, the model receives inputs unlike anything it trained on — and a Random
Forest gives no signal when that happens; it just returns a confident number.

Run the drift checker to see how far off things look:

```bash
python validate_extractor.py
python validate_extractor.py --no-network      # lexical features only
python validate_extractor.py my_urls.txt
```

It verifies `FEATURE_ORDER` matches the dataset's columns and order exactly, then
flags features whose extracted values fall outside the range seen in training.
Anything listed under OUT-OF-RANGE is a convention that needs correcting.

**To make this trustworthy** you need one of:

1. The original extraction script (the dataset's authors published one alongside
   the paper) — then rewrite `features.py` to match it exactly.
2. A labelled corpus of raw URLs — then re-extract with `features.py` and retrain,
   so training and inference share one extractor. This is the more robust option,
   because it removes the mismatch by construction.

Until then, treat output as a demonstration.

## Endpoints

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | Model status, feature count, thresholds |
| POST | `/predict` | `{"url": "...", "features": {optional overrides}}` |
| POST | `/bulk-scan` | `{"urls": [...]}`, max 200, 8 threads |
| GET | `/model-metrics` | Notebook metrics; importances read live off the model |
| GET | `/history` | Scans performed by this process (in memory, last 500) |
| GET | `/analytics` | Aggregates over that history — **starts empty** |

`/predict` returns the exact shape the frontend already consumes, so there's no
translation layer on the client.

### Verdicts

The model is binary: `phishing` = 1, `legitimate` = 0. "Suspicious" is a
confidence band, not a third class — anything between the two thresholds lands
there rather than being forced into a verdict the model can't support.

```
P(phishing) >= 0.75   ->  Phishing
P(phishing) <= 0.35   ->  Legitimate
otherwise             ->  Suspicious
```

Override with the `PHISHING_THRESHOLD` and `LEGITIMATE_THRESHOLD` environment
variables. `risk_score` is always `P(phishing) * 100` regardless of the label, so
the gauge moves monotonically with danger. `probability` is confidence in the
label actually given, which is what the UI's "Model Confidence" means — a
Legitimate result reports `1 - P(phishing)`.

### Per-feature risk

The `features` block in a `/predict` response reports each feature's real
extracted value and its z-score against the training mean and standard deviation,
which `StandardScaler` already stores. So "high risk" means *this value is more
than two standard deviations from what the model usually sees* — a checkable
statement — rather than a hand-written opinion. `impact` is the model's own
`feature_importances_`, rescaled so the strongest feature in the response reads
as 1.0.

A value of `unavailable` means the lookup failed or the URL section was absent;
those are reported as low risk, since missing evidence is not evidence of danger.

### Unavailable features

Of the 111, roughly 98 come from the URL string and are always available. The
other 13 need live lookups and degrade to `-1` on failure — the same encoding the
training data uses:

- DNS: `qty_ip_resolved`, `qty_nameservers`, `qty_mx_servers`, `ttl_hostname`, `domain_spf`
- WHOIS: `time_domain_activation`, `time_domain_expiration`
- TLS: `tls_ssl_certificate`
- HTTP: `time_response`, `qty_redirects`
- ASN: `asn_ip` (via Team Cymru DNS)
- `url_google_index`, `domain_google_index` — **always -1**, no legitimate public API

Four of those (`time_domain_activation`, `ttl_hostname`, `asn_ip`,
`time_response`) are in the model's top ten by importance, so a scan of an
unreachable host is materially less reliable than one of a live host. Each
response includes `unavailable_features` so the client can tell the user how
complete the evidence was.

Live lookups cost roughly 1–4 seconds per URL. `LOOKUP_TIMEOUT` caps each one.
