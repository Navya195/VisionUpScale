/**
 * ComparisonSlider Component
 * ==========================
 * Interactive before/after comparison slider for images.
 */

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Maximize2, Minimize2 } from 'lucide-react';

export default function ComparisonSlider({ beforeImage, afterImage, aspectRatio = 16/9 }) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);
  
  const handleMouseDown = () => {
    setIsDragging(true);
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  const handleMouseMove = (e) => {
    if (!isDragging || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    
    setSliderPosition(Math.max(0, Math.min(100, percentage)));
  };
  
  const handleTouchMove = (e) => {
    if (!containerRef.current) return;
    
    const touch = e.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    
    setSliderPosition(Math.max(0, Math.min(100, percentage)));
  };
  
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);
  
  const toggleFullscreen = () => {
    if (!isFullscreen && containerRef.current) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  };
  
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);
  
  return (
    <div 
      ref={containerRef}
      className={`comparison-slider ${isFullscreen ? 'fullscreen' : ''}`}
      style={{ aspectRatio: `${aspectRatio}` }}
      onTouchMove={handleTouchMove}
    >
      {/* Before Image (Right side) */}
      <div className="comparison-image before-image">
        <img src={beforeImage} alt="Before" draggable={false} />
        <div className="comparison-label">Before</div>
      </div>
      
      {/* After Image (Left side - clipped by slider) */}
      <div 
        className="comparison-image after-image"
        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
      >
        <img src={afterImage} alt="After" draggable={false} />
        <div className="comparison-label">After</div>
      </div>
      
      {/* Slider Handle */}
      <motion.div
        className={`comparison-slider-handle ${isDragging ? 'dragging' : ''}`}
        style={{ left: `${sliderPosition}%` }}
        onMouseDown={handleMouseDown}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <div className="slider-line" />
        <div className="slider-button">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="18" fill="white" stroke="currentColor" strokeWidth="2" />
            <path d="M14 20L18 16M14 20L18 24M14 20H26M26 20L22 16M26 20L22 24" 
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </motion.div>
      
      {/* Fullscreen Toggle */}
      <button 
        className="fullscreen-button"
        onClick={toggleFullscreen}
        aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
      >
        {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
      </button>
      
      {/* Percentage Indicator */}
      <div className="comparison-percentage">
        {Math.round(sliderPosition)}%
      </div>
    </div>
  );
}
