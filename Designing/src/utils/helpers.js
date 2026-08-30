/**
 * Validate a URL string.
 *
 * Requires a dot in the hostname. Without that check `new URL('https://url')`
 * is perfectly valid, so a CSV header row (`url,prediction,label`) parsed into
 * three "valid URLs" that were then scanned and reported as results.
 */
export const isValidUrl = (string) => {
  if (!string || string.trim().length === 0) return false;
  try {
    // Allow URLs without protocol
    const trimmed = string.trim();
    const urlString = trimmed.match(/^https?:\/\//) ? trimmed : `https://${trimmed}`;
    const { hostname } = new URL(urlString);
    // Reject single-label hosts ("url", "prediction") while still allowing
    // localhost and IP literals.
    if (hostname === 'localhost') return true;
    return hostname.includes('.') && !hostname.startsWith('.') && !hostname.endsWith('.');
  } catch {
    return false;
  }
};

/**
 * Get risk level from score.
 *
 * Guards a missing score explicitly. `undefined <= 25` is false, so an absent
 * risk_score used to fall straight through to 'High Risk' and render in red —
 * a missing value silently displayed as the most severe verdict.
 */
export const getRiskLevel = (score) => {
  if (typeof score !== 'number' || Number.isNaN(score)) {
    return { label: 'Unknown', color: 'neutral', className: 'badge-primary' };
  }
  if (score <= 25) return { label: 'Low Risk', color: 'safe', className: 'badge-safe' };
  if (score <= 60) return { label: 'Medium Risk', color: 'suspicious', className: 'badge-suspicious' };
  return { label: 'High Risk', color: 'danger', className: 'badge-danger' };
};

/* `getRiskColor` was removed. It returned a `var(--risk-*)` string, which is
   fine in a CSS property but not in an SVG presentation attribute — Recharts and
   the risk gauge both read colours back out for interpolation, where a `var()`
   string is not a parseable colour. Use `useThemeTokens()` for anything that
   needs a concrete value, or a `.text-safe` / `.text-suspicious` /
   `.text-danger` class for plain text. */

/**
 * Get impact level from score.
 *
 * Returns a `level` key rather than a colour string, so callers style via a
 * class instead of an inline `var()` value.
 */
export const getImpactLevel = (impact) => {
  if (impact >= 0.7) return { label: 'High Impact', level: 'high' };
  if (impact >= 0.4) return { label: 'Medium Impact', level: 'medium' };
  return { label: 'Low Impact', level: 'low' };
};

/**
 * Format a probability to percentage string.
 * Rendered "NaN%" for a missing value before the guard.
 */
export const formatProbability = (prob) => {
  if (typeof prob !== 'number' || Number.isNaN(prob)) return '—';
  return `${(prob * 100).toFixed(1)}%`;
};

/**
 * Format relative time
 */
export const formatRelativeTime = (dateString) => {
  const date = new Date(dateString);
  // An unparseable date produced "NaN min ago".
  if (Number.isNaN(date.getTime())) return '—';

  const now = new Date();
  const diffMs = now - date;
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

/**
 * Format a number with commas
 */
export const formatNumber = (num) => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

/**
 * Truncate a URL for display.
 * Threw on a null url, since `url.length` was read unguarded.
 */
export const truncateUrl = (url, maxLength = 40) => {
  if (typeof url !== 'string' || url.length === 0) return '—';
  if (url.length <= maxLength) return url;
  return `${url.substring(0, maxLength)}…`;
};

/**
 * Clean a URL for display (remove protocol)
 */
export const cleanUrl = (url) => {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
};

/**
 * Generate a unique ID
 */
export const generateId = () => {
  // `substr` is deprecated; `slice` is the current equivalent.
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
};

/**
 * Clamp a number between min and max
 */
export const clamp = (num, min, max) => Math.min(Math.max(num, min), max);

/**
 * Parse CSV text to array of URLs
 */
export const parseCSV = (text) => {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const urls = [];
  for (const line of lines) {
    const parts = line.split(',');
    for (const part of parts) {
      const cleaned = part.trim().replace(/^["']|["']$/g, '');
      if (cleaned && isValidUrl(cleaned)) {
        urls.push(cleaned);
      }
    }
  }
  return [...new Set(urls)];
};
