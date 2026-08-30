import { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';

/* ============================================
   Theme tokens for canvas/SVG consumers
   ============================================

   Recharts writes colours into SVG presentation attributes and also reads them
   back internally for animation interpolation, legend swatches and dot fills.
   A `var(--risk-danger)` string survives the initial paint in modern browsers
   but is not a parseable colour anywhere Recharts needs to reason about it —
   which is why StatCard's sparkline stroke was fragile, and why every other
   chart in the app gave up and hardcoded hex values that then froze in dark
   mode.

   This resolves the tokens to concrete values once per theme change, so charts
   get real colours that still follow the design system. */

// Tokens charts are allowed to use. Anything read via this hook must be listed
// here or it resolves to undefined — which is how four bar-chart hover cursors
// silently fell back to Recharts' default grey after --bg-hover was omitted.
const CHART_TOKENS = [
  '--viz-indigo',
  '--viz-blue',
  '--viz-purple',
  '--viz-teal',
  '--viz-amber',
  '--viz-green',
  '--viz-slate',
  '--viz-grid',
  '--risk-safe',
  '--risk-suspicious',
  '--risk-danger',
  '--primary-300',
  '--primary-400',
  '--primary-500',
  '--primary-600',
  '--text-secondary',
  '--text-tertiary',
  '--border-primary',
  '--bg-card',
  '--bg-hover',
];

const readTokens = () => {
  const styles = getComputedStyle(document.documentElement);
  const resolved = CHART_TOKENS.reduce((acc, token) => {
    acc[token] = styles.getPropertyValue(token).trim();
    return acc;
  }, {});

  // In development, reading a token that isn't in CHART_TOKENS throws instead of
  // returning undefined. Without this, a missing entry just produces a
  // colourless chart element that is easy to miss in review — which is exactly
  // what happened with --bg-hover.
  if (import.meta.env.DEV) {
    return new Proxy(resolved, {
      get(target, prop) {
        if (typeof prop === 'string' && prop.startsWith('--') && !(prop in target)) {
          throw new Error(
            `useThemeTokens: "${prop}" is not in CHART_TOKENS. Add it to src/hooks/useThemeTokens.js.`
          );
        }
        return target[prop];
      },
    });
  }

  return resolved;
};

/**
 * Returns resolved hex/rgb values for the design system's chart tokens,
 * recomputed whenever the theme flips.
 */
export const useThemeTokens = () => {
  const { theme } = useTheme();
  const [tokens, setTokens] = useState(readTokens);

  useEffect(() => {
    // ThemeContext sets data-theme in its own effect. Both run after commit, and
    // effects fire in mount order (provider before consumer), so the attribute
    // is already current by the time this reads it. rAF adds a frame of safety
    // for the very first paint.
    const frame = requestAnimationFrame(() => setTokens(readTokens()));
    return () => cancelAnimationFrame(frame);
  }, [theme]);

  return tokens;
};

export default useThemeTokens;
