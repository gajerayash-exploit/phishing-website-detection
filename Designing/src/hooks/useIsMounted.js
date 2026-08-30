import { useCallback, useEffect, useRef } from 'react';

/**
 * Returns a stable `isMounted()` predicate.
 *
 * React 19 makes `setState` after unmount a silent no-op, so the usual reason
 * for this hook is gone. Toasts are the exception: `toast.success(...)` writes
 * into the *provider's* state, and the provider outlives the page that called
 * it. A scan that takes 3.5s, or a bulk run that takes 15s, would happily pop
 * "Analysis complete" over whatever unrelated page the user had navigated to.
 *
 * Guard any post-await side effect that escapes the component with this.
 */
export const useIsMounted = () => {
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  return useCallback(() => mounted.current, []);
};

export default useIsMounted;
