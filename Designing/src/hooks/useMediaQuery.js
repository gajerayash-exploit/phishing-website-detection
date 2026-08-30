import { useEffect, useState } from 'react';

/**
 * Subscribes to a CSS media query from JS.
 *
 * Needed because some behaviour genuinely cannot be expressed in CSS alone:
 * the `inert` attribute that keeps an off-screen drawer out of the tab order
 * is a DOM property, not a style, so the component has to know which mode it
 * is in. Reading the query in JS also keeps the JS and CSS breakpoints paired
 * instead of guessed.
 */
export const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    // Re-sync on mount in case the viewport changed between the initial state
    // computation and the effect running.
    setMatches(mediaQuery.matches);

    const onChange = (event) => setMatches(event.matches);
    mediaQuery.addEventListener('change', onChange);
    return () => mediaQuery.removeEventListener('change', onChange);
  }, [query]);

  return matches;
};

export default useMediaQuery;
