import { Outlet } from 'react-router-dom';
import Sidebar from '../Sidebar/Sidebar';
import './DashboardLayout.css';

const DashboardLayout = () => {
  return (
    <div className="dashboard-layout">
      <Sidebar />
      {/* A div, not a <main>. App.jsx already provides the single page-level
          <main>; nesting a second one broke landmark navigation on every
          dashboard route. */}
      <div className="dashboard-content">
        <Outlet />
      </div>
    </div>
  );
};

export default DashboardLayout;
