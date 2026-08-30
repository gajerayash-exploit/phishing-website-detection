// ---- Mock Data for Development ----
// `model` reads "Simulated" throughout: these rows were never produced by the
// Random Forest, and labelling them with it made fabricated history
// indistinguishable from real scans.
const SIMULATED = 'Simulated';

export const mockScanHistory = [
  { id: 'scan_1', url: 'google.com', prediction: 'Legitimate', probability: 0.987, risk_score: 3, model: SIMULATED, scan_time: '2026-08-17T14:30:00Z' },
  { id: 'scan_2', url: 'secure-bank-login.xyz', prediction: 'Phishing', probability: 0.972, risk_score: 97, model: SIMULATED, scan_time: '2026-08-17T14:22:00Z' },
  { id: 'scan_3', url: 'github.com', prediction: 'Legitimate', probability: 0.995, risk_score: 2, model: SIMULATED, scan_time: '2026-08-17T14:15:00Z' },
  { id: 'scan_4', url: 'free-iphone-winner.com', prediction: 'Phishing', probability: 0.945, risk_score: 94, model: SIMULATED, scan_time: '2026-08-17T14:08:00Z' },
  { id: 'scan_5', url: 'amazon.com/products', prediction: 'Legitimate', probability: 0.991, risk_score: 4, model: SIMULATED, scan_time: '2026-08-17T13:55:00Z' },
  { id: 'scan_6', url: 'verify-paypal-account.net', prediction: 'Phishing', probability: 0.963, risk_score: 96, model: SIMULATED, scan_time: '2026-08-17T13:45:00Z' },
  { id: 'scan_7', url: 'stackoverflow.com', prediction: 'Legitimate', probability: 0.998, risk_score: 1, model: SIMULATED, scan_time: '2026-08-17T13:30:00Z' },
  { id: 'scan_8', url: 'update-your-netflix.com', prediction: 'Phishing', probability: 0.918, risk_score: 89, model: SIMULATED, scan_time: '2026-08-17T13:20:00Z' },
  { id: 'scan_9', url: 'medium.com/article', prediction: 'Legitimate', probability: 0.976, risk_score: 5, model: SIMULATED, scan_time: '2026-08-17T13:10:00Z' },
  { id: 'scan_10', url: 'suspicious-login-page.co', prediction: 'Suspicious', probability: 0.623, risk_score: 52, model: SIMULATED, scan_time: '2026-08-17T13:00:00Z' },
  { id: 'scan_11', url: 'notion.so', prediction: 'Legitimate', probability: 0.993, risk_score: 2, model: SIMULATED, scan_time: '2026-08-17T12:50:00Z' },
  { id: 'scan_12', url: 'cheap-meds-online.xyz', prediction: 'Phishing', probability: 0.889, risk_score: 85, model: SIMULATED, scan_time: '2026-08-17T12:40:00Z' },
];

/* ---- Canonical classification ----
   ONE source of truth for how the corpus splits. Everything below reconciles to
   these three numbers.

   The dataset previously mixed two incompatible schemes. `detectionActivity` and
   the `phishingDetected` KPI used a two-way split (legitimate vs flagged, where
   "phishing" meant 3,218), while `riskDistribution` used a three-way split
   (safe / suspicious / phishing, where "phishing" meant 1,973). `detectionTrends`
   inherited the three-way labels but the two-way number, double-counting the
   suspicious bucket: its August column summed to 14,087 and July to 12,980,
   both against an all-time total of 12,842. Because the Analytics trend chart
   stacks those series, the overcount was visible on the y-axis.

   Every series is now three-way and every row sums to its own total. */
const CLASSIFICATION = {
  legitimate: 9624,
  suspicious: 1245,
  phishing: 1973,
};

const TOTAL_SCANS =
  CLASSIFICATION.legitimate + CLASSIFICATION.suspicious + CLASSIFICATION.phishing; // 12,842

