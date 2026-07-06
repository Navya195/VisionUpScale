/**
 * Upload Page
 * ===========
 * Main upscaling interface with drag-drop, preview, and download.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, Trash2, Settings, Info, 
  Sparkles, Image as ImageIcon, Zap 
} from 'lucide-react';
import DropZone from '../components/DropZone';
import ComparisonSlider from '../components/ComparisonSlider';
import LoadingOverlay from '../components/LoadingOverlay';
import { useUpscaler } from '../hooks/useUpscaler';
import { imageDataToDataURL } from '../utils/imageProcessing';

export default function Upload() {
  const {
    state,
    loadImage,
    upscale,
    download,
    reset,
    getStats,
    hasOriginalImage,
    hasUpscaledImage,
    canUpscale,
    canDownload
  } = useUpscaler();
  
  const [beforeImageUrl, setBeforeImageUrl] = useState(null);
  const [afterImageUrl, setAfterImageUrl] = useState(null);
  const [stats, setStats] = useState(null);
  const [downloadFormat, setDownloadFormat] = useState('png');
  const [showSettings, setShowSettings] = useState(false);
  
  // Update image URLs when state changes
  useEffect(() => {
    if (state.originalImageData) {
      const url = imageDataToDataURL(state.originalImageData);
      setBeforeImageUrl(url);
    }
  }, [state.originalImageData]);
  
  useEffect(() => {
    if (state.upscaledImageData) {
      const url = imageDataToDataURL(state.upscaledImageData);
      setAfterImageUrl(url);
    }
  }, [state.upscaledImageData]);
  
  // Update stats
  useEffect(() => {
    if (hasUpscaledImage) {
      getStats().then(setStats);
    }
  }, [hasUpscaledImage, getStats]);
  
  const handleImageSelect = async (file) => {
    try {
      await loadImage(file);
    } catch (error) {
      console.error('Failed to load image:', error);
    }
  };
  
  const handleUpscale = async (useAI = true) => {
    try {
      await upscale(useAI);
    } catch (error) {
      console.error('Upscaling failed:', error);
    }
  };
  
  const handleDownload = async () => {
    try {
      await download(downloadFormat, 0.95);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };
  
  const handleReset = () => {
    setBeforeImageUrl(null);
    setAfterImageUrl(null);
    setStats(null);
    reset();
  };
  
  return (
    <div className="upload-page">
      <div className="upload-container">
        <motion.div
          className="upload-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="page-title">Upscale Your Images</h1>
          <p className="page-description">
            Upload an image to enhance it 4× using AI super-resolution
          </p>
        </motion.div>
        
        {/* Drop Zone or Image Preview */}
        {!hasOriginalImage ? (
          <DropZone 
            onImageSelect={handleImageSelect}
            disabled={state.isProcessing}
          />
        ) : (
          <motion.div
            className="upload-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {/* Comparison View */}
            {hasUpscaledImage && beforeImageUrl && afterImageUrl ? (
              <div className="comparison-container">
                <ComparisonSlider
                  beforeImage={beforeImageUrl}
                  afterImage={afterImageUrl}
                  aspectRatio={state.upscaledImageData.width / state.upscaledImageData.height}
                />
                
                {/* Stats Display */}
                {stats && (
                  <motion.div
                    className="stats-display"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="stats-grid">
                      <div className="stat-item">
                        <span className="stat-label">Original</span>
                        <span className="stat-value">
                          {stats.original?.width} × {stats.original?.height}
                        </span>
                      </div>
                      
                      <div className="stat-item">
                        <span className="stat-label">Enhanced</span>
                        <span className="stat-value">
                          {stats.upscaled?.width} × {stats.upscaled?.height}
                        </span>
                      </div>
                      
                      <div className="stat-item">
                        <span className="stat-label">Method</span>
                        <span className="stat-value">
                          {stats.improvement?.method}
                        </span>
                      </div>
                      
                      <div className="stat-item">
                        <span className="stat-label">Time</span>
                        <span className="stat-value">
                          {(stats.improvement?.processingTime / 1000).toFixed(2)}s
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            ) : (
              // Original Image Preview
              <div className="image-preview">
                <img src={beforeImageUrl} alt="Original" />
                <div className="image-info">
                  <ImageIcon size={20} />
                  <span>
                    {state.originalImageData?.width} × {state.originalImageData?.height}
                  </span>
                </div>
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="action-buttons">
              {!hasUpscaledImage ? (
                <>
                  <button
                    className="btn btn-primary btn-large"
                    onClick={() => handleUpscale(true)}
                    disabled={!canUpscale}
                  >
                    <Sparkles size={20} />
                    <span>Upscale with AI</span>
                  </button>
                  
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleUpscale(false)}
                    disabled={!canUpscale}
                  >
                    <Zap size={18} />
                    <span>Quick Upscale</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="btn btn-primary"
                    onClick={handleDownload}
                    disabled={!canDownload}
                  >
                    <Download size={18} />
                    <span>Download ({downloadFormat.toUpperCase()})</span>
                  </button>
                  
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowSettings(!showSettings)}
                  >
                    <Settings size={18} />
                    <span>Settings</span>
                  </button>
                </>
              )}
              
              <button
                className="btn btn-ghost"
                onClick={handleReset}
              >
                <Trash2 size={18} />
                <span>Reset</span>
              </button>
            </div>
            
            {/* Settings Panel */}
            <AnimatePresence>
              {showSettings && hasUpscaledImage && (
                <motion.div
                  className="settings-panel"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <h3>Download Settings</h3>
                  
                  <div className="setting-item">
                    <label>Format</label>
                    <select
                      value={downloadFormat}
                      onChange={(e) => setDownloadFormat(e.target.value)}
                    >
                      <option value="png">PNG (Lossless)</option>
                      <option value="jpeg">JPEG (Smaller file)</option>
                      <option value="webp">WebP (Modern)</option>
                    </select>
                  </div>
                  
                  <div className="info-box">
                    <Info size={16} />
                    <span>
                      PNG provides best quality but larger file size. 
                      JPEG is smaller but may show compression artifacts.
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
        
        {/* Info Cards */}
        {!hasOriginalImage && (
          <motion.div
            className="info-cards"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="info-card">
              <Sparkles size={24} />
              <h3>AI Enhanced</h3>
              <p>Uses ESRGAN for photorealistic results</p>
            </div>
            
            <div className="info-card">
              <Zap size={24} />
              <h3>Lightning Fast</h3>
              <p>Process images in seconds with WebAssembly</p>
            </div>
            
            <div className="info-card">
              <ImageIcon size={24} />
              <h3>High Quality</h3>
              <p>4× resolution increase with fine details preserved</p>
            </div>
          </motion.div>
        )}
      </div>
      
      {/* Loading Overlay */}
      <LoadingOverlay
        isVisible={state.isProcessing}
        progress={state.progress}
        status={
          state.status === 'loading' ? 'Loading AI model...' :
          state.status === 'processing' ? 'Enhancing image...' :
          state.status === 'complete' ? 'Complete!' :
          'Processing...'
        }
        useAI={state.useAI}
      />
    </div>
  );
}
