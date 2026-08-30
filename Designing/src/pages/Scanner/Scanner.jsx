import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  ChevronDown,
  CheckCircle,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  Info,
  Globe,
} from 'lucide-react';
import { scanUrl } from '../../services/api';
import { isValidUrl, getImpactLevel, formatProbability } from '../../utils/helpers';
import { useToast } from '../../components/Toast/Toast';
import DemoBanner from '../../components/DemoBanner/DemoBanner';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { useIsMounted } from '../../hooks/useIsMounted';
import './Scanner.css';

const scanSteps = [
  'Analyzing URL',
  'Extracting Features',
  'Running ML Model',
  'Calculating Risk',
  'Generating Security Report',
];

/* Keyed by the model's REAL feature names, so a value entered here is used
   verbatim as an override instead of being mapped through a guess.

   Two fields were removed rather than relabelled: `special_chars` (the model
   carries ~85 separate per-character counts, not one aggregate) and
   `url_entropy` (no such feature exists in the model at all). They were being
   collected and silently discarded.

   `qty_dot_domain` is the honest stand-in for what the old panel called
   "subdomain count" — it counts dots in the hostname, which is correlated but
   not identical, and the label says so. */
const advancedFields = [
  {
    key: 'length_url',
    label: 'URL length',
    hint: 'Characters in the full URL',
    type: 'number',
    placeholder: 'e.g. 58',
  },
  {
    key: 'qty_redirects',
    label: 'Redirect count',
    hint: 'HTTP redirects before the final page',
    type: 'number',
    placeholder: 'e.g. 2',
  },
  {
    key: 'qty_dot_domain',
    label: 'Dots in domain',
    hint: 'Proxy for subdomain depth',
    type: 'number',
    placeholder: 'e.g. 2',
  },
  {
    key: 'time_domain_activation',
    label: 'Domain age',
    hint: 'Days since registration',
    type: 'number',
    placeholder: 'e.g. 365',
  },
  {
    key: 'url_shortened',
    label: 'Shortened URL',
    type: 'select',
    options: [
      { v: '', l: 'Auto-detect' },
      { v: '0', l: 'No' },
      { v: '1', l: 'Yes' },
    ],
  },
  {
    key: 'tls_ssl_certificate',
    label: 'Valid TLS certificate',
    type: 'select',
    options: [
      { v: '', l: 'Auto-detect' },
      { v: '1', l: 'Yes' },
      { v: '0', l: 'No' },
    ],
  },
];

const RESULT_ICONS = {
  Phishing: ShieldAlert,
  Suspicious: ShieldQuestion,
  Legitimate: ShieldCheck,
};

const RESULT_TITLES = {
  Phishing: 'Phishing website detected',
  Suspicious: 'Suspicious website detected',
  Legitimate: 'Website appears legitimate',
};

const RECOMMENDATIONS = {
  Phishing: 'Avoid entering personal or financial information on this website.',
  Suspicious:
    'Exercise caution. The website shows some suspicious patterns that warrant further investigation.',
  Legitimate: 'No major phishing indicators were detected by the model.',
};

const riskBand = (score) => (score <= 25 ? 'safe' : score <= 60 ? 'suspicious' : 'danger');