export const mockAnalytics = {
  totalScans: TOTAL_SCANS,
  // Confirmed phishing only, so the figure matches its label, the donut's
  // Phishing slice, and the August column of detectionTrends.
  phishingDetected: CLASSIFICATION.phishing,
  legitimateWebsites: CLASSIFICATION.legitimate,
  // The Random Forest's real test-set accuracy from model_building.ipynb. Was
  // 96.8, which matched nothing in the notebook.
  modelAccuracy: 97.01,
  totalScansChange: 12.5,
  phishingChange: -3.2,
  legitimateChange: 8.7,
  accuracyChange: 0.4,

  /* Per-bucket activity. Every row satisfies
     legitimate + suspicious + phishing === total. The suspicious column was
     absent before, folded into `phishing`. */
  detectionActivity: {
    '24H': [
      { time: '00:00', total: 45, legitimate: 33, suspicious: 5, phishing: 7 },
      { time: '04:00', total: 23, legitimate: 18, suspicious: 2, phishing: 3 },
      { time: '08:00', total: 78, legitimate: 56, suspicious: 9, phishing: 13 },
      { time: '12:00', total: 112, legitimate: 77, suspicious: 14, phishing: 21 },
      { time: '16:00', total: 95, legitimate: 67, suspicious: 11, phishing: 17 },
      { time: '20:00', total: 67, legitimate: 49, suspicious: 7, phishing: 11 },
      { time: '23:59', total: 52, legitimate: 38, suspicious: 5, phishing: 9 },
    ],
    '7D': [
      { time: 'Mon', total: 420, legitimate: 315, suspicious: 41, phishing: 64 },
      { time: 'Tue', total: 380, legitimate: 285, suspicious: 37, phishing: 58 },
      { time: 'Wed', total: 450, legitimate: 330, suspicious: 46, phishing: 74 },
      { time: 'Thu', total: 510, legitimate: 370, suspicious: 54, phishing: 86 },
      { time: 'Fri', total: 490, legitimate: 360, suspicious: 50, phishing: 80 },
      { time: 'Sat', total: 320, legitimate: 235, suspicious: 33, phishing: 52 },
      { time: 'Sun', total: 280, legitimate: 210, suspicious: 27, phishing: 43 },
    ],
    /* The four weeks partition the whole corpus: the columns sum to exactly
       9,624 / 1,245 / 1,973 and the totals to 12,842. */
    '30D': [
      { time: 'Week 1', total: 2800, legitimate: 2080, suspicious: 279, phishing: 441 },
      { time: 'Week 2', total: 3100, legitimate: 2290, suspicious: 314, phishing: 496 },
      { time: 'Week 3', total: 3400, legitimate: 2530, suspicious: 337, phishing: 533 },
      { time: 'Week 4', total: 3542, legitimate: 2724, suspicious: 315, phishing: 503 },
    ],
    // Cumulative, so the final row is the canonical split.
    '90D': [
      { time: 'Jun', total: 9200, legitimate: 6800, suspicious: 900, phishing: 1500 },
      { time: 'Jul', total: 10500, legitimate: 7800, suspicious: 1050, phishing: 1650 },
      {
        time: 'Aug',
        total: TOTAL_SCANS,
        legitimate: CLASSIFICATION.legitimate,
        suspicious: CLASSIFICATION.suspicious,
        phishing: CLASSIFICATION.phishing,
      },
    ],
  },

  // Derived, so the donut can never drift from the KPI cards again. `color` is
  // only a fallback — Dashboard resolves each slice through a risk token.
  riskDistribution: [
    { name: 'Safe', value: CLASSIFICATION.legitimate, color: '#22c55e' },
    { name: 'Suspicious', value: CLASSIFICATION.suspicious, color: '#f59e0b' },
    { name: 'Phishing', value: CLASSIFICATION.phishing, color: '#ef4444' },
  ],

  /* Cumulative monthly totals, re-based so each month's three categories sum to
     that month's running total and the final month equals the canonical split.
     Rendered as a stacked area chart, so the top of the stack now reads 12,842 —
     matching the Total Scans card instead of overshooting it by 1,245. */
  detectionTrends: [
    { month: 'Mar', legitimate: 5400, suspicious: 700, phishing: 1105 }, // 7,205
    { month: 'Apr', legitimate: 6300, suspicious: 820, phishing: 1290 }, // 8,410
    { month: 'May', legitimate: 7100, suspicious: 930, phishing: 1470 }, // 9,500
    { month: 'Jun', legitimate: 7900, suspicious: 1040, phishing: 1655 }, // 10,595
    { month: 'Jul', legitimate: 8800, suspicious: 1150, phishing: 1820 }, // 11,770
    {
      month: 'Aug',
      legitimate: CLASSIFICATION.legitimate,
      suspicious: CLASSIFICATION.suspicious,
      phishing: CLASSIFICATION.phishing,
    }, // 12,842
  ],

  // Daily volumes; these already summed to 12,842 and still do.
  scanActivity: [
    { day: 'Mon', scans: 1840 },
    { day: 'Tue', scans: 1720 },
    { day: 'Wed', scans: 2010 },
    { day: 'Thu', scans: 2240 },
    { day: 'Fri', scans: 2100 },
    { day: 'Sat', scans: 1480 },
    { day: 'Sun', scans: 1452 },
  ],

  // Top 8 impersonated brands: 1,924 of the 1,973 confirmed phishing sites.
  topTargetedBrands: [
    { brand: 'Microsoft', count: 425 },
    { brand: 'PayPal', count: 382 },
    { brand: 'Facebook', count: 295 },
    { brand: 'Apple', count: 248 },
    { brand: 'Chase', count: 195 },
    { brand: 'Amazon', count: 164 },
    { brand: 'Netflix', count: 120 },
    { brand: 'LinkedIn', count: 95 },
  ],
};

