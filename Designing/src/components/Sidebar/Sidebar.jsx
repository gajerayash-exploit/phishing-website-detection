import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Search,
  BarChart2,
  BrainCircuit,
  History,
  Settings,
  Upload,
} from 'lucide-react';
import { useNav } from '../../context/NavContext';
import './Sidebar.css';

// Grouped so the rail communicates structure, not just a flat list of links.
const SECTIONS = [
  {
    title: 'Main',
    links: [
      { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
      { to: '/scanner', label: 'URL Scanner', icon: Search },
      { to: '/bulk-scanner', label: 'Bulk Scanner', icon: Upload },
    ],
  },
  {
    title: 'Analysis',
    links: [
      { to: '/analytics', label: 'Analytics', icon: BarChart2 },
      { to: '/model-insights', label: 'Model Insights', icon: BrainCircuit },
      { to: '/history', label: 'Scan History', icon: History },
    ],
  },
  {
    title: 'System',
    links: [{ to: '/settings', label: 'Settings', icon: Settings }],
  },
];

const Sidebar = () => {
  const { isOpen, isMobile, close } = useNav();

  // Drawer mode is the only mode where the sidebar is hidden by default, so
  // it's the only mode where it must be removed from the tab order. Previously
  // the panel was moved off-screen with translateX(-100%) while staying fully
  // focusable — keyboard users tabbed into six invisible links.
  const isHidden = isMobile && !isOpen;

  return (
    <>
      {/* Backdrop is mobile-only and purely decorative; Escape and the navbar's
          close button are the accessible affordances, so it's aria-hidden. */}
      <div
        className={`sidebar-backdrop ${isOpen ? 'is-visible' : ''}`}
        onClick={close}
        aria-hidden="true"
      />

      <aside
        id="dashboard-sidebar"
        className={`sidebar ${isOpen ? 'is-open' : ''}`}
        inert={isHidden}
      >
        {/* Labelled because dashboard routes have two nav landmarks (the top bar
            and this one) and both were previously anonymous. */}
        <nav className="sidebar-nav" aria-label="Dashboard sections">
          {SECTIONS.map((section) => (
            <div className="sidebar-section" key={section.title}>
              <h2 className="sidebar-section-title">{section.title}</h2>
              {section.links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                  onClick={close}
                  /* In rail mode the label is visually hidden but stays in the
                     accessibility tree, so the link keeps its name. The old
                     `display: none` stripped it entirely, leaving every rail
                     link announced as an unlabelled link. */
                  title={link.label}
                >
                  <link.icon className="sidebar-icon" size={20} aria-hidden="true" />
                  <span className="sidebar-label">{link.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span className="sidebar-version">v1.0.0</span>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
