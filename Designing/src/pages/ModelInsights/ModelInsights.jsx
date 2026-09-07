import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
  Legend,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { CheckCircle2, Circle } from 'lucide-react';
import ChartCard, { CustomTooltip } from '../../components/ChartCard/ChartCard';
import { getModelMetrics } from '../../services/api';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import './ModelInsights.css';

// Ordered weakest to strongest, so the bar groups read as a progression and the
// selected model gets the strongest colour.
const MODEL_TOKENS = {
  'Logistic Regression': '--viz-slate',
  'Decision Tree': '--viz-blue',
  'Random Forest': '--viz-indigo',
};

const ModelInsights = () => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);
  const tokens = useThemeTokens();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await getModelMetrics();
        setMetrics(data);
      } catch (error) {
        console.error('Failed to fetch model metrics', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading && !metrics) {
    return (
      <div className="dashboard-loading">
        <div className="spinner spinner-dark" />
        <p>Loading model metrics…</p>
      </div>
    );
  }

  // All resolved to concrete values. The three model colours were literal hexes
  // — and #4f46e5, the *selected* model and therefore the most important series,
  // reads poorly against the dark card background.
  const colors = {
    'Logistic Regression': tokens[MODEL_TOKENS['Logistic Regression']],
    'Decision Tree': tokens[MODEL_TOKENS['Decision Tree']],
    'Random Forest': tokens[MODEL_TOKENS['Random Forest']],
    grid: tokens['--viz-grid'],
    text: tokens['--text-tertiary'],
    bar: tokens['--viz-indigo'],
    cursor: tokens['--bg-hover'],
  };

  const featureImportance = metrics?.featureImportance || [];
  // Guarded against an empty array, which would make the ratio Infinity.
  const maxImportance = featureImportance.length
    ? Math.max(...featureImportance.map((f) => f.importance))
    : 1;

  return (
    <div className="model-insights-page">
      <div className="dashboard-page-header">
        <h1 className="dashboard-page-title">Model Insights</h1>
        <p className="dashboard-page-subtitle">
          Deep dive into Machine Learning metrics, model comparisons, and feature importance.
        </p>
      </div>

      {/* Model Cards */}
      <div className="model-cards-grid">
        {(metrics?.models || []).map((model, index) => (
          <motion.div
            key={model.name}
            className={`model-card ${model.selected ? 'selected' : ''}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <div className="model-card-header">
              <div>
                <h2 className="model-card-title">{model.name}</h2>
                {/* Real hyperparameters, not a fabricated semver. */}
                <code className="model-card-params">{model.hyperparameters}</code>
              </div>
              {model.selected ? (
                <span className="model-badge selected">
                  <CheckCircle2 size={12} aria-hidden="true" /> Selected
                </span>
              ) : (
                <span className="model-badge">
                  <Circle size={12} aria-hidden="true" /> Evaluated
                </span>
              )}
            </div>

            <p className="model-card-desc">{model.description}</p>

            {/* ROC-AUC and training sample count were present in the data but
                never rendered anywhere. They're the two figures an evaluator
                actually asks for after accuracy, so they belong here. */}
            <dl className="model-metrics-grid">
              <div className="model-metric-item">
                <dt className="model-metric-label">Accuracy</dt>
                <dd className="model-metric-value">{(model.accuracy * 100).toFixed(1)}%</dd>
              </div>
              <div className="model-metric-item">
                <dt className="model-metric-label">Precision</dt>
                <dd className="model-metric-value">{(model.precision * 100).toFixed(1)}%</dd>
              </div>
              <div className="model-metric-item">
                <dt className="model-metric-label">Recall</dt>
                <dd className="model-metric-value">{(model.recall * 100).toFixed(1)}%</dd>
              </div>
              <div className="model-metric-item">
                <dt className="model-metric-label">F1 Score</dt>
                <dd className="model-metric-value">{(model.f1_score * 100).toFixed(1)}%</dd>
              </div>
              <div className="model-metric-item">
                <dt className="model-metric-label">ROC-AUC</dt>
                <dd className="model-metric-value">{(model.roc_auc * 100).toFixed(1)}%</dd>
              </div>
              <div className="model-metric-item">
                <dt className="model-metric-label">Training rows</dt>
                <dd className="model-metric-value">
                  {model.training_samples.toLocaleString()}
                </dd>
              </div>
            </dl>
          </motion.div>
        ))}
      </div>

      {/* Error rates for the selected model. These were present in the data but
          rendered nowhere — and on a detection product they're the numbers that
          actually matter: a false negative is a phishing site waved through. */}
      {metrics?.confusion && (
        <section className="error-rates-panel">
          <div className="error-rates-header">
            <h2 className="error-rates-title">Random Forest error profile</h2>
            <p className="error-rates-subtitle">
              Held-out test set of {metrics.testSamples.toLocaleString()} sites
            </p>
          </div>
          <dl className="error-rates-grid">
            <div className="error-rate-item">
              <dt className="error-rate-label">False negative rate</dt>
              <dd className="error-rate-value text-danger">{metrics.falseNegativeRate}%</dd>
              <dd className="error-rate-note">
                {metrics.confusion.falseNegative.toLocaleString()} phishing sites passed as safe
              </dd>
            </div>
            <div className="error-rate-item">
              <dt className="error-rate-label">False positive rate</dt>
              <dd className="error-rate-value text-suspicious">{metrics.falsePositiveRate}%</dd>
              <dd className="error-rate-note">
                {metrics.confusion.falsePositive.toLocaleString()} safe sites flagged as phishing
              </dd>
            </div>
            <div className="error-rate-item">
              <dt className="error-rate-label">Caught</dt>
              <dd className="error-rate-value text-safe">
                {metrics.confusion.truePositive.toLocaleString()}
              </dd>
              <dd className="error-rate-note">phishing sites correctly identified</dd>
            </div>
            <div className="error-rate-item">
              <dt className="error-rate-label">Cleared</dt>
              <dd className="error-rate-value">
                {metrics.confusion.trueNegative.toLocaleString()}
              </dd>
              <dd className="error-rate-note">legitimate sites correctly cleared</dd>
            </div>
          </dl>
        </section>
      )}

      {/* Charts Grid */}
      <div className="insights-charts-grid">
        {/* Model Comparison (Bar Chart) */}
        <ChartCard
          title="Performance Comparison"
          subtitle="Evaluation metrics across tested models"
          delay={0.3}
        >
          {/* height="100%" rather than a fixed 350, which overflowed
              .chart-container's 300px box. The taller height for this grid is
              set in ModelInsights.css. */}
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={metrics?.comparisonData || []}
              /* left: -20 shifted the axis outside the plot area and clipped the
                 80/85/90 labels that `domain={[80, 100]}` produces. */
              margin={{ top: 20, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.grid} />
              <XAxis
                dataKey="metric"
                axisLine={false}
                tickLine={false}
                tick={{ fill: colors.text, fontSize: 12 }}
                dy={10}
              />
              <YAxis
                domain={[80, 100]}
                axisLine={false}
                tickLine={false}
                tick={{ fill: colors.text, fontSize: 12 }}
                width={40}
              />
              <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: colors.cursor }} />
              <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
              <Bar
                dataKey="Logistic Regression"
                fill={colors['Logistic Regression']}
                radius={[2, 2, 0, 0]}
              />
              <Bar dataKey="Decision Tree" fill={colors['Decision Tree']} radius={[2, 2, 0, 0]} />
              <Bar dataKey="Random Forest" fill={colors['Random Forest']} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Feature Importance (Horizontal Bar Chart) */}
        <ChartCard
          title="Top Website Risk Features"
          subtitle="Relative importance in the Random Forest model"
          delay={0.4}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={featureImportance}
              layout="vertical"
              margin={{ top: 10, right: 30, left: 10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={colors.grid} />
              <XAxis
                type="number"
                axisLine={false}
                tickLine={false}
                tick={{ fill: colors.text, fontSize: 12 }}
              />
              <YAxis
                type="category"
                dataKey="feature"
                axisLine={false}
                tickLine={false}
                tick={{ fill: colors.text, fontSize: 11 }}
                width={110}
              />
              <RechartsTooltip
                cursor={{ fill: colors.cursor }}
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const point = payload[0];
                  return (
                    <div className="custom-tooltip">
                      <p className="custom-tooltip-label">{point.payload.feature}</p>
                      <div className="custom-tooltip-item">
                        <span className="custom-tooltip-name">Importance</span>
                        <span className="custom-tooltip-value">
                          {(point.value * 100).toFixed(1)}%
                        </span>
                      </div>
                      {/* Was an inline-styled div; now a class. */}
                      <p className="custom-tooltip-meta">Category: {point.payload.category}</p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="importance" fill={colors.bar} radius={[0, 4, 4, 0]}>
                {featureImportance.map((entry) => (
                  <Cell
                    key={entry.key ?? entry.feature}
                    /* Scaled against the actual maximum in the data rather than
                       a hardcoded constant, so the ramp stays correct if the
                       importances change. Floored so the last bar stays legible. */
                    fillOpacity={Math.max(0.45, entry.importance / maxImportance)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
};

export default ModelInsights;
