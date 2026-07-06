/**
 * Main App Component
 * ==================
 * Root component with routing and layout.
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useAuth } from './hooks/useAuth';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingSpinner from './components/LoadingSpinner';

// Auth Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';

// Main Pages
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import Gallery from './pages/Gallery';
import History from './pages/History';
import Analytics from './pages/Analytics';
import ModelInfo from './pages/ModelInfo';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Profile from './pages/Profile';

// Info Pages
import Documentation from './pages/Documentation';
import About from './pages/About';

import './index.css';

function App() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-page">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <Router>
      <div className="app">
        {/* Show navbar on all pages except auth pages */}
        {(isAuthenticated || !['/login', '/register', '/forgot-password'].includes(window.location.pathname)) && <Navbar />}
        
        <main className="main-content">
          <AnimatePresence mode="wait">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/documentation" element={<Documentation />} />
              <Route path="/about" element={<About />} />

              {/* Auth Routes */}
              <Route 
                path="/login" 
                element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} 
              />
              <Route 
                path="/register" 
                element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />} 
              />
              <Route 
                path="/forgot-password" 
                element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <ForgotPassword />} 
              />

              {/* Protected Routes */}
              <Route 
                path="/dashboard" 
                element={<ProtectedRoute><Dashboard /></ProtectedRoute>} 
              />
              <Route 
                path="/upload" 
                element={<ProtectedRoute><Upload /></ProtectedRoute>} 
              />
              <Route 
                path="/gallery" 
                element={<ProtectedRoute><Gallery /></ProtectedRoute>} 
              />
              <Route 
                path="/history" 
                element={<ProtectedRoute><History /></ProtectedRoute>} 
              />
              <Route 
                path="/analytics" 
                element={<ProtectedRoute><Analytics /></ProtectedRoute>} 
              />
              <Route 
                path="/model-info" 
                element={<ProtectedRoute><ModelInfo /></ProtectedRoute>} 
              />
              <Route 
                path="/reports" 
                element={<ProtectedRoute><Reports /></ProtectedRoute>} 
              />
              <Route 
                path="/settings" 
                element={<ProtectedRoute><Settings /></ProtectedRoute>} 
              />
              <Route 
                path="/profile" 
                element={<ProtectedRoute><Profile /></ProtectedRoute>} 
              />

              {/* Catch all - redirect to home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AnimatePresence>
        </main>
        
        {/* Show footer on public pages */}
        {!isAuthenticated && <Footer />}
      </div>
    </Router>
  );
}

export default App;
