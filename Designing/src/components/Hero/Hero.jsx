import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3 } from 'lucide-react';
import { mockAnalytics, mockModelMetrics } from '../../data/mockData';
import './Hero.css';

// Derived from the same source the dashboard reads, rather than the literals
// "12,842" / "96.8%" / "3" that were typed into the markup. Those duplicated
// mockAnalytics exactly, so the hero and the dashboard were one edit away from
// disagreeing about the product's headline numbers.
const heroStats = [
  {
    value: mockAnalytics.totalScans.toLocaleString(),
    label: 'URLs Analyzed',
  },
  {
    value: `${mockAnalytics.modelAccuracy}%`,
    label: 'Model Accuracy',
  },
  {
    value: String(mockModelMetrics.models.length),
    label: 'ML Models Trained',
  },
  {
    value: '<2s',
    label: 'Avg. Scan Time',
  },
];

const Hero = () => {
  return (
    <section className="hero" id="hero-section">
      <div className="hero-bg">
        <div className="hero-gradient-orb hero-orb-1" />
        <div className="hero-gradient-orb hero-orb-2" />
        <div className="hero-gradient-orb hero-orb-3" />
        <div className="hero-grid" />
      </div>

      <div className="hero-content">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="hero-badge">
            <span className="hero-badge-dot" />
            Powered by Machine Learning
          </div>
        </motion.div>

        <motion.h1
          className="hero-title"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <span className="hero-title-gradient">Phishing Website</span>
          <br />
          Detection System
        </motion.h1>

        <motion.p
          className="hero-subtitle"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Analyze suspicious URLs, understand their risk factors, and get
          intelligent predictions powered by trained Machine Learning models
          to identify phishing and legitimate websites.
        </motion.p>

        <motion.div
          className="hero-actions"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Link to="/scanner" className="btn btn-primary btn-lg" id="hero-scan-btn">
            Scan URL
            <ArrowRight size={18} />
          </Link>
          <Link to="/analytics" className="btn btn-secondary btn-lg" id="hero-analytics-btn">
            <BarChart3 size={18} />
            View Analytics
          </Link>
        </motion.div>

        <motion.div
          className="hero-stats"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          {heroStats.map((stat) => (
            <div className="hero-stat" key={stat.label}>
              <div className="hero-stat-value">{stat.value}</div>
              <div className="hero-stat-label">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
