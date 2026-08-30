import { Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer" id="main-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <span className="footer-logo" aria-hidden="true">
            <Shield size={14} />
          </span>
          <span className="footer-text">
            © {new Date().getFullYear()} PhishGuard AI. Developed by <span className="developer-name">Yash Gajera</span>. Built with Machine Learning.
          </span>
        </div>
        <nav className="footer-links" aria-label="Footer">
          <Link to="/scanner">Scanner</Link>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/model-insights">Model Insights</Link>
          <Link to="/settings">Settings</Link>
        </nav>
      </div>
    </footer>
  );
};

export default Footer;
