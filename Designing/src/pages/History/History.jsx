import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Search as SearchIcon,
  Filter,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  Download,
} from 'lucide-react';
import { getScanHistory } from '../../services/api';
import {
  truncateUrl,
  formatRelativeTime,
  formatProbability,
  getRiskLevel,
} from '../../utils/helpers';
import './History.css';

const ITEMS_PER_PAGE = 10;

// `.text-*` classes exist in index.css now, so the duplicated inline colour
// styles that were compensating for their absence are gone.
const getPredictionIcon = (prediction) => {
  if (prediction === 'Phishing') {
    return <ShieldAlert size={14} className="text-danger" aria-hidden="true" />;
  }
  if (prediction === 'Suspicious') {
    return <ShieldQuestion size={14} className="text-suspicious" aria-hidden="true" />;
  }
  return <ShieldCheck size={14} className="text-safe" aria-hidden="true" />;
};

/**
 * Exports an array of scan records to a CSV file and triggers a download.
 */
const exportToCSV = (scans) => {
  if (!scans.length) return;

  const headers = ['URL', 'Prediction', 'Confidence', 'Risk Score', 'Model', 'Scan Time'];
  const rows = scans.map((scan) => [
    `"${(scan.url || '').replace(/"/g, '""')}"`,
    scan.prediction || '',
    scan.probability != null ? (scan.probability * 100).toFixed(1) + '%' : '',
    scan.risk_score ?? '',
    scan.model || '',
    scan.scan_time || '',
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `PhishGuard_Scan_History_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const History = () => {
  const [loading, setLoading] = useState(true);
  // A failed fetch used to be indistinguishable from a genuinely empty result:
  // the catch only logged, so users saw "No scans found matching your criteria"
  // for what was actually a network error.
  const [error, setError] = useState(null);
  const [scans, setScans] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPrediction, setFilterPrediction] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getScanHistory();
        setScans(data);
      } catch (err) {
        console.error('Failed to fetch scan history', err);
        setError('Could not load scan history.');
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const filteredScans = scans.filter((scan) => {
    const matchesSearch = scan.url.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterPrediction === 'All' || scan.prediction === filterPrediction;
    return matchesSearch && matchesFilter;
  });

  const totalPages = Math.ceil(filteredScans.length / ITEMS_PER_PAGE);
  const paginatedScans = filteredScans.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const isFiltering = searchQuery !== '' || filterPrediction !== 'All';

  if (loading && scans.length === 0) {
    return (
      <div className="dashboard-loading">
        <div className="spinner spinner-dark" />
        <p>Loading scan history…</p>
      </div>
    );
  }

  return (
    <div className="history-page">
      <div className="dashboard-page-header history-page-header">
        <div>
          <h1 className="dashboard-page-title">Scan History</h1>
          <p className="dashboard-page-subtitle">
            View and filter previous website analysis records.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm history-export-btn"
          onClick={() => exportToCSV(filteredScans)}
          disabled={filteredScans.length === 0}
          title="Export filtered results as CSV"
          id="export-csv-btn"
        >
          <Download size={16} aria-hidden="true" />
          Export CSV
        </button>
      </div>

      <div className="history-card">
        <div className="history-controls">
          <div className="history-search">
            <SearchIcon size={18} className="history-search-icon" aria-hidden="true" />
            <input
              type="search"
              placeholder="Search URLs…"
              className="history-search-input"
              aria-label="Search scanned URLs"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <div className="history-filter">
            <Filter size={18} className="history-filter-icon" aria-hidden="true" />
            <select
              className="history-filter-select"
              aria-label="Filter by prediction"
              value={filterPrediction}
              onChange={(e) => {
                setFilterPrediction(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="All">All predictions</option>
              <option value="Legitimate">Legitimate</option>
              <option value="Suspicious">Suspicious</option>
              <option value="Phishing">Phishing</option>
            </select>
          </div>
        </div>

        <div
          className="table-responsive"
          tabIndex={0}
          role="region"
          aria-label="Scan history"
        >
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Website URL</th>
                <th scope="col">Prediction</th>
                <th scope="col">Confidence</th>
                <th scope="col">Risk Score</th>
                <th scope="col">Model</th>
                <th scope="col">Scan Time</th>
                <th scope="col" className="cell-action">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedScans.length > 0 ? (
                paginatedScans.map((scan) => {
                  const risk = getRiskLevel(scan.risk_score);
                  return (
                    <motion.tr
                      key={scan.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      <td className="cell-url" title={scan.url}>
                        {truncateUrl(scan.url, 35)}
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
                      {/* Was an inline-styled span; now a class. */}
                      <td className="cell-model">{scan.model}</td>
                      <td>{formatRelativeTime(scan.scan_time)}</td>
                      <td className="cell-action">
                        {/* Standalone .btn-view, not `.btn .btn-view` — pairing
                            them gave this text action a 12/24px pill padding,
                            overflow:hidden and the ::after sheen. */}
                        <button type="button" className="btn-view">
                          Details
                          <span className="sr-only"> for {scan.url}</span>
                        </button>
                      </td>
                    </motion.tr>
                  );
                })
              ) : (
                <tr>
                  {/* Message distinguishes the three states: load failure,
                      no data at all, and no matches for the active filters. */}
                  <td colSpan={7} className="data-table-empty">
                    {error
                      ? `${error} Check your connection and reload the page.`
                      : isFiltering
                        ? 'No scans match your search or filter. Try clearing them.'
                        : 'No scans recorded yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <nav className="history-pagination" aria-label="Scan history pages">
            <span className="history-pagination-info">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredScans.length)} of{' '}
              {filteredScans.length} entries
            </span>
            <div className="history-pagination-controls">
              <button
                type="button"
                className="btn btn-secondary btn-icon"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                aria-label="Previous page"
              >
                <ChevronLeft size={16} aria-hidden="true" />
              </button>
              <span className="history-pagination-page">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                className="btn btn-secondary btn-icon"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Next page"
              >
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            </div>
          </nav>
        )}
      </div>
    </div>
  );
};

export default History;
