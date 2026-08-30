import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import './StatCard.css';

// Maps the card's colour slot to a design token. Resolved to a real colour by
// useThemeTokens before it reaches Recharts.
const SPARKLINE_TOKENS = {
  red: '--risk-danger',
  green: '--risk-safe',
  blue: '--viz-blue',
  purple: '--viz-indigo',
};

const StatCard = ({
  title,
  value,
  icon: Icon,
  colorClass = 'purple',
  change,
  trend,
  sparkline,
  // What the change is measured against. Was hardcoded to "vs last 30 days",
  // so picking the 24H filter on the dashboard still claimed 30 days.
  period = 'vs last 30 days',
  /* Some metrics are better when they fall. "Phishing detected: -2.4%, trend
     down" was rendered in danger-red as though fewer detected threats were bad
     news. This lets a card say that its direction and its sentiment differ. */
  invertTrend = false,
  delay = 0,
}) => {
  const isUp = trend === 'up';
  const isDown = trend === 'down';

  // Direction drives the arrow; sentiment drives the colour.
  const isGood = invertTrend ? isDown : isUp;
  const isBad = invertTrend ? isUp : isDown;
  const sentiment = isGood ? 'positive' : isBad ? 'negative' : 'neutral';

  const tokens = useThemeTokens();
  // Literal last resort, reached only if getComputedStyle returns empty (which
  // can happen for one frame on very first paint before styles are applied).
  // It matches --viz-slate, so a miss is invisible rather than black.
  const sparklineColor =
    tokens[SPARKLINE_TOKENS[colorClass]] || tokens['--text-tertiary'] || '#94a3b8';

  const sparklineData = sparkline
    ? sparkline.map((val, index) => ({ value: val, index }))
    : [];

  const TrendIcon = isUp ? ArrowUpRight : isDown ? ArrowDownRight : Minus;

  return (
    <motion.div
      className="stat-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <div className="stat-card-header">
        <span className="stat-card-title">{title}</span>
        {/* Icon is optional now. It was destructured with no default and
            rendered raw, so omitting it threw "Element type is invalid" and
            took down the entire page rather than one card. */}
        {Icon && (
          <span className={`stat-card-icon ${colorClass}`} aria-hidden="true">
            <Icon size={20} />
          </span>
        )}
      </div>

      <div className="stat-card-value-container">
        <div className="stat-card-value">{value}</div>
        {sparklineData.length > 0 && (
          <div className="stat-card-sparkline" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparklineData}>
                <YAxis domain={['dataMin - 5', 'dataMax + 5']} hide />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={sparklineColor}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="stat-card-footer">
        <span className={`stat-change ${sentiment}`}>
          <TrendIcon size={14} aria-hidden="true" />
          {change}
          {/* The arrow was the only cue for direction. This keeps it available
              to screen readers without repeating it visually. */}
          {trend && <span className="sr-only">{isUp ? ' increase' : isDown ? ' decrease' : ' no change'}</span>}
        </span>
        <span className="stat-period">{period}</span>
      </div>
    </motion.div>
  );
};

export default StatCard;
