import { AlertTriangle } from 'lucide-react';
import { IS_MOCK } from '../../services/api';
import './DemoBanner.css';

/* Renders only while VITE_USE_MOCK is on, and disappears by itself once the
   backend is enabled — no flag to remember to remove.

   It exists because the simulated path is otherwise indistinguishable from a
   real prediction: it returns a confident-looking percentage, a risk score and a
   named model. Anyone demoing this could reasonably believe the numbers mean
   something. They don't: the verdict is a keyword match against eleven words,
   falling back to `Math.random() > 0.6`. */
const DemoBanner = () => {
  if (!IS_MOCK) return null;

  return (
    <div className="demo-banner" role="status">
      <AlertTriangle size={18} className="demo-banner-icon" aria-hidden="true" />
      <div className="demo-banner-body">
        <p className="demo-banner-title">Demo mode — results are simulated</p>
        <p className="demo-banner-text">
          No model is running. Verdicts come from a keyword match and a random
          number, so the same URL can return different answers. Start the backend
          and set <code>VITE_USE_MOCK=false</code> for real predictions.
        </p>
      </div>
    </div>
  );
};

export default DemoBanner;