/* ---- Model metrics ----
   These are the REAL figures from notebook/model_building.ipynb, not estimates.
   Every number below was read off that notebook's outputs.

   What was here before was invented and wrong in three ways: the metrics were
   plausible-looking but didn't match any training run; `training_samples` said
   11,055 when the actual training split is 69,767 (87,209 rows, stratified
   80/20); and the entire featureImportance list named features the model does
   not have ("URL Entropy", "Special Characters", "Subdomain Count") while
   omitting the ones that actually dominate it.

   Pipeline for reference: StandardScaler fitted on all 111 columns, then
   RandomForestClassifier(n_estimators=100, random_state=42). Target column is
   `phishing`, where 1 = phishing and 0 = legitimate — so P(phishing) is
   predict_proba(...)[:, 1]. */

const TRAINING_SAMPLES = 69767; // 87,209 rows, stratified 80/20 split
const TEST_SAMPLES = 17442;

/* Random Forest confusion matrix on the held-out test set, reconstructed from
   the notebook's precision/recall and class supports, then cross-checked:
   (TP + TN) / total = (5850 + 11070) / 17442 = 0.970072, which matches the
   reported accuracy exactly. */
const RF_CONFUSION = {
  truePositive: 5850,
  falsePositive: 273,
  trueNegative: 11070,
  falseNegative: 249,
};

export const mockModelMetrics = {
  models: [
    {
      name: 'Random Forest',
      selected: true,
      // Real hyperparameters instead of a made-up semver. The saved .pkl is the
      // untuned 100-tree fit; grid search preferred n_estimators=200 but
      // joblib.dump was called on the original `rf`.
      hyperparameters: 'n_estimators=100, random_state=42',
      accuracy: 0.9701,
      precision: 0.9554,
      recall: 0.9592,
      f1_score: 0.9573,
      roc_auc: 0.995,
      training_samples: TRAINING_SAMPLES,
      description:
        'Ensemble learning method using multiple decision trees for robust phishing classification.',
    },
    {
      name: 'Decision Tree',
      selected: false,
      hyperparameters: 'random_state=42, unpruned',
      accuracy: 0.9504,
      precision: 0.9327,
      recall: 0.9249,
      f1_score: 0.9288,
      roc_auc: 0.9445,
      training_samples: TRAINING_SAMPLES,
      description:
        'Tree-based classifier that splits data using feature thresholds for interpretable predictions.',
    },
    {
      name: 'Logistic Regression',
      selected: false,
      hyperparameters: 'max_iter=1000',
      accuracy: 0.9293,
      precision: 0.8902,
      recall: 0.9101,
      f1_score: 0.9,
      roc_auc: 0.9778,
      training_samples: TRAINING_SAMPLES,
      description: 'Linear model that estimates phishing probability using a logistic function.',
    },
  ],

  /* The Random Forest's actual top 10 by feature_importances_. Note how little
     it resembles the invented list: the single strongest signal is
     directory_length at 0.126 — nearly double the next feature — and three of
     the top ten are network lookups (ttl_hostname, asn_ip, time_response)
     rather than anything readable from the URL string. */
  featureImportance: [
    { feature: 'Directory path length', key: 'directory_length', importance: 0.1263, category: 'URL Structure' },
    { feature: 'Domain age at scan', key: 'time_domain_activation', importance: 0.0634, category: 'Domain' },
    { feature: '“$” count in path', key: 'qty_dollar_directory', importance: 0.0504, category: 'URL Structure' },
    { feature: '“.” count in filename', key: 'qty_dot_file', importance: 0.0438, category: 'URL Structure' },
    { feature: '“/” count in path', key: 'qty_slash_directory', importance: 0.0392, category: 'URL Structure' },
    { feature: 'Full URL length', key: 'length_url', importance: 0.0365, category: 'URL Structure' },
    { feature: 'DNS TTL', key: 'ttl_hostname', importance: 0.0266, category: 'Network' },
    { feature: '“%” count in path', key: 'qty_percent_directory', importance: 0.0255, category: 'URL Structure' },
    { feature: 'Host ASN', key: 'asn_ip', importance: 0.0241, category: 'Network' },
    { feature: 'HTTP response time', key: 'time_response', importance: 0.0239, category: 'Network' },
  ],

  // Same figures as `models`, expressed as percentages for the bar chart.
  comparisonData: [
    { metric: 'Accuracy', 'Logistic Regression': 92.93, 'Decision Tree': 95.04, 'Random Forest': 97.01 },
    { metric: 'Precision', 'Logistic Regression': 89.02, 'Decision Tree': 93.27, 'Random Forest': 95.54 },
    { metric: 'Recall', 'Logistic Regression': 91.01, 'Decision Tree': 92.49, 'Random Forest': 95.92 },
    { metric: 'F1 Score', 'Logistic Regression': 90.0, 'Decision Tree': 92.88, 'Random Forest': 95.73 },
    { metric: 'ROC-AUC', 'Logistic Regression': 97.78, 'Decision Tree': 94.45, 'Random Forest': 99.5 },
  ],

  testSamples: TEST_SAMPLES,
  confusion: RF_CONFUSION,

  /* Derived from RF_CONFUSION rather than asserted.
     FPR = 273 / (273 + 11070) = 2.41%   FNR = 249 / (249 + 5850) = 4.08%
     The previous values (3.8 / 2.5) were invented, and had the relationship
     backwards — this model actually misses more phishing sites than it
     false-alarms on legitimate ones. */
  falsePositiveRate: +(
    (RF_CONFUSION.falsePositive / (RF_CONFUSION.falsePositive + RF_CONFUSION.trueNegative)) * 100
  ).toFixed(2),
  falseNegativeRate: +(
    (RF_CONFUSION.falseNegative / (RF_CONFUSION.falseNegative + RF_CONFUSION.truePositive)) * 100
  ).toFixed(2),
};