const Scanner = () => {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanStep, setScanStep] = useState(-1);
  const [result, setResult] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advancedValues, setAdvancedValues] = useState({});
  const toast = useToast();
  const tokens = useThemeTokens();
  const isMounted = useIsMounted();

  const handleAdvancedChange = (key, value) => {
    setAdvancedValues((prev) => ({ ...prev, [key]: value }));
  };

  const runScanSteps = useCallback(async () => {
    for (let i = 0; i < scanSteps.length; i++) {
      setScanStep(i);
      await new Promise((r) => setTimeout(r, 600 + Math.random() * 400));
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);

    if (!url.trim()) {
      setError('Enter a website URL to analyze.');
      return;
    }
    if (!isValidUrl(url.trim())) {
      setError('That does not look like a URL. Try a form like https://example.com');
      return;
    }

    setLoading(true);
    setScanStep(0);

    try {
      const [prediction] = await Promise.all([
        scanUrl(url.trim(), Object.keys(advancedValues).length > 0 ? advancedValues : null),
        runScanSteps(),
      ]);
      // A scan takes at least 3.5s, so navigating away mid-scan is easy. The
      // state writes below are harmless no-ops after unmount, but the toast is
      // not — it would surface on whatever page the user moved to.
      if (!isMounted()) return;
      setScanStep(scanSteps.length);
      setResult(prediction);
      toast.success(`Result: ${prediction.prediction}`, 'Analysis complete');
    } catch (err) {
      if (!isMounted()) return;
      const msg =
        err.response?.data?.message || err.message || 'The scan could not be completed.';
      setError(msg);
      toast.error(msg, 'Scan failed');
    } finally {
      if (isMounted()) {
        setLoading(false);
        setScanStep(-1);
      }
    }
  };

  const riskGaugeCircumference = 2 * Math.PI * 58;
  const resultClass = result ? result.prediction.toLowerCase() : '';
  const ResultIcon = result ? RESULT_ICONS[result.prediction] || ShieldCheck : null;

  // Resolved to a concrete colour. This used to come from a `getRiskColor`
  // helper that returned a `var(--token)` string, which was then handed to the
  // SVG `stroke` attribute — the same fragility that broke the sparklines. That
  // helper has been removed.
  const riskColorFor = (score) => tokens[`--risk-${riskBand(score)}`];

  return (
    <div className="scanner-page">
      <div className="container">
        <motion.div
          className="scanner-header"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="section-eyebrow">URL Scanner</p>
          <h1 className="section-title">Analyze a Website</h1>
          <p className="section-subtitle">
            Enter a website URL to evaluate its phishing risk using the trained Machine Learning
            model.
          </p>
        </motion.div>

        <DemoBanner />

        <motion.form
          className="scanner-card"
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="scanner-input-wrapper">
            <div className="scanner-input-container">
              <label className="sr-only" htmlFor="url-input">
                Website URL
              </label>
              <Globe className="scanner-input-icon" size={18} aria-hidden="true" />
              <input
                type="text"
                className={`scanner-input ${error ? 'error' : ''}`}
                placeholder="https://example.com"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setError('');
                }}
                disabled={loading}
                id="url-input"
                autoComplete="url"
                inputMode="url"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'url-error' : undefined}
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-lg scanner-submit-btn"
              disabled={loading}
              id="analyze-btn"
            >
              {loading ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  Analyzing…
                </>
              ) : (
                <>
                  <Search size={18} aria-hidden="true" />
                  Analyze website
                </>
              )}
            </button>
          </div>

          {/* role=alert so the validation message is announced, not just shown. */}
          {error && (
            <p className="scanner-error-text" id="url-error" role="alert">
              {error}
            </p>
          )}

          {/* Advanced Analysis Toggle */}
          <button
            type="button"
            className="advanced-toggle"
            onClick={() => setShowAdvanced(!showAdvanced)}
            aria-expanded={showAdvanced}
            aria-controls="advanced-fields"
            id="advanced-toggle"
          >
            <ChevronDown
              size={16}
              className={`advanced-toggle-icon ${showAdvanced ? 'open' : ''}`}
              aria-hidden="true"
            />
            Advanced analysis
          </button>

          <AnimatePresence>
            {showAdvanced && (
              <motion.div
                className="advanced-fields"
                id="advanced-fields"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="advanced-grid">
                  {advancedFields.map((field) => (
                    <div key={field.key}>
                      {/* htmlFor + id: these labels were not associated with
                          their controls, so clicking one did nothing and screen
                          readers announced eight unlabelled fields. */}
                      <label className="advanced-field-label" htmlFor={`field-${field.key}`}>
                        {field.label}
                      </label>
                      {field.type === 'select' ? (
                        <select
                          id={`field-${field.key}`}
                          className="advanced-field-input advanced-field-select"
                          value={advancedValues[field.key] || ''}
                          onChange={(e) => handleAdvancedChange(field.key, e.target.value)}
                          disabled={loading}
                        >
                          {field.options.map((opt) => (
                            <option key={opt.v} value={opt.v}>
                              {opt.l}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          id={`field-${field.key}`}
                          type="number"
                          className="advanced-field-input"
                          placeholder={field.placeholder}
                          step={field.step || '1'}
                          value={advancedValues[field.key] || ''}
                          onChange={(e) => handleAdvancedChange(field.key, e.target.value)}
                          disabled={loading}
                        />
                      )}
                      {/* Names the model feature this maps to, so it's clear the
                          input is a real override rather than decoration. */}
                      {field.hint && <p className="advanced-field-hint">{field.hint}</p>}
                    </div>
                  ))}
                </div>
                <p className="advanced-fields-note">
                  Leave blank to extract automatically. Values entered here override the
                  extractor for that feature only.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Scan Progress */}
          <AnimatePresence>
            {loading && (
              <motion.div
                className="scan-progress"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                aria-live="polite"
              >
                <p className="scan-progress-title">Scanning in progress…</p>
                <ol className="scan-steps">
                  {scanSteps.map((step, index) => {
                    const isActive = index === scanStep;
                    const isCompleted = index < scanStep;
                    return (
                      <li className="scan-step" key={step}>
                        <span
                          className={`scan-step-indicator ${isActive ? 'active' : ''} ${
                            isCompleted ? 'completed' : ''
                          }`}
                          aria-hidden="true"
                        >
                          {isCompleted ? (
                            <CheckCircle size={14} />
                          ) : isActive ? (
                            <span className="scan-step-spinner" />
                          ) : (
                            <span className="scan-step-number">{index + 1}</span>
                          )}
                        </span>
                        <span
                          className={`scan-step-label ${isActive ? 'active' : ''} ${
                            isCompleted ? 'completed' : ''
                          }`}
                        >
                          {step}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.form>

        {/* Result */}
        <AnimatePresence>
          {result && (
            <motion.div
              className="result-section"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className={`result-card ${resultClass}`}>
                <div className="result-header">
                  <span className={`result-icon ${resultClass}`} aria-hidden="true">
                    <ResultIcon size={28} />
                  </span>
                  <div>
                    <h2 className="result-title">
                      {RESULT_TITLES[result.prediction] || 'Analysis complete'}
                    </h2>
                    <p className="result-url">{result.url}</p>
                  </div>
                </div>

                <div className="result-metrics">
                  {/* Risk Gauge */}
                  <div className="result-metric">
                    <div className="risk-gauge">
                      <div className="risk-gauge-circle">
                        <svg
                          className="risk-gauge-svg"
                          width="140"
                          height="140"
                          viewBox="0 0 140 140"
                          aria-hidden="true"
                        >
                          <circle className="risk-gauge-bg" cx="70" cy="70" r="58" />
                          <circle
                            className="risk-gauge-fill"
                            cx="70"
                            cy="70"
                            r="58"
                            stroke={riskColorFor(result.risk_score)}
                            strokeDasharray={riskGaugeCircumference}
                            strokeDashoffset={
                              riskGaugeCircumference -
                              (result.risk_score / 100) * riskGaugeCircumference
                            }
                          />
                        </svg>
                        <div className="risk-gauge-text">
                          <span
                            className={`risk-gauge-value text-${riskBand(result.risk_score)}`}
                          >
                            {result.risk_score}
                          </span>
                          <span className="risk-gauge-label">Risk Score</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Confidence */}
                  <div className="result-metric">
                    {/* Was `.confidence-card` with three inline overrides
                        cancelling its own border, background and padding. */}
                    <div className="confidence-block">
                      <p className="confidence-title">Model confidence</p>
                      <p className="confidence-value">{formatProbability(result.probability)}</p>
                      <div className="confidence-bar-bg">
                        <div
                          className="confidence-bar-fill"
                          style={{ width: `${result.probability * 100}%` }}
                        />
                      </div>
                      <p className="confidence-model">
                        Model: <span>{result.model}</span>
                      </p>
                    </div>
                  </div>

                  {/* Risk Level */}
                  <div className="result-metric">
                    <p className="result-metric-label">Risk level</p>
                    <p className={`result-metric-value text-${riskBand(result.risk_score)}`}>
                      {result.risk_score <= 25
                        ? 'Low'
                        : result.risk_score <= 60
                          ? 'Medium'
                          : 'High'}
                    </p>
                    <p className="result-metric-badge">
                      <span className={`badge badge-${riskBand(result.risk_score)}`}>
                        {result.risk_score <= 25
                          ? 'Safe'
                          : result.risk_score <= 60
                            ? 'Caution'
                            : 'Danger'}
                      </span>
                    </p>
                  </div>
                </div>

                <p className={`result-recommendation ${resultClass}`}>
                  <Info size={16} className="result-recommendation-icon" aria-hidden="true" />
                  {RECOMMENDATIONS[result.prediction]}
                </p>
              </div>

              {/* Feature Impact */}
              {result.features && (
                <motion.div
                  className="feature-impact-section"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <h2 className="feature-impact-title">
                    Why was this website classified this way?
                  </h2>
                  <p className="feature-impact-subtitle">
                    Feature analysis showing the factors that influenced the model&rsquo;s
                    prediction
                  </p>
                  <div className="feature-impact-grid">
                    {Object.entries(result.features).map(([key, feat]) => {
                      const impact = getImpactLevel(feat.impact);
                      return (
                        <motion.div
                          key={key}
                          className="feature-impact-card"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <div className="feature-impact-header">
                            <span className="feature-impact-name">
                              {/* Prefer the backend's own label. Falling back to
                                  de-snake-casing the key would render real
                                  feature names as "Qty Dollar Directory". */}
                              {feat.label ||
                                key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                            </span>
                            {/* Class-based. The old inline style built
                                `${riskColors[feat.risk]}15`, i.e. the literal
                                string "var(--risk-danger)15" — not valid CSS, so
                                these badges rendered with no background at all. */}
                            <span className={`feature-impact-badge ${feat.risk}`}>
                              {impact.label}
                            </span>
                          </div>
                          <p className="feature-impact-value">
                            Value: <strong>{feat.value}</strong>
                          </p>
                          <div className="feature-impact-bar-bg">
                            <div
                              className={`feature-impact-bar-fill ${feat.risk}`}
                              style={{ width: `${feat.impact * 100}%` }}
                            />
                          </div>
                          <p className="feature-impact-desc">{feat.description}</p>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Scanner;
