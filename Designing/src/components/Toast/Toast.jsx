import { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { generateId } from '../../utils/helpers';
import './Toast.css';

const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};

const ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const TYPES = Object.keys(ICONS);
const DEFAULT_TYPE = 'info';
const DEFAULT_DURATION = 4000;

// The icon lookup already had a fallback; the className did not. An unknown type
// produced `class="toast toast-undefined"`, and since .toast-progress has no
// background of its own, the progress bar rendered invisible while the icon
// still appeared. Both now normalise through the same guard.
const normalizeType = (type) => (TYPES.includes(type) ? type : DEFAULT_TYPE);

const Toast = ({ toast, onRemove }) => {
  const type = normalizeType(toast.type);
  const Icon = ICONS[type];
  // Guarded: a toast object built without `duration` yielded NaN here and
  // framer-motion silently dropped the animation.
  const duration = Number.isFinite(toast.duration) ? toast.duration : DEFAULT_DURATION;

  return (
    <motion.div
      className={`toast toast-${type}`}
      layout
      initial={{ opacity: 0, x: 50, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 50, scale: 0.95 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
    >
      <Icon className="toast-icon" size={20} aria-hidden="true" />
      <div className="toast-body">
        {toast.title && <p className="toast-title">{toast.title}</p>}
        <p className="toast-message">{toast.message}</p>
      </div>
      <button
        type="button"
        className="toast-close"
        onClick={() => onRemove(toast.id)}
        // Was icon-only with no accessible name — announced as just "button".
        aria-label="Dismiss notification"
      >
        <X size={14} aria-hidden="true" />
      </button>
      <motion.div
        className="toast-progress"
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: duration / 1000, ease: 'linear' }}
      />
    </motion.div>
  );
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  // Timer handles were never stored, so they couldn't be cancelled: they
  // survived unmount and kept firing removeToast on already-removed ids.
  const timers = useRef(new Map());

  const removeToast = useCallback((id) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ type = DEFAULT_TYPE, title, message, duration = DEFAULT_DURATION }) => {
      const id = generateId();
      setToasts((prev) => [...prev, { id, type: normalizeType(type), title, message, duration }]);
      timers.current.set(id, setTimeout(() => removeToast(id), duration));
      return id;
    },
    [removeToast]
  );

  // Clear every outstanding timer on unmount.
  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      pending.clear();
    };
  }, []);

  // Memoised. This object was rebuilt on every provider render and passed
  // straight in as `value`, so — because the provider wraps the entire app —
  // each toast add or remove re-rendered every useToast() consumer in the tree.
  const value = useMemo(
    () => ({
      success: (message, title) => addToast({ type: 'success', title, message }),
      error: (message, title) => addToast({ type: 'error', title, message, duration: 6000 }),
      warning: (message, title) => addToast({ type: 'warning', title, message }),
      info: (message, title) => addToast({ type: 'info', title, message }),
      dismiss: removeToast,
    }),
    [addToast, removeToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* aria-live was absent entirely, so every success and error message was
          invisible to assistive tech — including errors, which are this app's
          primary failure channel. 'polite' avoids interrupting; the container
          is the live region so additions are announced as they mount. */}
      <div
        className="toast-container"
        role="status"
        aria-live="polite"
        aria-relevant="additions"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <Toast key={t.id} toast={t} onRemove={removeToast} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export default ToastProvider;