/* ---- Dashboard KPI cards ----
   Derived from mockAnalytics rather than restated. The two objects used to
   disagree about the product's headline figures — 124,592 vs 12,842 total scans,
   98.4% vs 96.8% accuracy — so the hero and the dashboard reported different
   numbers for the same system on adjacent pages.

   mockAnalytics is the source of truth: its riskDistribution (9,624 + 1,245 +
   1,973), its detectionTrends August row, and detectionActivity['90D'] all
   reconcile to 12,842. mockDashboardStats reconciled to nothing.

   This also consumes totalScansChange / phishingChange / legitimateChange /
   accuracyChange, which were declared above and read by nothing. */

const asPercent = (change) => `${change > 0 ? '+' : ''}${change}%`;
const asTrend = (change) => (change > 0 ? 'up' : change < 0 ? 'down' : 'neutral');

// Sparklines stay hand-authored: they describe the *shape* of the trend, not
// absolute values, and the cards render them without an axis.
const kpi = (value, change, sparkline) => ({
  value,
  change: asPercent(change),
  trend: asTrend(change),
  sparkline,
});

export const mockDashboardStats = {
  totalScans: kpi(
    mockAnalytics.totalScans.toLocaleString(),
    mockAnalytics.totalScansChange,
    [40, 45, 42, 50, 55, 48, 60, 65, 70, 68, 75, 80]
  ),
  phishingDetected: kpi(
    mockAnalytics.phishingDetected.toLocaleString(),
    mockAnalytics.phishingChange,
    [30, 28, 35, 32, 25, 22, 20, 24, 18, 15, 12, 14]
  ),
  legitimateWebsites: kpi(
    mockAnalytics.legitimateWebsites.toLocaleString(),
    mockAnalytics.legitimateChange,
    [50, 52, 55, 58, 60, 65, 70, 75, 80, 85, 90, 95]
  ),
  modelAccuracy: kpi(
    `${mockAnalytics.modelAccuracy}%`,
    mockAnalytics.accuracyChange,
    // Re-based to climb toward 97.0, so the sparkline agrees with the value it
    // sits beside.
    [96.1, 96.2, 96.3, 96.4, 96.6, 96.5, 96.7, 96.8, 96.8, 96.9, 97.0, 97.0]
  ),
};
