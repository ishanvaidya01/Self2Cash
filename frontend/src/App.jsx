import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore } from './store/appStore';

// Screens
import Dashboard from './screens/Dashboard';
import Inventory from './screens/Inventory';
import Capital from './screens/Capital';
import Recommendations from './screens/Recommendations';
import Simulator from './screens/Simulator';
import Camera from './screens/Camera';
import Khata from './screens/Khata';
import CreditScore from './screens/CreditScore';
import Mesh from './screens/Mesh';
import Factoring from './screens/Factoring';

const NAV_ITEMS = [
  { path: '/', label: 'Home', icon: '⬡' },
  { path: '/inventory', label: 'Stock', icon: '📦' },
  { path: '/capital', label: 'Capital', icon: '💰' },
  { path: '/mesh', label: 'Mesh', icon: '🕸' },
  { path: '/more', label: 'More', icon: '⋯', isMore: true },
];

function App() {
  const location = useLocation();
  const { initWebSocket, wsConnected, alertCount } = useAppStore();

  useEffect(() => {
    initWebSocket();
  }, []);

  return (
    <div className="app-container">
      {/* Top bar */}
      <div className="topbar">
        <span className="topbar-logo">Shelf2Cash</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: wsConnected ? 'var(--signal-green)' : 'var(--signal-red)',
            boxShadow: wsConnected ? 'var(--shadow-glow-green)' : 'none'
          }} title={wsConnected ? 'Live' : 'Offline'} />
          {alertCount > 0 && (
            <NavLink to="/inventory" style={{ textDecoration: 'none' }}>
              <div className="chip chip-red">{alertCount} alert{alertCount > 1 ? 's' : ''}</div>
            </NavLink>
          )}
        </div>
      </div>

      {/* Screen content with page transitions */}
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          style={{ flex: 1 }}
        >
          <Routes location={location}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/capital" element={<Capital />} />
            <Route path="/recommendations" element={<Recommendations />} />
            <Route path="/simulator" element={<Simulator />} />
            <Route path="/camera" element={<Camera />} />
            <Route path="/khata" element={<Khata />} />
            <Route path="/credit-score" element={<CreditScore />} />
            <Route path="/mesh" element={<Mesh />} />
            <Route path="/factoring" element={<Factoring />} />
          </Routes>
        </motion.div>
      </AnimatePresence>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
          <span className="nav-icon">🏠</span>
          <span>Health</span>
        </NavLink>
        <NavLink to="/inventory" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">📦</span>
          <span>Stock</span>
        </NavLink>
        <NavLink to="/recommendations" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">💡</span>
          <span>Actions</span>
        </NavLink>
        <NavLink to="/mesh" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">🕸</span>
          <span>Mesh</span>
        </NavLink>
        <NavLink to="/capital" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">💰</span>
          <span>Capital</span>
        </NavLink>
      </nav>
    </div>
  );
}

export default App;
