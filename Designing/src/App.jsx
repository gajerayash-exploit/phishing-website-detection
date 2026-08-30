import { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar/Navbar';
import Footer from './components/Footer/Footer';
import DashboardLayout from './components/Layout/DashboardLayout';
import BackToTop from './components/BackToTop/BackToTop';
import { ToastProvider } from './components/Toast/Toast';
import { ThemeProvider } from './context/ThemeContext';
import { NavProvider } from './context/NavContext';
import './App.css';

// Pages
import Home from './pages/Home/Home';
import Scanner from './pages/Scanner/Scanner';
import Dashboard from './pages/Dashboard/Dashboard';
import Analytics from './pages/Analytics/Analytics';
import ModelInsights from './pages/ModelInsights/ModelInsights';
import BulkScanner from './pages/BulkScanner/BulkScanner';
import History from './pages/History/History';
import Settings from './pages/Settings/Settings';

// Routes that render inside DashboardLayout, and therefore hide the marketing
// footer. Derived from one list so the shell and the router can't drift apart.
const DASHBOARD_ROUTES = [
  '/dashboard',
  '/analytics',
  '/model-insights',
  '/bulk-scanner',
  '/history',
  '/settings',
];

const AppShell = () => {
  const location = useLocation();
  const isDashboard = DASHBOARD_ROUTES.some((path) => location.pathname.startsWith(path));

  // Reset scroll on navigation. `behavior: 'instant'` is required because
  // index.css sets `scroll-behavior: smooth` on <html> — without it, every
  // route change animated a long scroll and you watched the previous page's
  // footer slide past. Smooth scrolling still applies to in-page anchors.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.pathname]);

  return (
    <NavProvider>
      <div className="app-container">
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>

        <Navbar />

        {/* Exactly one <main> per document. DashboardLayout previously rendered a
            second, nested <main>, which breaks landmark navigation. */}
        <main className="app-main" id="main-content">
          <Routes>
            {/* Public */}
            <Route path="/" element={<Home />} />
            <Route path="/scanner" element={<Scanner />} />

            {/* Dashboard (with sidebar) */}
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/model-insights" element={<ModelInsights />} />
              <Route path="/bulk-scanner" element={<BulkScanner />} />
              <Route path="/history" element={<History />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Routes>
        </main>

        {!isDashboard && <Footer />}

        <BackToTop />
      </div>
    </NavProvider>
  );
};

const App = () => (
  <ThemeProvider>
    <ToastProvider>
      <AppShell />
    </ToastProvider>
  </ThemeProvider>
);

export default App;
