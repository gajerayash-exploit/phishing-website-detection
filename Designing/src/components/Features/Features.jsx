import { motion } from 'framer-motion';
import { Brain, GitCompareArrows, Zap, Eye } from 'lucide-react';
import './Features.css';

const features = [
  {
    icon: Brain,
    iconClass: 'feature-icon-purple',
    title: 'Machine Learning Detection',
    description: 'AI-powered phishing classification using trained Machine Learning models for accurate website risk assessment.',
  },
  {
    icon: GitCompareArrows,
    iconClass: 'feature-icon-blue',
    title: 'Multi-Model Analysis',
    description: 'Logistic Regression, Decision Tree and Random Forest were evaluated during model development.',
  },
  {
    icon: Zap,
    iconClass: 'feature-icon-green',
    title: 'Real-Time Risk Analysis',
    description: 'Analyze website information and receive a fast prediction with confidence scoring and risk evaluation.',
  },
  {
    icon: Eye,
    iconClass: 'feature-icon-amber',
    title: 'Model Transparency',
    description: 'View confidence, risk score and important website features influencing the prediction.',
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] },
  }),
};

const Features = () => {
  return (
    <section className="features-section" id="features-section">
      {/* Shared .section-header, which carries the horizontal gutter this
          header was missing — the heading ran flush to the viewport edge while
          the grid below it was correctly inset. */}
      <div className="section-header">
        <p className="section-eyebrow">Features</p>
        <h2 className="section-title">Intelligent Phishing Detection</h2>
        <p className="section-subtitle">
          Comprehensive website analysis powered by machine learning algorithms
        </p>
      </div>

      <div className="features-grid">
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            className="feature-card"
            custom={index}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={cardVariants}
            /* The lift lives here rather than in a CSS :hover rule. Framer
               writes an inline `transform`, which outranks the stylesheet, so a
               CSS hover transform was silently cancelled once the scroll-in
               animation had run. */
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className={`feature-icon ${feature.iconClass}`} aria-hidden="true">
              <feature.icon size={22} />
            </div>
            <h3 className="feature-title">{feature.title}</h3>
            <p className="feature-description">{feature.description}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default Features;
