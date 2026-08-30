import { motion } from 'framer-motion';
import { Link2, Cpu, BrainCircuit, Gauge, CheckCircle2 } from 'lucide-react';
import './Timeline.css';

// The numbers are real information here — this is an ordered pipeline, and step
// 3 cannot happen before step 2. They were previously defined and then used
// only as a React key, so the number never reached the screen while
// .timeline-dot carried font-weight/font-size rules styling nothing.
const steps = [
  {
    num: '01',
    icon: Link2,
    title: 'Enter Website URL',
    description: 'Paste or type the website URL you want to analyze for phishing risk.',
  },
  {
    num: '02',
    icon: Cpu,
    title: 'Extract Website Features',
    description:
      'The system extracts URL structure, domain info, and behavioral features from the website.',
  },
  {
    num: '03',
    icon: BrainCircuit,
    title: 'Run Machine Learning Model',
    description:
      'The trained Random Forest classifier processes the extracted features to make a prediction.',
  },
  {
    num: '04',
    icon: Gauge,
    title: 'Calculate Risk & Confidence',
    description:
      'A risk score and model confidence percentage are calculated from the prediction probabilities.',
  },
  {
    num: '05',
    icon: CheckCircle2,
    title: 'Display Result',
    description:
      'View the Phishing or Legitimate result with detailed feature analysis and recommendations.',
  },
];

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i) => ({
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] },
  }),
};

const Timeline = () => {
  return (
    <section className="timeline-section" id="how-it-works-section">
      <div className="section-header">
        <p className="section-eyebrow">How It Works</p>
        <h2 className="section-title">From URL to Prediction</h2>
        <p className="section-subtitle">
          A streamlined process powered by machine learning
        </p>
      </div>

      {/* An ordered list, because the order carries meaning. */}
      <ol className="timeline-container">
        {steps.map((step, index) => (
          <motion.li
            key={step.num}
            className="timeline-item"
            custom={index}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-30px' }}
            variants={itemVariants}
          >
            <div className="timeline-dot-container">
              <div className="timeline-dot">
                <step.icon size={20} aria-hidden="true" />
              </div>
            </div>
            <div className="timeline-content">
              <p className="timeline-step-index">Step {step.num}</p>
              <h3 className="timeline-step-title">{step.title}</h3>
              <p className="timeline-step-description">{step.description}</p>
            </div>
          </motion.li>
        ))}
      </ol>
    </section>
  );
};

export default Timeline;
