/**
 * Settings Page
 * =============
 * User preferences and application settings.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SettingsIcon, Bell, Lock, Eye, Globe, Palette, LogOut, Shield, Smartphone, Monitor, ChevronDown, ChevronUp, Check, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
  const navigate = useNavigate();
  const { logout, changePassword } = useAuth();

  // Security state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState({ current: '', newPass: '', confirm: '' });
  const [passwordMsg, setPasswordMsg] = useState({ text: '', type: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showSessions, setShowSessions] = useState(false);

  const mockSessions = [
    { id: 1, device: 'Chrome on Windows', ip: '192.168.1.10', lastActive: 'Now', current: true },
    { id: 2, device: 'Safari on iPhone', ip: '192.168.1.15', lastActive: '2 hours ago', current: false },
    { id: 3, device: 'Firefox on MacOS', ip: '10.0.0.42', lastActive: '3 days ago', current: false },
  ];

  const [sessions, setSessions] = useState(mockSessions);
  
  const [settings, setSettings] = useState({
    theme: 'dark',
    language: 'en',
    notifications: true,
    emailNotifications: true,
    privacy: 'private',
    autoSave: true,
  });

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setSettings(prev => ({ ...prev, theme: savedTheme }));
  }, []);

  const [saved, setSaved] = useState(false);

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    // Save settings logic
    const themeToApply = settings.theme === 'auto' ? 'dark' : settings.theme;
    localStorage.setItem('theme', themeToApply);
    document.documentElement.setAttribute('data-theme', themeToApply);
    
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleChangePassword = async () => {
    if (passwordData.newPass !== passwordData.confirm) {
      setPasswordMsg({ text: 'New passwords do not match.', type: 'error' });
      return;
    }
    if (passwordData.newPass.length < 6) {
      setPasswordMsg({ text: 'Password must be at least 6 characters.', type: 'error' });
      return;
    }
    setPasswordLoading(true);
    setPasswordMsg({ text: '', type: '' });
    const result = await changePassword(passwordData.newPass);
    if (result.success) {
      setPasswordMsg({ text: 'Password changed successfully!', type: 'success' });
      setPasswordData({ current: '', newPass: '', confirm: '' });
      setTimeout(() => { setShowPasswordForm(false); setPasswordMsg({ text: '', type: '' }); }, 2000);
    } else {
      setPasswordMsg({ text: result.error || 'Failed to change password.', type: 'error' });
    }
    setPasswordLoading(false);
  };

  const handleRevokeSession = (id) => {
    setSessions(prev => prev.filter(s => s.id !== id));
  };

  const handleToggle2FA = () => {
    setTwoFactorEnabled(prev => !prev);
  };

  return (
    <div className="settings-page">
      <motion.div
        className="settings-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <SettingsIcon size={40} color="var(--color-primary)" />
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-description">Manage your preferences and account</p>
        </div>
      </motion.div>

      {/* Appearance */}
      <motion.div
        className="settings-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="section-header">
          <Palette size={24} />
          <h2>Appearance</h2>
        </div>

        <div className="settings-group">
          <div className="setting-item">
            <label>Theme</label>
            <select 
              value={settings.theme}
              onChange={(e) => handleSettingChange('theme', e.target.value)}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="auto">Auto (System)</option>
            </select>
          </div>

          <div className="setting-item">
            <label>Language</label>
            <select 
              value={settings.language}
              onChange={(e) => handleSettingChange('language', e.target.value)}
            >
              <option value="en">English</option>
              <option value="ja">日本語</option>
              <option value="zh">中文</option>
              <option value="es">Español</option>
            </select>
          </div>
        </div>
      </motion.div>

      {/* Notifications */}
      <motion.div
        className="settings-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="section-header">
          <Bell size={24} />
          <h2>Notifications</h2>
        </div>

        <div className="settings-group">
          <div className="setting-item checkbox">
            <input
              type="checkbox"
              id="notifications"
              checked={settings.notifications}
              onChange={(e) => handleSettingChange('notifications', e.target.checked)}
            />
            <label htmlFor="notifications">Enable in-app notifications</label>
          </div>

          <div className="setting-item checkbox">
            <input
              type="checkbox"
              id="emailNotifications"
              checked={settings.emailNotifications}
              onChange={(e) => handleSettingChange('emailNotifications', e.target.checked)}
            />
            <label htmlFor="emailNotifications">Send email notifications</label>
          </div>
        </div>
      </motion.div>

      {/* Privacy */}
      <motion.div
        className="settings-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="section-header">
          <Eye size={24} />
          <h2>Privacy</h2>
        </div>

        <div className="settings-group">
          <div className="setting-item">
            <label>Profile Visibility</label>
            <select 
              value={settings.privacy}
              onChange={(e) => handleSettingChange('privacy', e.target.value)}
            >
              <option value="private">Private</option>
              <option value="friends">Friends Only</option>
              <option value="public">Public</option>
            </select>
          </div>

          <div className="setting-item checkbox">
            <input
              type="checkbox"
              id="autoSave"
              checked={settings.autoSave}
              onChange={(e) => handleSettingChange('autoSave', e.target.checked)}
            />
            <label htmlFor="autoSave">Auto-save settings</label>
          </div>
        </div>
      </motion.div>

      {/* Security */}
      <motion.div
        className="settings-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="section-header">
          <Lock size={24} />
          <h2>Security</h2>
        </div>

        <div className="settings-group">
          {/* Change Password */}
          <button className="btn btn-secondary" onClick={() => setShowPasswordForm(!showPasswordForm)}>
            <Lock size={16} />
            Change Password
            {showPasswordForm ? <ChevronUp size={16} style={{ marginLeft: 'auto' }} /> : <ChevronDown size={16} style={{ marginLeft: 'auto' }} />}
          </button>

          <AnimatePresence>
            {showPasswordForm && (
              <motion.div
                className="security-form"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                style={{ overflow: 'hidden' }}
              >
                {passwordMsg.text && (
                  <div className={`alert ${passwordMsg.type === 'success' ? 'alert-success' : 'alert-error'}`}>
                    {passwordMsg.text}
                  </div>
                )}
                <div className="setting-item">
                  <label>Current Password</label>
                  <input
                    type="password"
                    placeholder="Enter current password"
                    value={passwordData.current}
                    onChange={(e) => setPasswordData(p => ({ ...p, current: e.target.value }))}
                    style={{ padding: '0.75rem', background: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '1rem', width: '100%' }}
                  />
                </div>
                <div className="setting-item">
                  <label>New Password</label>
                  <input
                    type="password"
                    placeholder="Enter new password (min 6 chars)"
                    value={passwordData.newPass}
                    onChange={(e) => setPasswordData(p => ({ ...p, newPass: e.target.value }))}
                    style={{ padding: '0.75rem', background: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '1rem', width: '100%' }}
                  />
                </div>
                <div className="setting-item">
                  <label>Confirm New Password</label>
                  <input
                    type="password"
                    placeholder="Re-enter new password"
                    value={passwordData.confirm}
                    onChange={(e) => setPasswordData(p => ({ ...p, confirm: e.target.value }))}
                    style={{ padding: '0.75rem', background: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '1rem', width: '100%' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button className="btn btn-primary" onClick={handleChangePassword} disabled={passwordLoading}>
                    <Check size={16} />
                    {passwordLoading ? 'Saving...' : 'Update Password'}
                  </button>
                  <button className="btn btn-secondary" onClick={() => { setShowPasswordForm(false); setPasswordMsg({ text: '', type: '' }); }}>
                    <X size={16} /> Cancel
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Two-Factor Authentication */}
          <div className="security-toggle-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
              <Shield size={18} color="var(--color-primary)" />
              <div>
                <p style={{ margin: 0, fontWeight: 600 }}>Two-Factor Authentication</p>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                  {twoFactorEnabled ? 'Enabled — your account is more secure' : 'Add an extra layer of security'}
                </p>
              </div>
            </div>
            <button
              className={`toggle-switch ${twoFactorEnabled ? 'active' : ''}`}
              onClick={handleToggle2FA}
              aria-label="Toggle two-factor authentication"
            >
              <span className="toggle-thumb" />
            </button>
          </div>

          {/* Manage Sessions */}
          <button className="btn btn-secondary" onClick={() => setShowSessions(!showSessions)}>
            <Monitor size={16} />
            Manage Sessions
            {showSessions ? <ChevronUp size={16} style={{ marginLeft: 'auto' }} /> : <ChevronDown size={16} style={{ marginLeft: 'auto' }} />}
          </button>

          <AnimatePresence>
            {showSessions && (
              <motion.div
                className="sessions-list"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                style={{ overflow: 'hidden' }}
              >
                {sessions.map(session => (
                  <div key={session.id} className="session-item">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0, overflow: 'hidden' }}>
                      {session.device.includes('iPhone') ? <Smartphone size={18} style={{ flexShrink: 0 }} /> : <Monitor size={18} style={{ flexShrink: 0 }} />}
                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{session.device}</p>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                          IP: {session.ip} · {session.lastActive}
                        </p>
                      </div>
                    </div>
                    {session.current ? (
                      <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem', background: 'var(--color-success)', color: 'white', borderRadius: '999px', fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}>Current</span>
                    ) : (
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', flexShrink: 0, whiteSpace: 'nowrap' }}
                        onClick={() => handleRevokeSession(session.id)}
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Actions */}
      <motion.div
        className="settings-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="settings-actions">
          {saved && (
            <motion.div
              className="alert alert-success"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              Settings saved successfully!
            </motion.div>
          )}

          <button className="btn btn-primary" onClick={handleSave}>
            Save Settings
          </button>

          <button className="btn btn-error" onClick={handleLogout}>
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </motion.div>

      <style jsx>{`
        .settings-page {
          padding: 2rem;
          min-height: calc(100vh - 80px);
          background: var(--color-bg-primary);
          max-width: 900px;
          margin: 0 auto;
        }

        .settings-header {
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

        .settings-section {
          margin-bottom: 2rem;
          padding: 2rem;
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
        }

        .section-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .section-header svg {
          color: var(--color-primary);
        }

        .section-header h2 {
          margin: 0;
          font-size: 1.25rem;
        }

        .settings-group {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .setting-item {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .setting-item label {
          font-weight: 600;
          color: var(--color-text-primary);
        }

        .setting-item select,
        .setting-item input[type="text"],
        .setting-item input[type="email"] {
          padding: 0.75rem;
          background: var(--color-bg-tertiary);
          color: var(--color-text-primary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          font-size: 1rem;
        }

        .setting-item.checkbox {
          flex-direction: row;
          align-items: center;
          gap: 0.75rem;
        }

        .setting-item.checkbox input[type="checkbox"] {
          width: 20px;
          height: 20px;
          cursor: pointer;
        }

        .setting-item.checkbox label {
          margin: 0;
        }

        .settings-actions {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
          align-items: center;
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

        .btn-primary:hover {
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

        .alert {
          padding: 1rem;
          border-radius: var(--radius-md);
        }

        .alert-success {
          background: var(--color-success);
          color: white;
        }

        .alert-error {
          background: var(--color-error);
          color: white;
        }

        .security-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          padding: 1.25rem;
          background: var(--color-bg-tertiary);
          border-radius: var(--radius-md);
        }

        .security-toggle-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.25rem;
          background: var(--color-bg-tertiary);
          border-radius: var(--radius-md);
          border: 1px solid var(--color-border);
        }

        .toggle-switch {
          position: relative;
          width: 48px;
          height: 26px;
          background: var(--color-bg-primary);
          border: 2px solid var(--color-border);
          border-radius: 999px;
          cursor: pointer;
          transition: all 0.3s ease;
          padding: 0;
          flex-shrink: 0;
        }

        .toggle-switch.active {
          background: var(--color-primary);
          border-color: var(--color-primary);
        }

        .toggle-thumb {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 18px;
          height: 18px;
          background: white;
          border-radius: 50%;
          transition: transform 0.3s ease;
        }

        .toggle-switch.active .toggle-thumb {
          transform: translateX(22px);
        }

        .sessions-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .session-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding: 1rem 1.25rem;
          background: var(--color-bg-tertiary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          overflow: hidden;
        }

        @media (max-width: 768px) {
          .settings-page {
            padding: 1rem;
          }

          .settings-header {
            flex-direction: column;
            text-align: center;
          }

          .settings-actions {
            flex-direction: column;
            width: 100%;
          }

          .btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
