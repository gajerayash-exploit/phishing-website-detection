import { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Cell,
} from 'recharts';
import { Download, Loader2 } from 'lucide-react';
import ChartCard, { CustomTooltip } from '../../components/ChartCard/ChartCard';
import { getAnalytics } from '../../services/api';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { exportToPDF } from '../../utils/pdfExport';
import './Analytics.css';

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const tokens = useThemeTokens();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await getAnalytics('30D');
        setAnalytics(data);
      } catch (error) {
        console.error('Failed to fetch analytics', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading && !analytics) {
    return (
      <div className="dashboard-loading">
        <div className="spinner spinner-dark" />
        <p>Loading analytics data…</p>
      </div>
    );
  }

  // Resolved token values. Series colours were literal hexes, and `grid`/`text`
  // /`cursor` were `var()` strings handed to SVG attributes.
  const colors = {
    phishing: tokens['--risk-danger'],
    legitimate: tokens['--risk-safe'],
    suspicious: tokens['--risk-suspicious'],
    total: tokens['--viz-indigo'],
    grid: tokens['--viz-grid'],
    text: tokens['--text-tertiary'],
    cursor: tokens['--bg-hover'],
  };

  const handleExport = () => {
    exportToPDF(
      'analytics-report-content',
      `PhishGuard_Analytics_${new Date().toISOString().slice(0, 10)}.pdf`,
      setExporting,
    );
  };

  return (
    <div className="analytics-page" id="analytics-report-content">
      {/* Hidden header — visible only during PDF capture */}
      <div className="pdf-report-header">
        <div className="pdf-report-header-inner">
          <div className="pdf-logo">
            <div className="pdf-logo-icon" aria-hidden="true">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <h2 className="pdf-logo-title">PhishGuard AI</h2>
              <p className="pdf-logo-tagline">Machine Learning Phishing Detection</p>
            </div>
          </div>
          <div className="pdf-meta">
            <span className="pdf-meta-badge">Analytics Report</span>
            <p className="pdf-meta-date">Generated: {new Date().toLocaleString()}</p>
          </div>
        </div>
        <div className="pdf-report-divider" />
      </div>

      <div className="dashboard-page-header analytics-page-header">
        <div>
          <h1 className="dashboard-page-title">Analytics</h1>
          <p className="dashboard-page-subtitle">
            Detection trends, risk distribution, and overall system performance.
          </p>
        </div>
        <button
          className="pdf-export-btn no-print"
          onClick={handleExport}
          disabled={exporting}
        >
          {exporting ? (
            <Loader2 size={18} className="pdf-export-spinner" />
          ) : (
            <Download size={18} />
          )}
          <span>{exporting ? 'Generating…' : 'Export PDF'}</span>
        </button>
      </div>

      <div className="analytics-grid">
        {/* Detection Trends (Area Chart) */}
        <ChartCard
          title="Detection Trends"
          subtitle="Monthly breakdown of identified threats"
          className="analytics-full-width"
          delay={0.1}
        >
          {/* height="100%" throughout: a fixed pixel height overflowed
              .chart-container's box. Per-chart heights live in Analytics.css. */}
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={analytics?.detectionTrends || []}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorPhishing2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors.phishing} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={colors.phishing} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorSuspicious" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors.suspicious} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={colors.suspicious} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorLegitimate2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors.legitimate} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={colors.legitimate} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.grid} />
              <XAxis
                dataKey="month"
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
                stackId="1"
                stroke={colors.legitimate}
                fill="url(#colorLegitimate2)"
              />
              <Area
                type="monotone"
                dataKey="suspicious"
                name="Suspicious"
                stackId="1"
                stroke={colors.suspicious}
                fill="url(#colorSuspicious)"
              />
              <Area
                type="monotone"
                dataKey="phishing"
                name="Phishing"
                stackId="1"
                stroke={colors.phishing}
                fill="url(#colorPhishing2)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Scan Activity (Bar Chart) */}
        <ChartCard
          title="Weekly Scan Activity"
          subtitle="Volume of URLs processed per day"
          delay={0.2}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={analytics?.scanActivity || []}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              barSize={32}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.grid} />
              <XAxis
                dataKey="day"
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
              <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: colors.cursor }} />
              {/* One flat colour, so the per-Cell loop that set an identical
                  fill on every bar is gone. */}
              <Bar
                dataKey="scans"
                name="Total Scans"
                fill={colors.total}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Top Targeted Brands (Horizontal Bar Chart) */}
        <ChartCard
          title="Top Targeted Brands"
          subtitle="Most frequently impersonated companies"
          delay={0.3}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={analytics?.topTargetedBrands || []}
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
                dataKey="brand"
                axisLine={false}
                tickLine={false}
                tick={{ fill: colors.text, fontSize: 11 }}
                width={80}
              />
              <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: colors.cursor }} />
              <Bar
                dataKey="count"
                name="Targeted Count"
                fill={colors.phishing}
                radius={[0, 4, 4, 0]}
              >
                {(analytics?.topTargetedBrands || []).map((entry, index) => (
                  // Floored so the eighth brand doesn't fade to near-invisible.
                  <Cell key={entry.brand} fillOpacity={Math.max(0.45, 1 - index * 0.08)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* PDF footer watermark — only visible during capture */}
      <div className="pdf-report-footer">
        <p>PhishGuard AI · Confidential · Generated automatically · {new Date().toLocaleString()}</p>
      </div>
    </div>
  );
};

export default Analytics;
