/**
 * Dashboard Page
 * ==============
 * Main dashboard with overview, stats, and recent activity.
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  BarChart3, ImageIcon, Zap, Clock, RotateCw, 
  Settings, HelpCircle, LogOut, Menu, X,
  TrendingUp, Users, Database, Activity
} from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [stats, setStats] = useState({
    totalImages: 1,
    successRate: 98,
    avgTime: 2.3,
    storageUsed: 245
  });

  useEffect(() => {
    // Simulate loading stats
    const timer = setTimeout(() => {
      setStats({
        totalImages: 42,
        successRate: 98.5,
        avgTime: 2.3,
        storageUsed: 2.4
      });
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const recentEnhancements = [
    { id: 1, name: 'landscape.jpg', date: 'Today', time: '2.1s', scale: '4×' },
    { id: 2, name: 'portrait.png', date: 'Yesterday', time: '2.5s', scale: '4×' },
    { id: 3, name: 'artwork.jpg', date: '2 days ago', time: '2.0s', scale: '4×' }
  ];

  const sidebarItems = [
    { icon: BarChart3, label: 'Dashboard', path: '/dashboard', active: true },
    { icon: ImageIcon, label: 'Enhancement', path: '/upload' },
    { icon: RotateCw, label: 'Gallery', path: '/gallery' },
    { icon: Activity, label: 'History', path: '/history' },
    { icon: TrendingUp, label: 'Analytics', path: '/analytics' },
    { icon: Database, label: 'Model Info', path: '/model-info' },
    { icon: Settings, label: 'Settings', path: '/settings' },
    { icon: HelpCircle, label: 'Help', path: '/documentation' }
  ];

  return (
    <div className="dashboard">
      {/* Sidebar */}
      <motion.aside 
        className={`sidebar ${isSidebarOpen ? 'open' : ''}`}
        initial={{ x: -250 }}
        animate={{ x: 0 }}
      >
        <div className="sidebar-header">
          <h2>VisionUpscale</h2>
          <button 
            className="close-btn"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {sidebarItems.map((item, idx) => (
            <motion.div 
              key={idx}
              onClick={() => navigate(item.path)}
              className={`nav-item ${item.active ? 'active' : ''}`}
              whileHover={{ x: 5 }}
              style={{ cursor: 'pointer' }}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </motion.div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <motion.button 
            className="logout-btn"
            whileHover={{ scale: 1.05 }}
            onClick={async () => {
              await logout();
              navigate('/login');
            }}
          >
            <LogOut size={18} />
            <span>Logout</span>
          </motion.button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Top Bar */}
        <div className="dashboard-topbar">
          <button 
            className="menu-toggle"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            <Menu size={24} />
          </button>
          
          <div className="topbar-right">
            <input 
              type="text" 
              placeholder="Search..." 
              className="search-input"
            />
            <div className="user-menu">
              <img src="/api/placeholder/32/32" alt="User" className="user-avatar" />
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="dashboard-content">
          {/* Welcome Card */}
          <motion.div 
            className="welcome-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="welcome-text">
              <h1>Welcome back! 👋</h1>
              <p>You have {stats.totalImages} images enhanced so far.</p>
            </div>
            <motion.button 
              className="btn btn-primary"
              whileHover={{ scale: 1.05 }}
              onClick={() => navigate('/upload')}
            >
              <ImageIcon size={18} />
              Start New Enhancement
            </motion.button>
          </motion.div>

          {/* Stats Grid */}
          <div className="stats-grid">
            {[
              { icon: ImageIcon, label: 'Total Images', value: stats.totalImages, color: 'blue' },
              { icon: TrendingUp, label: 'Success Rate', value: `${stats.successRate}%`, color: 'green' },
              { icon: Zap, label: 'Avg Time', value: `${stats.avgTime}s`, color: 'purple' },
              { icon: Database, label: 'Storage', value: `${stats.storageUsed}GB`, color: 'orange' }
            ].map((stat, idx) => (
              <motion.div
                key={idx}
                className={`stat-card ${stat.color}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ translateY: -5 }}
              >
                <stat.icon size={32} />
                <div className="stat-info">
                  <p className="stat-label">{stat.label}</p>
                  <p className="stat-value">{stat.value}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Recent Enhancements */}
          <motion.div 
            className="recent-section"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <h2>Recent Enhancements</h2>
            
            <div className="recent-list">
              {recentEnhancements.map((item, idx) => (
                <motion.div
                  key={item.id}
                  className="recent-item"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + idx * 0.1 }}
                  whileHover={{ backgroundColor: 'var(--color-bg-tertiary)' }}
                >
                  <div className="recent-info">
                    <p className="recent-name">{item.name}</p>
                    <p className="recent-meta">{item.date} • {item.time}</p>
                  </div>
                  <div className="recent-scale">
                    <span className="scale-badge">{item.scale}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </main>

      <style jsx>{`
        .dashboard {
          display: flex;
          min-height: 100vh;
          background: var(--color-bg-primary);
        }

        .sidebar {
          position: fixed;
          left: 0;
          top: 0;
          width: 250px;
          height: 100vh;
          background: var(--color-bg-secondary);
          border-right: 1px solid var(--color-border);
          display: flex;
          flex-direction: column;
          z-index: 1000;
        }

        .sidebar-header {
          padding: 1.5rem;
          border-bottom: 1px solid var(--color-border);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .sidebar-header h2 {
          font-size: 1.25rem;
          margin: 0;
        }

        .close-btn {
          background: none;
          border: none;
          color: var(--color-text-primary);
          cursor: pointer;
          display: none;
        }

        .sidebar-nav {
          flex: 1;
          padding: 1rem 0;
          display: flex;
          flex-direction: column;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem 1.5rem;
          color: var(--color-text-secondary);
          text-decoration: none;
          transition: all 0.3s ease;
        }

        .nav-item:hover,
        .nav-item.active {
          color: var(--color-primary);
          background: var(--color-bg-tertiary);
        }

        .sidebar-footer {
          padding: 1rem;
          border-top: 1px solid var(--color-border);
        }

        .logout-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem;
          background: var(--color-error);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          cursor: pointer;
          font-weight: 500;
        }

        .dashboard-main {
          margin-left: 250px;
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .dashboard-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 2rem;
          background: var(--color-bg-secondary);
          border-bottom: 1px solid var(--color-border);
        }

        .menu-toggle {
          display: none;
          background: none;
          border: none;
          color: var(--color-text-primary);
          cursor: pointer;
        }

        .search-input {
          padding: 0.5rem 1rem;
          background: var(--color-bg-tertiary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          color: var(--color-text-primary);
          width: 300px;
        }

        .topbar-right {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .user-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          cursor: pointer;
        }

        .dashboard-content {
          flex: 1;
          padding: 2rem;
          overflow-y: auto;
        }

        .welcome-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 2rem;
          background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
          border-radius: var(--radius-lg);
          margin-bottom: 2rem;
          color: white;
        }

        .welcome-text h1 {
          margin: 0 0 0.5rem 0;
          font-size: 1.75rem;
          color: white;
        }

        .welcome-text p {
          margin: 0;
          opacity: 0.9;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          padding: 1.5rem;
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .stat-card.blue svg { color: #3b82f6; }
        .stat-card.green svg { color: #10b981; }
        .stat-card.purple svg { color: #8b5cf6; }
        .stat-card.orange svg { color: #f59e0b; }

        .stat-info {
          flex: 1;
        }

        .stat-label {
          font-size: 0.875rem;
          color: var(--color-text-secondary);
          margin: 0 0 0.25rem 0;
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0;
        }

        .recent-section {
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: 1.5rem;
        }

        .recent-section h2 {
          margin: 0 0 1rem 0;
          font-size: 1.25rem;
        }

        .recent-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .recent-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          border-radius: var(--radius-md);
          transition: background 0.3s ease;
        }

        .recent-name {
          font-weight: 600;
          margin: 0 0 0.25rem 0;
        }

        .recent-meta {
          font-size: 0.875rem;
          color: var(--color-text-secondary);
          margin: 0;
        }

        .scale-badge {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          background: var(--color-primary);
          color: white;
          border-radius: var(--radius-full);
          font-size: 0.875rem;
          font-weight: 600;
        }

        @media (max-width: 768px) {
          .sidebar {
            transform: translateX(-100%);
            transition: transform 0.3s ease;
          }

          .sidebar.open {
            transform: translateX(0);
          }

          .dashboard-main {
            margin-left: 0;
          }

          .menu-toggle {
            display: block;
          }

          .close-btn {
            display: block;
          }

          .search-input {
            width: 100%;
          }

          .welcome-card {
            flex-direction: column;
            text-align: center;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </div>
  );
}
