/**
 * Loading Spinner Component
 * ==========================
 * Reusable loading state component.
 */

import { motion } from 'framer-motion';
import { Loader, AlertCircle } from 'lucide-react';

export function LoadingSpinner({
  size = 'md',
  text = 'Loading...',
  subtext = '',
  error = null,
  type = 'spinner'
}) {
  const sizes = {
    sm: 'spinner-sm',
    md: 'spinner-md',
    lg: 'spinner-lg',
    xl: 'spinner-xl'
  };

  if (error) {
    return (
      <motion.div
        className="loading-spinner error"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="spinner-icon error">
          <AlertCircle size={40} />
        </div>
        <p className="spinner-text error">{text}</p>
        {subtext && <p className="spinner-subtext">{subtext}</p>}
      </motion.div>
    );
  }

  return (
    <motion.div
      className={`loading-spinner ${sizes[size]}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      {type === 'spinner' ? (
        <motion.div
          className="spinner-icon"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        >
          <Loader size={40} />
        </motion.div>
      ) : (
        <div className="spinner-pulse">
          <div className="pulse-dot"></div>
        </div>
      )}
      {text && <p className="spinner-text">{text}</p>}
      {subtext && <p className="spinner-subtext">{subtext}</p>}
    </motion.div>
  );
}

export function SkeletonLoader({ count = 1, variant = 'card' }) {
  const variants = {
    card: 'skeleton-card',
    line: 'skeleton-line',
    circle: 'skeleton-circle'
  };

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className={`skeleton ${variants[variant]}`}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        />
      ))}
    </>
  );
}

export default LoadingSpinner;
