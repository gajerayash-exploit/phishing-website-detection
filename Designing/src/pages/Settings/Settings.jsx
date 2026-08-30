import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Palette,
  Bell,
  BrainCircuit,
  Server,
  Save,
  CheckCircle2,
  Moon,
  Sun,
  Monitor,
} from 'lucide-react';
import { useToast } from '../../components/Toast/Toast';
import { useTheme } from '../../context/ThemeContext';
import { useIsMounted } from '../../hooks/useIsMounted';
import './Settings.css';

const TABS = [
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'model', label: 'ML Model', icon: BrainCircuit },
  { id: 'backend', label: 'Backend API', icon: Server },
  { id: 'notifications', label: 'Notifications', icon: Bell },
];

const THEME_OPTIONS = [
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'system', label: 'System', icon: Monitor },
];

const Settings = () => {
  const toast = useToast();
  // Theme comes from the shared provider. This page used to keep its own copy
  // and write `data-theme` + localStorage directly, which left App's state
  // stale (so the navbar toggle undid your choice) and persisted the literal
  // 'system' as data-theme — a value no stylesheet rule matches.
  const { preference, setPreference } = useTheme();
  const [activeTab, setActiveTab] = useState('appearance');
  const [isSaving, setIsSaving] = useState(false);
  const isMounted = useIsMounted();

  const [settings, setSettings] = useState({
    notifications: {
      scanComplete: true,
      threatDetection: true,
    },
    model: {
      current: 'random_forest',
      confidenceThreshold: 75,
    },
    backend: {
      apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:5000',
      timeout: 30,
    },
  });

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 800));
    // Leaving Settings within 800ms of clicking Save would otherwise pop
    // "Settings updated" on the next page.
    if (!isMounted()) return;
    setIsSaving(false);
    // Says what it actually did. Theme is persisted immediately by the provider;
    // the rest is not yet wired to a backend, so the copy no longer claims it is.
    toast.success('Preferences applied for this session.', 'Settings updated');
  };

  return (
    <div className="settings-page">
      <div className="dashboard-page-header">
        <h1 className="dashboard-page-title">Settings</h1>
        <p className="dashboard-page-subtitle">
          Configure system appearance, model parameters, and API connections.
        </p>
      </div>

      <div className="settings-container">
        {/* Tab navigation */}
        <div className="settings-sidebar" role="tablist" aria-label="Settings sections">
          {TABS.map((tab) => (
            <button
              type="button"
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`settings-panel-${tab.id}`}
              id={`settings-tab-${tab.id}`}
              className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <tab.icon size={18} aria-hidden="true" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="settings-content">
          <motion.div
            key={activeTab}
            id={`settings-panel-${activeTab}`}
            role="tabpanel"
            aria-labelledby={`settings-tab-${activeTab}`}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'appearance' && (
              <section className="settings-section">
                <h2 className="settings-section-title">Appearance</h2>
                <p className="settings-section-desc">Customize the interface theme.</p>

                <div className="settings-group">
                  <p className="settings-label" id="theme-preference-label">
                    Theme preference
                  </p>
                  <div
                    className="theme-options"
                    role="radiogroup"
                    aria-labelledby="theme-preference-label"
                  >
                    {THEME_OPTIONS.map((option) => (
                      <button
                        type="button"
                        key={option.id}
                        role="radio"
                        aria-checked={preference === option.id}
                        className={`theme-option-card ${preference === option.id ? 'active' : ''}`}
                        onClick={() => setPreference(option.id)}
                      >
                        <option.icon size={24} className="theme-option-icon" aria-hidden="true" />
                        <span>{option.label}</span>
                      </button>
                    ))}
                  </div>
                  <p className="settings-hint">
                    System follows your operating system setting and updates when it changes.
                  </p>
                </div>
              </section>
            )}

            {activeTab === 'model' && (
              <section className="settings-section">
                <h2 className="settings-section-title">Machine Learning Model</h2>
                <p className="settings-section-desc">
                  Configure the active prediction model and thresholds.
                </p>

                <div className="settings-group">
                  <label className="settings-label" htmlFor="active-model">
                    Active model
                  </label>
                  {/* .select-field supplies the chevron that `appearance: none`
                      strips; .settings-input alone left a bare box. */}
                  <select
                    id="active-model"
                    className="select-field settings-input"
                    value={settings.model.current}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        model: { ...settings.model, current: e.target.value },
                      })
                    }
                  >
                    <option value="random_forest">Random Forest (Recommended)</option>
                    <option value="decision_tree">Decision Tree</option>
                    <option value="logistic_regression">Logistic Regression</option>
                  </select>
                </div>

                <div className="settings-group">
                  {/* Was an inline-styled flex div with a magic 8px margin. */}
                  <div className="settings-label-row">
                    <label className="settings-label" htmlFor="confidence-threshold">
                      Confidence threshold
                    </label>
                    {/* aria-live="off" because <output> carries an implicit
                        role="status". Without it, dragging the slider queues an
                        announcement for every integer between 50 and 99 — and
                        the range input already announces its own value. */}
                    <output
                      className="settings-value"
                      htmlFor="confidence-threshold"
                      aria-live="off"
                    >
                      {settings.model.confidenceThreshold}%
                    </output>
                  </div>
                  <input
                    id="confidence-threshold"
                    type="range"
                    min="50"
                    max="99"
                    className="settings-range"
                    value={settings.model.confidenceThreshold}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        model: {
                          ...settings.model,
                          // Number(), not the raw string. The field was seeded
                          // as 75 and then overwritten with "75", so any
                          // arithmetic on it would concatenate.
                          confidenceThreshold: Number(e.target.value),
                        },
                      })
                    }
                  />
                  <p className="settings-hint">
                    Predictions below this confidence level will be marked as Suspicious rather
                    than Legitimate or Phishing.
                  </p>
                </div>
              </section>
            )}

            {activeTab === 'backend' && (
              <section className="settings-section">
                <h2 className="settings-section-title">Backend API</h2>
                <p className="settings-section-desc">
                  Configure connection settings for the Machine Learning inference API.
                </p>

                <div className="api-status-card connected">
                  <span className="api-status-icon" aria-hidden="true">
                    <CheckCircle2 size={24} />
                  </span>
                  <div>
                    <h3 className="api-status-title">API connected</h3>
                    <p className="api-status-desc">
                      Currently using mock data for frontend demonstration.
                    </p>
                  </div>
                </div>

                <div className="settings-group">
                  <label className="settings-label" htmlFor="api-url">
                    API endpoint URL
                  </label>
                  <input
                    id="api-url"
                    type="url"
                    className="settings-input"
                    value={settings.backend.apiUrl}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        backend: { ...settings.backend, apiUrl: e.target.value },
                      })
                    }
                  />
                </div>

                <div className="settings-group">
                  <label className="settings-label" htmlFor="api-timeout">
                    Request timeout (seconds)
                  </label>
                  <input
                    id="api-timeout"
                    type="number"
                    min="1"
                    max="300"
                    className="settings-input"
                    value={settings.backend.timeout}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        backend: { ...settings.backend, timeout: Number(e.target.value) },
                      })
                    }
                  />
                </div>
              </section>
            )}

            {activeTab === 'notifications' && (
              <section className="settings-section">
                <h2 className="settings-section-title">Notifications</h2>
                <p className="settings-section-desc">
                  Manage system alerts and toast notifications.
                </p>

                <div className="settings-toggle-group">
                  <div className="settings-toggle-info">
                    <h3 className="settings-toggle-title">Scan complete</h3>
                    <p className="settings-toggle-desc">
                      Show a notification when a URL scan finishes successfully.
                    </p>
                  </div>
                  <label className="toggle-switch">
                    <span className="sr-only">Notify when a scan completes</span>
                    <input
                      type="checkbox"
                      checked={settings.notifications.scanComplete}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          notifications: {
                            ...settings.notifications,
                            scanComplete: e.target.checked,
                          },
                        })
                      }
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>

                <div className="settings-toggle-group">
                  <div className="settings-toggle-info">
                    <h3 className="settings-toggle-title">High risk threats</h3>
                    <p className="settings-toggle-desc">
                      Alert immediately if a high-risk phishing site is detected during bulk scans.
                    </p>
                  </div>
                  <label className="toggle-switch">
                    <span className="sr-only">Alert on high risk threats</span>
                    <input
                      type="checkbox"
                      checked={settings.notifications.threatDetection}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          notifications: {
                            ...settings.notifications,
                            threatDetection: e.target.checked,
                          },
                        })
                      }
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </section>
            )}

            <div className="settings-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <span className="spinner" aria-hidden="true" /> Saving…
                  </>
                ) : (
                  <>
                    <Save size={18} aria-hidden="true" /> Save settings
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
