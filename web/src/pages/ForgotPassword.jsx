/**
 * Forgot Password Page
 * ====================
 * Password recovery via email.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Loader, ArrowLeft, CheckCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { resetPassword } = useAuth();
  
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const validateForm = () => {
    if (!email) {
      setError('Please enter your email address');
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) return;

    setLoading(true);

    try {
      const result = await resetPassword(email);

      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error || 'Failed to send reset email');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <motion.div
        className="auth-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="auth-card">
          <motion.div
            className="auth-header"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <div className="auth-icon">
              <Mail size={32} />
            </div>
            <h1 className="auth-title">Reset Password</h1>
            <p className="auth-subtitle">
              {success 
                ? 'Check your email for password reset instructions'
                : 'Enter your email to receive a password reset link'
              }
            </p>
          </motion.div>

          {!success ? (
            <motion.form
              className="auth-form"
              onSubmit={handleSubmit}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {error && (
                <motion.div
                  className="alert alert-error"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {error}
                </motion.div>
              )}

              <div className="form-group">
                <label htmlFor="email" className="form-label">Email Address</label>
                <div className="form-input-group">
                  <Mail size={18} className="form-input-icon" />
                  <input
                    id="email"
                    type="email"
                    className="form-input"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div className="info-box">
                <Mail size={16} />
                <span>
                  If an account exists with this email, you'll receive a password reset link within minutes.
                </span>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-large"
                disabled={loading}
                style={{ width: '100%' }}
              >
                {loading ? (
                  <>
                    <Loader size={18} className="spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Mail size={18} />
                    <span>Send Reset Link</span>
                  </>
                )}
              </button>
            </motion.form>
          ) : (
            <motion.div
              className="success-message"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <CheckCircle size={64} color="var(--color-success)" />
              <h2 style={{ marginTop: '1rem' }}>Check Your Email</h2>
              <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center' }}>
                We've sent a password reset link to <strong>{email}</strong>. 
                Click the link in the email to create a new password.
              </p>
              <p style={{ color: 'var(--color-text-tertiary)', fontSize: '0.875rem', textAlign: 'center' }}>
                Didn't receive the email? Check your spam folder or try with a different email address.
              </p>
            </motion.div>
          )}

          <motion.div
            className="auth-footer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Link to="/login" className="auth-footer-link-with-icon">
              <ArrowLeft size={18} />
              Back to Login
            </Link>
          </motion.div>
        </div>

        <motion.div
          className="auth-background"
          animate={{
            backgroundPosition: ['0% 0%', '100% 100%'],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            repeatType: 'reverse',
            ease: 'linear',
          }}
        />
      </motion.div>
    </div>
  );
}
