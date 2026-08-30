import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useMediaQuery } from '../hooks/useMediaQuery';

/* ============================================
   Mobile Navigation
   ============================================

   One piece of state drives the whole mobile nav, because there is only one
   trigger. The Navbar hamburger opens either the site menu (marketing routes)
   or the dashboard sidebar drawer (app routes) — whichever navigation is
   contextually relevant. Two separate hamburgers on one screen would be the
   obvious alternative and a worse one.

   Centralising here also means the cross-cutting concerns that a drawer needs
   — body scroll lock, Escape to close, closing on navigation, closing when the
   viewport grows past the breakpoint — are implemented once instead of being
   duplicated (and previously omitted) in each panel. */

// Paired with the `max-width: 768px` breakpoint in Navbar.css and Sidebar.css.
const MOBILE_QUERY = '(max-width: 768px)';

const DASHBOARD_ROUTES = [
  '/dashboard',
  '/analytics',
  '/model-insights',
  '/bulk-scanner',
  '/history',
  '/settings',
];

const NavContext = createContext(null);

export const NavProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const location = useLocation();

  const isDashboard = DASHBOARD_ROUTES.some((path) => location.pathname.startsWith(path));

  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((open) => !open), []);

  // Close on navigation.
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // The trigger is mobile-only. Leaving it open while the viewport grows left
  // an overlay on screen whose only close button was display:none.
  useEffect(() => {
    if (!isMobile) setIsOpen(false);
  }, [isMobile]);

  // Lock background scroll. Restores the previous value rather than clearing
  // to '', so it composes with anything else that touches body overflow.
  useEffect(() => {
    if (!isOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  // Escape closes.
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  const value = useMemo(
    () => ({ isOpen, isMobile, isDashboard, close, toggle }),
    [isOpen, isMobile, isDashboard, close, toggle]
  );

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
};

export const useNav = () => {
  const context = useContext(NavContext);
  if (!context) throw new Error('useNav must be used within a NavProvider');
  return context;
};
