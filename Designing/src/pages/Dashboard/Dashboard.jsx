import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import {
  Search,
  ShieldAlert,
  ShieldCheck,
  Target,
  Upload,
  FileText,
  Settings as SettingsIcon,
  ChevronRight,
} from 'lucide-react';
import StatCard from '../../components/StatCard/StatCard';
import ChartCard, { CustomTooltip } from '../../components/ChartCard/ChartCard';
import RecentScans from '../../components/RecentScans/RecentScans';
import { getAnalytics, getScanHistory, IS_MOCK } from '../../services/api';
import { mockDashboardStats } from '../../data/mockData';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import './Dashboard.css';

/* Builds the KPI cards from the live /analytics aggregates.

   Without this the four cards kept rendering mockDashboardStats — complete with
   a setInterval that randomly incremented them — while the charts beside them
   showed real data. Fabricated numbers next to real ones is worse than either
   alone, because nothing marks which is which. */
const liveKpi = (value, change) => ({
  value: typeof value === 'number' ? value.toLocaleString() : '—',
  change: `${change > 0 ? '+' : ''}${change ?? 0}%`,
  trend: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
  // No per-KPI time series exists yet, and StatCard skips the sparkline when
  // this is absent rather than drawing a flat line that implies data.
  sparkline: undefined,
});

const statsFromAnalytics = (analytics) => ({
  totalScans: liveKpi(analytics?.totalScans, analytics?.totalScansChange),
  phishingDetected: liveKpi(analytics?.phishingDetected, analytics?.phishingChange),
  legitimateWebsites: liveKpi(analytics?.legitimateWebsites, analytics?.legitimateChange),
  modelAccuracy: {
    value: analytics?.modelAccuracy != null ? `${analytics.modelAccuracy}%` : '—',
    change: `${analytics?.accuracyChange ?? 0}%`,
    trend: 'neutral',
    sparkline: undefined,
  },
});

// Each stat card's "change" is measured against the selected range, so the
// footer label has to follow the filter. It used to read "vs last 30 days"
// unconditionally, which was simply wrong for three of the four options.
const PERIOD_LABELS = {
  '24H': 'vs previous 24 hours',
  '7D': 'vs previous 7 days',
  '30D': 'vs previous 30 days',
  '90D': 'vs previous 90 days',
};

