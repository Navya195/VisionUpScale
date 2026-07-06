/**
 * Navbar Component
 * ================
 * Navigation bar with logo, links, auth state, and theme toggle.
 */

import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Home, Upload, BookOpen, Info, Sun, Moon, LogOut, User, BarChart3 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const [theme, setTheme] = useState('dark');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);
  
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
    setShowUserMenu(false);
  };
  
  const publicNavLinks = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/documentation', label: 'Docs', icon: BookOpen },
    { path: '/about', label: 'About', icon: Info }
  ];

  const authenticatedNavLinks = [
    { path: '/dashboard', label: 'Dashboard', icon: BarChart3 },
    { path: '/upload', label: 'Upscale', icon: Upload },
    { path: '/gallery', label: 'Gallery', icon: BookOpen },
    { path: '/analytics', label: 'Analytics', icon: BarChart3 }
  ];
  
  const navLinks = isAuthenticated ? authenticatedNavLinks : publicNavLinks;
  
  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo */}
        <Link to={isAuthenticated ? '/dashboard' : '/'} className="navbar-logo">
          <motion.div
            whileHover={{ rotate: 180, scale: 1.1 }}
            transition={{ duration: 0.3 }}
          >
            <Sparkles size={28} strokeWidth={2} />
          </motion.div>
          <span className="navbar-title">VisionUpscale</span>
        </Link>
        
        {/* Desktop Navigation */}
        <div className="navbar-links desktop">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`navbar-link ${location.pathname === link.path ? 'active' : ''}`}
            >
              <link.icon size={18} />
              <span>{link.label}</span>
              {location.pathname === link.path && (
                <motion.div
                  className="navbar-link-indicator"
                  layoutId="navbar-indicator"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
            </Link>
          ))}
        </div>

        {/* Right Side Items */}
        <div className="navbar-right">
          {/* Theme Toggle */}
          <motion.button
            className="theme-toggle"
            onClick={toggleTheme}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </motion.button>

          {/* Auth Buttons */}
          {isAuthenticated ? (
            <div className="user-menu-container">
              <motion.button
                className="user-button"
                onClick={() => setShowUserMenu(!showUserMenu)}
                whileHover={{ scale: 1.05 }}
              >
                <User size={20} />
                <span>{user?.displayName || 'User'}</span>
              </motion.button>

              {showUserMenu && (
                <motion.div
                  className="user-dropdown"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Link to="/profile" className="dropdown-item" onClick={() => setShowUserMenu(false)}>
                    <User size={18} />
                    Profile
                  </Link>
                  <Link to="/settings" className="dropdown-item" onClick={() => setShowUserMenu(false)}>
                    <Sparkles size={18} />
                    Settings
                  </Link>
                  <button className="dropdown-item logout" onClick={handleLogout}>
                    <LogOut size={18} />
                    Logout
                  </button>
                </motion.div>
              )}
            </div>
          ) : (
            <div className="auth-buttons">
              <Link to="/login" className="btn-nav btn-secondary">
                Login
              </Link>
              <Link to="/register" className="btn-nav btn-primary">
                Sign Up
              </Link>
            </div>
          )}
        </div>
        
        {/* Mobile Menu Button */}
        <button
          className="mobile-menu-button"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
      
      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <motion.div
          className="navbar-mobile"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`navbar-mobile-link ${location.pathname === link.path ? 'active' : ''}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <link.icon size={20} />
              <span>{link.label}</span>
            </Link>
          ))}
          
          {isAuthenticated && (
            <>
              <Link to="/profile" className="navbar-mobile-link" onClick={() => setIsMobileMenuOpen(false)}>
                <User size={20} />
                <span>Profile</span>
              </Link>
              <Link to="/settings" className="navbar-mobile-link" onClick={() => setIsMobileMenuOpen(false)}>
                <Sparkles size={20} />
                <span>Settings</span>
              </Link>
              <button className="navbar-mobile-link logout" onClick={handleLogout}>
                <LogOut size={20} />
                <span>Logout</span>
              </button>
            </>
          )}

          {!isAuthenticated && (
            <div className="mobile-auth-buttons">
              <Link to="/login" className="btn-nav btn-secondary">
                Login
              </Link>
              <Link to="/register" className="btn-nav btn-primary">
                Sign Up
              </Link>
            </div>
          )}
        </motion.div>
      )}

      <style jsx>{`
        .navbar-right {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .user-menu-container {
          position: relative;
        }

        .user-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: var(--color-bg-tertiary);
          color: var(--color-text-primary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all var(--transition-fast);
          font-size: 0.875rem;
          font-weight: 600;
        }

        .user-button:hover {
          background: var(--color-primary);
          color: white;
          border-color: var(--color-primary);
        }

        .user-dropdown {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 0.5rem;
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          min-width: 180px;
          box-shadow: var(--shadow-lg);
          z-index: 1000;
        }

        .dropdown-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          width: 100%;
          padding: 0.75rem 1rem;
          background: none;
          border: none;
          color: var(--color-text-primary);
          cursor: pointer;
          text-align: left;
          text-decoration: none;
          transition: all var(--transition-fast);
        }

        .dropdown-item:hover {
          background: var(--color-bg-tertiary);
          color: var(--color-primary);
        }

        .dropdown-item.logout:hover {
          background: var(--color-error);
          color: white;
        }

        .auth-buttons {
          display: flex;
          gap: 0.75rem;
          align-items: center;
        }

        .btn-nav {
          padding: 0.5rem 1rem;
          border-radius: var(--radius-md);
          font-weight: 600;
          text-decoration: none;
          font-size: 0.875rem;
          transition: all var(--transition-fast);
          cursor: pointer;
          border: none;
          display: inline-block;
        }

        .btn-primary {
          background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
          color: white;
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }

        .btn-secondary {
          background: var(--color-bg-tertiary);
          color: var(--color-text-primary);
          border: 1px solid var(--color-border);
        }

        .btn-secondary:hover {
          background: var(--color-border);
        }

        .mobile-auth-buttons {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding: 1rem;
          border-top: 1px solid var(--color-border);
        }

        .mobile-auth-buttons .btn-nav {
          width: 100%;
          text-align: center;
        }

        .navbar-mobile-link.logout {
          background: none;
          border: none;
          padding: 0.75rem 1rem;
          color: var(--color-error);
        }

        .navbar-mobile-link.logout:hover {
          background: var(--color-bg-tertiary);
        }

        @media (max-width: 768px) {
          .auth-buttons {
            display: none;
          }
        }
      `}</style>
    </nav>
  );
}
