/**
 * Profile Page
 * =============
 * User profile management and account settings.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Calendar, Edit2, Save, X, Lock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const { user, updateUserProfile, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  const [formData, setFormData] = useState({
    displayName: user?.displayName || '',
    email: user?.email || '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage('');

    try {
      const result = await updateUserProfile({
        displayName: formData.displayName,
      });

      if (result.success) {
        setMessage('Profile updated successfully!');
        setIsEditing(false);
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(result.error || 'Failed to update profile');
      }
    } catch (err) {
      setMessage('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      displayName: user?.displayName || '',
      email: user?.email || '',
    });
    setIsEditing(false);
  };

  const handleDeleteAccount = async () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      setLoading(true);
      const result = await deleteAccount();
      if (result.success) {
        navigate('/login');
      } else {
        setMessage(result.error || 'Failed to delete account');
        setLoading(false);
      }
    }
  };

  return (
    <div className="profile-page">
      <motion.div
        className="profile-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <User size={40} color="var(--color-primary)" />
        <div>
          <h1 className="page-title">Profile</h1>
          <p className="page-description">Manage your account information</p>
        </div>
      </motion.div>

      {/* Profile Card */}
      <motion.div
        className="profile-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="profile-avatar-section">
          <div className="profile-avatar">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Profile" />
            ) : (
              <div className="avatar-placeholder">
                {formData.displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="profile-basic">
            <h2>{formData.displayName || 'User'}</h2>
            <p>{formData.email}</p>
            <p className="member-since">
              <Calendar size={14} />
              Member since {user?.metadata?.createdAt ? new Date(user.metadata.createdAt).toLocaleDateString() : 'Recently'}
            </p>
          </div>
        </div>

        {message && (
          <motion.div
            className={`alert ${message.includes('successfully') ? 'alert-success' : 'alert-error'}`}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {message}
          </motion.div>
        )}

        {!isEditing ? (
          <motion.div
            className="profile-info"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="info-row">
              <label>Full Name</label>
              <span>{formData.displayName || '-'}</span>
            </div>

            <div className="info-row">
              <label>Email Address</label>
              <span>{formData.email}</span>
            </div>

            <button
              className="btn btn-primary edit-btn"
              onClick={() => setIsEditing(true)}
            >
              <Edit2 size={18} />
              Edit Profile
            </button>
          </motion.div>
        ) : (
          <motion.form
            className="profile-form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onSubmit={(e) => { e.preventDefault(); handleSave(); }}
          >
            <div className="form-group">
              <label htmlFor="displayName">Full Name</label>
              <input
                type="text"
                id="displayName"
                name="displayName"
                value={formData.displayName}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                disabled
              />
              <small>Email cannot be changed here</small>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                <Save size={18} />
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={handleCancel} disabled={loading}>
                <X size={18} />
                Cancel
              </button>
            </div>
          </motion.form>
        )}
      </motion.div>

      {/* Account Sections */}
      <motion.div
        className="account-sections"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {/* Security Section */}
        <div className="account-section">
          <div className="section-header">
            <Lock size={24} />
            <h3>Security</h3>
          </div>
          <button className="btn btn-secondary" onClick={() => alert('Change Password functionality coming soon!')}>
            Change Password
          </button>
          <button className="btn btn-secondary" onClick={() => alert('Two-Factor Authentication coming soon!')}>
            Two-Factor Authentication
          </button>
        </div>

        {/* Stats Section */}
        <div className="account-section">
          <div className="section-header">
            <h3>Account Statistics</h3>
          </div>
          <div className="stats-info">
            <div className="stat">
              <span className="stat-label">Total Images Enhanced</span>
              <span className="stat-value">42</span>
            </div>
            <div className="stat">
              <span className="stat-label">Storage Used</span>
              <span className="stat-value">2.4 GB</span>
            </div>
            <div className="stat">
              <span className="stat-label">Average Processing Time</span>
              <span className="stat-value">2.1s</span>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="account-section danger-zone">
          <div className="section-header">
            <h3>Danger Zone</h3>
          </div>
          <p>Permanently delete your account and all associated data</p>
          <button className="btn btn-error" onClick={handleDeleteAccount} disabled={loading}>
            Delete Account
          </button>
        </div>
      </motion.div>

      <style jsx>{`
        .profile-page {
          padding: 2rem;
          min-height: calc(100vh - 80px);
          background: var(--color-bg-primary);
          max-width: 900px;
          margin: 0 auto;
        }

        .profile-header {
          display: flex;
          align-items: center;
          gap: 2rem;
          margin-bottom: 3rem;
        }

        .page-title {
          font-size: 2.5rem;
          margin-bottom: 0.5rem;
        }

        .page-description {
          font-size: 1.125rem;
          color: var(--color-text-secondary);
        }

        .profile-card {
          padding: 2rem;
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          margin-bottom: 2rem;
        }

        .profile-avatar-section {
          display: flex;
          align-items: center;
          gap: 2rem;
          margin-bottom: 2rem;
          padding-bottom: 2rem;
          border-bottom: 1px solid var(--color-border);
        }

        .profile-avatar {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          overflow: hidden;
        }

        .profile-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .avatar-placeholder {
          font-size: 3rem;
          font-weight: 700;
          color: white;
        }

        .profile-basic h2 {
          margin: 0 0 0.5rem 0;
          font-size: 1.5rem;
        }

        .profile-basic p {
          margin: 0 0 0.25rem 0;
          color: var(--color-text-secondary);
        }

        .member-since {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          color: var(--color-text-tertiary);
        }

        .alert {
          padding: 1rem;
          border-radius: var(--radius-md);
          margin-bottom: 1.5rem;
        }

        .alert-success {
          background: var(--color-success);
          color: white;
        }

        .alert-error {
          background: var(--color-error);
          color: white;
        }

        .profile-info {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          background: var(--color-bg-tertiary);
          border-radius: var(--radius-md);
        }

        .info-row label {
          font-weight: 600;
          color: var(--color-text-secondary);
        }

        .info-row span {
          color: var(--color-text-primary);
        }

        .edit-btn {
          margin-top: 1rem;
          align-self: flex-start;
        }

        .profile-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group label {
          font-weight: 600;
          color: var(--color-text-primary);
        }

        .form-group input {
          padding: 0.75rem;
          background: var(--color-bg-tertiary);
          color: var(--color-text-primary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          font-size: 1rem;
        }

        .form-group input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .form-group small {
          color: var(--color-text-tertiary);
          font-size: 0.75rem;
        }

        .form-actions {
          display: flex;
          gap: 1rem;
          margin-top: 1rem;
        }

        .btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: var(--radius-md);
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .btn-primary {
          background: var(--color-primary);
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: var(--color-primary-dark);
          transform: translateY(-2px);
        }

        .btn-secondary {
          background: var(--color-bg-tertiary);
          color: var(--color-text-primary);
          border: 1px solid var(--color-border);
        }

        .btn-secondary:hover {
          background: var(--color-border);
        }

        .btn-error {
          background: var(--color-error);
          color: white;
        }

        .btn-error:hover {
          background: #dc2626;
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .account-sections {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 2rem;
        }

        .account-section {
          padding: 2rem;
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
        }

        .account-section.danger-zone {
          border-color: var(--color-error);
          background: var(--color-error);
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.05));
        }

        .section-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .section-header h3 {
          margin: 0;
          font-size: 1.125rem;
        }

        .account-section .btn {
          display: block;
          width: 100%;
          margin-bottom: 0.5rem;
          justify-content: center;
        }

        .account-section p {
          margin-bottom: 1rem;
          color: var(--color-text-secondary);
        }

        .stats-info {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
        }

        .stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 1rem;
          background: var(--color-bg-tertiary);
          border-radius: var(--radius-md);
          text-align: center;
        }

        .stat-label {
          font-size: 0.75rem;
          color: var(--color-text-secondary);
          margin-bottom: 0.5rem;
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--color-primary);
        }

        @media (max-width: 768px) {
          .profile-page {
            padding: 1rem;
          }

          .profile-avatar-section {
            flex-direction: column;
            text-align: center;
          }

          .form-actions {
            flex-direction: column;
          }

          .account-sections {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