// mockData ships a literal hex per slice. Mapping by name lets the donut follow
// the theme instead of staying locked to the light-mode palette.
const RISK_TOKENS = {
  Safe: '--risk-safe',
  Suspicious: '--risk-suspicious',
  Phishing: '--risk-danger',
};

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [recentScans, setRecentScans] = useState([]);
  const [timeFilter, setTimeFilter] = useState('30D');

  // State for live simulation
  const [liveStats, setLiveStats] = useState(mockDashboardStats);

  // Resolved token values, recomputed on theme change. Recharts needs concrete
  // colours — it cannot consume `var(--token)` in the places it reads colour
  // back out for animation and cursor rendering.
  const tokens = useThemeTokens();

  useEffect(() => {
    // `ignore` guards against out-of-order responses. Clicking 24H → 7D → 30D
    // quickly fires three overlapping requests with no ordering guarantee, so
    // without this the last one to *resolve* wins — which need not be the one
    // matching the highlighted filter.
    let ignore = false;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [analyticsData, historyData] = await Promise.all([
          getAnalytics(timeFilter),
          getScanHistory(),
        ]);
        if (ignore) return;
        setAnalytics(analyticsData);
        setRecentScans(historyData);
      } catch (error) {
        console.error('Failed to fetch dashboard data', error);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchData();

    return () => {
      ignore = true;
    };
  }, [timeFilter]);

  // Live Data Simulation — mock mode only. Running this against real aggregates
  // would inflate genuine scan counts with random increments.
  useEffect(() => {
    if (!IS_MOCK) return undefined;

    const interval = setInterval(() => {
      setLiveStats(prev => {
        // Parse current string values, increment slightly, then format back
        const parseNum = (str) => parseInt(str.replace(/,/g, ''), 10);
        const formatNum = (num) => num.toLocaleString();

        const currentTotal = parseNum(prev.totalScans.value);
        const currentLegit = parseNum(prev.legitimateWebsites.value);
        const currentPhishing = parseNum(prev.phishingDetected.value);

        // Randomly add 0 or 1 to scans to simulate traffic
        const addLegit = Math.random() > 0.5 ? 1 : 0;
        const addPhishing = Math.random() > 0.8 ? 1 : 0;

        return {
          ...prev,
          totalScans: { ...prev.totalScans, value: formatNum(currentTotal + addLegit + addPhishing) },
          legitimateWebsites: { ...prev.legitimateWebsites, value: formatNum(currentLegit + addLegit) },
          phishingDetected: { ...prev.phishingDetected, value: formatNum(currentPhishing + addPhishing) }
        };
      });
    }, 3000); // Update every 3 seconds

    return () => clearInterval(interval);
  }, []);

  if (loading && !analytics) {
    return (
      <div className="dashboard-loading">
        <div className="spinner spinner-dark" />
        <p>Loading dashboard data…</p>
      </div>
    );
  }

  // Every value resolves through a design token, so the charts re-colour with
  // the theme. `grid` and `text` previously passed `var(...)` strings straight
  // into SVG stroke/fill attributes, and the series were literal hexes.
  const colors = {
    phishing: tokens['--risk-danger'],
    suspicious: tokens['--risk-suspicious'],
    legitimate: tokens['--risk-safe'],
    grid: tokens['--viz-grid'],
    text: tokens['--text-tertiary'],
  };

  // Slice colours resolved the same way, falling back to whatever the API sent.
  const riskDistribution = (analytics?.riskDistribution || []).map((slice) => ({
    ...slice,
    color: tokens[RISK_TOKENS[slice.name]] || slice.color,
  }));

  const periodLabel = PERIOD_LABELS[timeFilter];

  // Simulated ticker in mock mode; real aggregates otherwise.
  const stats = IS_MOCK ? liveStats : statsFromAnalytics(analytics);

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header dashboard-page-header--split">
        <div>
          <h1 className="dashboard-page-title">Overview</h1>
          <p className="dashboard-page-subtitle">Monitor website analysis activity and Machine Learning detection performance.</p>
        </div>
        
        {/* System Health Indicator */}
        <div className="system-health-badge">
          <div className="system-health-indicator pulse"></div>
          <div className="system-health-info">
            <span className="system-health-status">Systems Operational</span>
            <span className="system-health-latency">ML Latency: 45ms</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid-4 dashboard-kpi-row">
        <StatCard
          title="Total Scans"
          value={liveStats.totalScans.value}
          change={liveStats.totalScans.change}
          trend={liveStats.totalScans.trend}
          sparkline={liveStats.totalScans.sparkline}
          icon={Search}
          colorClass="blue"
          period={periodLabel}
          delay={0}
        />
        <StatCard
          title="Phishing Detected"
          value={liveStats.phishingDetected.value}
          change={liveStats.phishingDetected.change}
          trend={liveStats.phishingDetected.trend}
          sparkline={liveStats.phishingDetected.sparkline}
          icon={ShieldAlert}
          colorClass="red"
          period={periodLabel}
          /* Fewer phishing sites detected is good news. Without this, the -2.4%
             fall rendered in danger-red as though it were a problem. */
          invertTrend
          delay={0.1}
        />
        <StatCard
          title="Legitimate Websites"
          value={liveStats.legitimateWebsites.value}
          change={liveStats.legitimateWebsites.change}
          trend={liveStats.legitimateWebsites.trend}
          sparkline={liveStats.legitimateWebsites.sparkline}
          icon={ShieldCheck}
          colorClass="green"
          period={periodLabel}
          delay={0.2}
        />
        <StatCard
          title="Model Accuracy"
          value={liveStats.modelAccuracy.value}
          change={liveStats.modelAccuracy.change}
          trend={liveStats.modelAccuracy.trend}
          sparkline={liveStats.modelAccuracy.sparkline}
          icon={Target}
          colorClass="purple"
          period={periodLabel}
          delay={0.3}
        />
      </div>

      {/* Charts Row */}
      <div className="dashboard-charts-row grid-3">
        {/* Main Area Chart (spans 2 columns) */}
        <ChartCard
          title="Detection Activity"
          subtitle="Scan volume and classification results over time"
          filters={['24H', '7D', '30D', '90D']}
          activeFilter={timeFilter}
          onFilterChange={setTimeFilter}
          delay={0.4}
          className="span-2"
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              /* `?.` on both hops. With the optional chain only on `analytics`,
                 a truthy response missing `detectionActivity` — the exact shape
                 you get when USE_MOCK flips to false and the real endpoint
                 differs — threw during render. */
              data={analytics?.detectionActivity?.[timeFilter] || []}
              /* left: -20 pushed the Y axis outside the plot area and clipped
                 its tick labels. */
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorPhishing" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors.phishing} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={colors.phishing} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorSuspiciousActivity" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors.suspicious} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={colors.suspicious} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorLegitimate" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors.legitimate} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={colors.legitimate} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.grid} />
              <XAxis
                dataKey="time"
                axisLine={false}
                tickLine={false}
                tick={{ fill: colors.text, fontSize: 12 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: colors.text, fontSize: 12 }}
                width={48}
              />
              <RechartsTooltip
                content={<CustomTooltip />}
                cursor={{ stroke: colors.grid, strokeWidth: 1, strokeDasharray: '3 3' }}
              />
              <Area
                type="monotone"
                dataKey="legitimate"
                name="Legitimate"
                stroke={colors.legitimate}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorLegitimate)"
              />
              {/* Third series. The data now carries a `suspicious` column, and
                  omitting it here would leave 1,245 scans off a chart whose
                  subtitle promises "classification results". */}
              <Area
                type="monotone"
                dataKey="suspicious"
                name="Suspicious"
                stroke={colors.suspicious}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorSuspiciousActivity)"
              />
              <Area
                type="monotone"
                dataKey="phishing"
                name="Phishing"
                stroke={colors.phishing}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorPhishing)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Donut Chart (spans 1 column) */}
        <ChartCard
          title="Risk Distribution"
          subtitle="Overall classification breakdown"
          delay={0.5}
        >
          {/* The chart and the legend used to be siblings in .chart-container
              with the chart claiming height:100%, which pushed the legend out
              of the box and fed a re-measure loop. The chart now takes the
              remaining space and the legend keeps its intrinsic height. */}
          <div className="donut-chart-area">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {riskDistribution.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="donut-legend">
            {riskDistribution.map((item) => (
              <div key={item.name} className="donut-legend-item">
                <span
                  className="donut-legend-color"
                  style={{ backgroundColor: item.color }}
                  aria-hidden="true"
                />
                <span className="donut-legend-label">{item.name}</span>
                <span className="donut-legend-value">{item.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Bottom Row: Recent Scans + Quick Actions */}
      <div className="dashboard-bottom-row grid-3">
        <div className="span-2">
          <RecentScans scans={recentScans} limit={5} delay={0.6} />
        </div>
        
        {/* Quick Actions Panel */}
        <div className="quick-actions-panel">
          <h3 className="quick-actions-title">Quick Actions</h3>
          <p className="quick-actions-subtitle">Frequently used tools and settings</p>

          <div className="quick-actions-list">
            <Link to="/scanner" className="quick-action-btn primary">
              <span className="quick-action-icon" aria-hidden="true">
                <Search size={20} />
              </span>
              <span className="quick-action-content">
                <span className="quick-action-label">Scan single URL</span>
                <span className="quick-action-desc">Analyze a website instantly</span>
              </span>
              <ChevronRight size={18} className="quick-action-arrow" aria-hidden="true" />
            </Link>

            {/* Icon colours moved from inline styles to modifier classes, so
                they resolve through tokens and respond to the theme. */}
            <Link to="/bulk-scanner" className="quick-action-btn">
              <span className="quick-action-icon blue" aria-hidden="true">
                <Upload size={20} />
              </span>
              <span className="quick-action-content">
                <span className="quick-action-label">Bulk CSV scan</span>
                <span className="quick-action-desc">Upload multiple URLs</span>
              </span>
              <ChevronRight size={18} className="quick-action-arrow" aria-hidden="true" />
            </Link>

            <Link to="/analytics" className="quick-action-btn">
              <span className="quick-action-icon green" aria-hidden="true">
                <FileText size={20} />
              </span>
              <span className="quick-action-content">
                <span className="quick-action-label">Generate report</span>
                <span className="quick-action-desc">Export PDF analytics</span>
              </span>
              <ChevronRight size={18} className="quick-action-arrow" aria-hidden="true" />
            </Link>

            <Link to="/settings" className="quick-action-btn">
              <span className="quick-action-icon neutral" aria-hidden="true">
                <SettingsIcon size={20} />
              </span>
              <span className="quick-action-content">
                <span className="quick-action-label">System settings</span>
                <span className="quick-action-desc">Configure ML parameters</span>
              </span>
              <ChevronRight size={18} className="quick-action-arrow" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
