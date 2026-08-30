import { motion } from 'framer-motion';
import './ChartCard.css';

const ChartCard = ({
  title,
  subtitle,
  filters,
  activeFilter,
  onFilterChange,
  children,
  delay = 0,
  className = '',
}) => {
  const hasFilters = filters && filters.length > 0;

  return (
    <motion.div
      /* .trim() so an omitted className doesn't leave `class="chart-card "`. */
      className={`chart-card ${className}`.trim()}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <div className="chart-card-header">
        <div className="chart-card-title-group">
          <h3 className="chart-card-title">{title}</h3>
          {subtitle && <p className="chart-card-subtitle">{subtitle}</p>}
        </div>

        {hasFilters && (
          /* role=group + label: this was a bare div of buttons with no grouping
             and no pressed state, so screen reader users got four anonymous
             toggles with no indication of which was active. */
          <div className="chart-filters" role="group" aria-label={`${title} time range`}>
            {filters.map((filter) => (
              <button
                type="button"
                key={filter}
                className={`chart-filter-btn ${activeFilter === filter ? 'active' : ''}`}
                aria-pressed={activeFilter === filter}
                /* Guarded. The render condition checked `filters` but not
                   `onFilterChange`, so passing filters without a handler threw
                   "onFilterChange is not a function" on click. */
                onClick={() => onFilterChange?.(filter)}
              >
                {filter}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="chart-container">{children}</div>
    </motion.div>
  );
};

export default ChartCard;

/* Recharts hands the tooltip whatever is in the series: numbers, but also null
   for gaps and strings for categorical or pre-formatted values. Calling
   `.toLocaleString()` on those threw inside a render, and because this tooltip
   is shared by every chart in the app, a single null datapoint anywhere took
   down the whole chart the moment the cursor touched it. */
const formatTooltipValue = (value) => {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value.toLocaleString() : '—';
  }
  return String(value);
};

// Reusable custom tooltip component for Recharts
export const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="custom-tooltip">
      {label !== undefined && label !== null && (
        <p className="custom-tooltip-label">{label}</p>
      )}
      {payload.map((entry, index) => (
        <div
          // dataKey is stable across hovers; the array index was not.
          key={entry.dataKey ?? entry.name ?? index}
          className="custom-tooltip-item"
        >
          <span
            className="custom-tooltip-color"
            style={{ backgroundColor: entry.color }}
            aria-hidden="true"
          />
          <span className="custom-tooltip-name">{entry.name}</span>
          <span className="custom-tooltip-value">{formatTooltipValue(entry.value)}</span>
        </div>
      ))}
    </div>
  );
};
