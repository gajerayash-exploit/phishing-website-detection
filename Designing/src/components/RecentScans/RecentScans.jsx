import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldAlert, ShieldCheck, ShieldQuestion, ChevronRight } from 'lucide-react';
import {
  truncateUrl,
  formatRelativeTime,
  formatProbability,
  getRiskLevel,
} from '../../utils/helpers';
import './RecentScans.css';

// The `.text-*` classes now exist in index.css, so the duplicated inline
// `style={{ color: 'var(--risk-danger)' }}` that was propping them up is gone.
const getPredictionIcon = (prediction) => {
  if (prediction === 'Phishing') {
    return <ShieldAlert size={14} className="text-danger" aria-hidden="true" />;
  }
  if (prediction === 'Suspicious') {
    return <ShieldQuestion size={14} className="text-suspicious" aria-hidden="true" />;
  }
  return <ShieldCheck size={14} className="text-safe" aria-hidden="true" />;
};

// `scans = []` rather than a bare `scans`. It was the one prop without a
// default while still being called with `.slice()` on the first render line, so
// any consumer that omitted it crashed immediately.
const RecentScans = ({ scans = [], limit = 5, delay = 0 }) => {
  const navigate = useNavigate();
  const displayScans = scans.slice(0, limit);
  const isEmpty = displayScans.length === 0;

  return (
    <motion.div
      className="recent-scans-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <div className="recent-scans-header">
        <h3 className="recent-scans-title">Recent Scans</h3>
        {/* No inline style. `.btn` already provides inline-flex, centring and a
            --space-2 gap; the old inline style overrode inline-flex with flex
            and replaced the token gap with a magic 4px. */}
        <Link to="/history" className="btn btn-ghost btn-sm">
          View all
          <ChevronRight size={14} aria-hidden="true" />
        </Link>
      </div>

      {/* The header row is no longer rendered when there is nothing to put under
          it. Previously <thead> was unconditional, so an empty list showed six
          column headers, zero rows, and the message underneath. */}
      {isEmpty ? (
        <p className="data-table-empty">
          No scans yet. Analyze a URL to see results here.
        </p>
      ) : (
        <div
          className="table-responsive"
          /* Scrollable regions need to be focusable, or keyboard users cannot
             reach the columns that `white-space: nowrap` pushes out of view. */
          tabIndex={0}
          role="region"
          aria-label="Recent scans"
        >
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Website</th>
                <th scope="col">Prediction</th>
                <th scope="col">Confidence</th>
                <th scope="col">Risk Score</th>
                <th scope="col">Scan Time</th>
                <th scope="col" className="cell-action">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {displayScans.map((scan) => {
                const risk = getRiskLevel(scan.risk_score);
                return (
                  <tr key={scan.id}>
                    <td className="cell-url" title={scan.url}>
                      {truncateUrl(scan.url, 30)}
                    </td>
                    <td>
                      <div className="cell-prediction">
                        {getPredictionIcon(scan.prediction)}
                        <span>{scan.prediction}</span>
                      </div>
                    </td>
                    <td>{formatProbability(scan.probability)}</td>
                    <td>
                      <span className={`badge ${risk.className}`}>
                        {scan.risk_score} · {risk.label}
                      </span>
                    </td>
                    <td>{formatRelativeTime(scan.scan_time)}</td>
                    <td className="cell-action">
                      {/* Was a dead button with no onClick at all. */}
                      <button
                        type="button"
                        className="btn-view"
                        onClick={() => navigate(`/history?url=${encodeURIComponent(scan.url)}`)}
                      >
                        View analysis
                        <span className="sr-only"> for {scan.url}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
};

export default RecentScans;
