/**
 * LoadingOverlay Component
 * ========================
 * Loading overlay with progress indicator and status messages.
 */

import { motion } from 'framer-motion';
import { Loader2, Sparkles, Zap } from 'lucide-react';

export default function LoadingOverlay({ 
  isVisible, 
  progress = 0, 
  status = 'Processing...', 
  useAI = true 
}) {
  if (!isVisible) return null;
  
  return (
    <motion.div
      className="loading-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="loading-content"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        {/* Animated Icon */}
        <motion.div
          className="loading-icon"
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          {useAI ? (
            <Sparkles size={48} strokeWidth={2} />
          ) : (
            <Zap size={48} strokeWidth={2} />
          )}
        </motion.div>
        
        {/* Status Text */}
        <h3 className="loading-title">{status}</h3>
        
        {/* Progress Bar */}
        <div className="progress-bar-container">
          <motion.div
            className="progress-bar"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </div>
        
        {/* Progress Percentage */}
        <p className="progress-text">{Math.round(progress)}%</p>
        
        {/* Method Badge */}
        <div className="method-badge">
          {useAI ? (
            <>
              <Sparkles size={16} />
              <span>AI Enhanced</span>
            </>
          ) : (
            <>
              <Zap size={16} />
              <span>Bicubic</span>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
