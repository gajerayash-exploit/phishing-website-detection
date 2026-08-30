import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, FileText, CheckCircle, Download, X } from 'lucide-react';
import { parseCSV, formatProbability, truncateUrl, getRiskLevel } from '../../utils/helpers';
import { bulkScan } from '../../services/api';
import { useToast } from '../../components/Toast/Toast';
import DemoBanner from '../../components/DemoBanner/DemoBanner';
import { useIsMounted } from '../../hooks/useIsMounted';
import './BulkScanner.css';

const ACCEPTED_EXTENSIONS = ['.csv', '.txt'];

// Wraps a CSV field and doubles any embedded quote, per RFC 4180. The previous
// `"${r.url}"` corrupted the export for any URL containing a double quote.
const csvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const BulkScanner = () => {
  const [file, setFile] = useState(null);
  const [urls, setUrls] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState([]);
  const fileInputRef = useRef(null);
  const progressTimer = useRef(null);
  const toast = useToast();
  const isMounted = useIsMounted();

  // Clear the simulated-progress interval if the component unmounts mid-scan.
  useEffect(
    () => () => {
      if (progressTimer.current) clearInterval(progressTimer.current);
    },
    []
  );

  const resetSelection = useCallback(() => {
    setFile(null);
    setUrls([]);
    setResults([]);
    // Reset the input value, or picking the same filename twice in a row is
    // silently ignored because the value hasn't changed.
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const processFile = useCallback(
    (selectedFile) => {
      const hasValidExtension = ACCEPTED_EXTENSIONS.some((ext) =>
        selectedFile.name.toLowerCase().endsWith(ext)
      );

      if (!hasValidExtension) {
        toast.error('Upload a .csv or .txt file with one URL per line.', 'Unsupported file type');
        return;
      }

      setResults([]);
      // Cleared here, not left holding the previous file's list — if the new
      // file parsed to zero URLs, the stale URLs survived alongside file: null.
      setUrls([]);

      const reader = new FileReader();

      reader.onload = (event) => {
        if (!isMounted()) return;
        const parsedUrls = parseCSV(event.target.result);
        if (parsedUrls.length === 0) {
          toast.error('No valid URLs found in that file.', 'Nothing to scan');
          resetSelection();
          return;
        }
        setFile(selectedFile);
        setUrls(parsedUrls);
      };

      // Was absent: a read failure left the UI showing the file card with an
      // empty URL list and a button that silently did nothing.
      reader.onerror = () => {
        if (!isMounted()) return;
        toast.error('That file could not be read. Try again.', 'Read failed');
        resetSelection();
      };

      reader.readAsText(selectedFile);
    },
    [isMounted, resetSelection, toast]
  );

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files?.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const startBulkScan = async () => {
    if (urls.length === 0) return;

    setIsProcessing(true);
    setProgress(0);
    setResults([]);

    // Simulate progress, since the mock API resolves everything at once.
    progressTimer.current = setInterval(() => {
      setProgress((p) => Math.min(p + 100 / (urls.length + 2), 90));
    }, 300);

    try {
      const scanResults = await bulkScan(urls);
      // bulkScan waits 300ms per URL, so a 50-row file runs 15s+ — plenty of
      // time to navigate away. State writes are no-ops after unmount; the toast
      // is not, since the provider outlives this page.
      if (!isMounted()) return;
      setProgress(100);
      setResults(scanResults);
      toast.success(`Analyzed ${urls.length} URLs.`, 'Bulk scan complete');
    } catch (error) {
      console.error('Bulk scan failed', error);
      if (!isMounted()) return;
      toast.error('The scan did not finish. Check the API connection and retry.', 'Scan failed');
    } finally {
      // In `finally`, not after the await. On the error path the interval was
      // never cleared and kept calling setProgress every 300ms forever —
      // including after unmount.
      clearInterval(progressTimer.current);
      progressTimer.current = null;
      if (isMounted()) setIsProcessing(false);
    }
  };

  const downloadReport = () => {
    if (results.length === 0) return;

    const headers = ['URL', 'Prediction', 'Probability', 'Risk Score', 'Model'];
    const csvContent = [
      headers.join(','),
      ...results.map((r) =>
        [r.url, r.prediction, r.probability, r.risk_score, r.model].map(csvCell).join(',')
      ),
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `phishguard_report_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    // Was never revoked, so every download leaked a blob for the page's
    // lifetime. Deferred a tick because Safari and older Firefox read the blob
    // asynchronously and revoking synchronously cancels the download.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const countByPrediction = (prediction) =>
    results.filter((r) => r.prediction === prediction).length;

  return (
    <div className="bulk-scanner-page">
      <div className="dashboard-page-header">
        <h1 className="dashboard-page-title">Bulk Scanner</h1>
        <p className="dashboard-page-subtitle">
          Upload a CSV file containing multiple URLs for batch analysis.
        </p>
      </div>

      <div className="bulk-scanner-content">
        <DemoBanner />

        <AnimatePresence mode="wait">
          {/* Upload Zone */}
          {!file && (
            <motion.div
              key="dropzone"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              {/* The input is a SIBLING of the button, not a child of it.
                  Nesting it inside the element whose onClick called
                  `input.click()` meant the synthetic click bubbled straight back
                  into that same handler — the classic double-file-dialog bug. */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".csv,.txt"
                className="sr-only"
                id="bulk-file-input"
              />
              {/* A real button, so it is keyboard-operable and announced as a
                  control. It was a bare div with an onClick. */}
              <button
                type="button"
                className={`drop-zone ${isDragging ? 'dragging' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <span className="drop-zone-icon" aria-hidden="true">
                  <UploadCloud size={48} />
                </span>
                <span className="drop-zone-title">Drop your CSV file here</span>
                <span className="drop-zone-subtitle">or click to browse files</span>
                <span className="drop-zone-formats">
                  Supports .csv and .txt files with one URL per line
                </span>
              </button>
            </motion.div>
          )}

          {/* File Ready / Processing State */}
          {file && results.length === 0 && (
            <motion.div
              key="file-card"
              className="bulk-file-card"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              <div className="bulk-file-header">
                <div className="bulk-file-info">
                  <span className="bulk-file-icon" aria-hidden="true">
                    <FileText size={24} />
                  </span>
                  <div>
                    <p className="bulk-file-name">{file.name}</p>
                    <p className="bulk-file-meta">
                      {(file.size / 1024).toFixed(1)} KB • {urls.length} URLs found
                    </p>
                  </div>
                </div>
                {!isProcessing && (
                  <button
                    type="button"
                    className="bulk-file-remove"
                    onClick={resetSelection}
                    aria-label={`Remove ${file.name}`}
                  >
                    <X size={18} aria-hidden="true" />
                  </button>
                )}
              </div>

              {isProcessing ? (
                <div className="bulk-progress-section">
                  <div className="bulk-progress-header">
                    <span className="bulk-progress-status">
                      <span className="spinner spinner-dark bulk-progress-spinner" aria-hidden="true" />
                      Analyzing URLs…
                    </span>
                    <span className="bulk-progress-value">{Math.round(progress)}%</span>
                  </div>
                  <div
                    className="bulk-progress-bar-bg"
                    role="progressbar"
                    aria-valuenow={Math.round(progress)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Bulk scan progress"
                  >
                    <div className="bulk-progress-bar-fill" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              ) : (
                <div className="bulk-actions">
                  <button type="button" className="btn btn-primary" onClick={startBulkScan}>
                    Start bulk analysis
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* Results */}
          {results.length > 0 && (
            <motion.div
              key="results"
              className="bulk-results-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
            >
              <div className="bulk-results-header">
                <div className="bulk-results-summary">
                  <CheckCircle size={24} className="text-safe" aria-hidden="true" />
                  <div>
                    <h2 className="bulk-results-title">Analysis complete</h2>
                    <p className="bulk-results-subtitle">Processed {results.length} URLs</p>
                  </div>
                </div>
                <button type="button" className="btn btn-secondary" onClick={downloadReport}>
                  <Download size={16} aria-hidden="true" /> Download CSV report
                </button>
              </div>

              {/* Own grid class, not the global .grid-3 — that collapses to
                  2 columns below 1024px, orphaning the third box even though
                  this page is capped at 1000px and all three still fit. */}
              <div className="bulk-results-stats">
                <div className="bulk-stat-box safe">
                  <p className="bulk-stat-label">Legitimate</p>
                  <p className="bulk-stat-value">{countByPrediction('Legitimate')}</p>
                </div>
                <div className="bulk-stat-box suspicious">
                  <p className="bulk-stat-label">Suspicious</p>
                  <p className="bulk-stat-value">{countByPrediction('Suspicious')}</p>
                </div>
                <div className="bulk-stat-box danger">
                  <p className="bulk-stat-label">Phishing</p>
                  <p className="bulk-stat-value">{countByPrediction('Phishing')}</p>
                </div>
              </div>

              <div
                className="table-responsive bulk-table-container"
                tabIndex={0}
                role="region"
                aria-label="Bulk scan results"
              >
                <table className="data-table">
                  <thead>
                    <tr>
                      <th scope="col">Website URL</th>
                      <th scope="col">Prediction</th>
                      <th scope="col">Confidence</th>
                      <th scope="col">Risk Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((result, i) => {
                      const risk = getRiskLevel(result.risk_score);
                      return (
                        // Index key is deliberate: the mock API stamps
                        // `scan_${Date.now()}` as scan_id, so URLs processed in
                        // the same millisecond collide on id.
                        <tr key={`${result.url}-${i}`}>
                          <td className="cell-url" title={result.url}>
                            {truncateUrl(result.url, 40)}
                          </td>
                          <td className="cell-prediction-text">{result.prediction}</td>
                          <td>{formatProbability(result.probability)}</td>
                          <td>
                            <span className={`badge ${risk.className}`}>
                              {result.risk_score} · {risk.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="bulk-results-footer">
                <button type="button" className="btn btn-ghost" onClick={resetSelection}>
                  Scan another file
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default BulkScanner;
