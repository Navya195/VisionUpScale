/**
 * VisionUpscale React Hook
 * ========================
 * Custom React hook for image upscaling functionality.
 * 
 * Features:
 * - State management for upscaling process
 * - Progress tracking
 * - Error handling
 * - Model loading
 * - Image processing
 */

import { useState, useCallback, useRef } from 'react';
import { loadModel, upscaleImage, upscaleBicubic, isModelLoaded, getModelInfo } from '../utils/onnxInference';
import { 
  loadImageFromFile, 
  imageToImageData, 
  downloadImage,
  getImageSize,
  formatFileSize
} from '../utils/imageProcessing';

export function useUpscaler() {
  const [state, setState] = useState({
    isProcessing: false,
    progress: 0,
    status: 'idle', // idle, loading, processing, complete, error
    error: null,
    originalImage: null,
    upscaledImage: null,
    originalImageData: null,
    upscaledImageData: null,
    useAI: true,
    processingTime: 0
  });
  
  const startTimeRef = useRef(null);
  const abortControllerRef = useRef(null);
  
  /**
   * Load and prepare image for processing
   */
  const loadImage = useCallback(async (file) => {
    try {
      setState(prev => ({
        ...prev,
        isProcessing: true,
        status: 'loading',
        error: null,
        progress: 0
      }));
      
      // Load image
      const img = await loadImageFromFile(file);
      const imageData = imageToImageData(img, 2048); // Max 2048px for performance
      
      setState(prev => ({
        ...prev,
        originalImage: img,
        originalImageData: imageData,
        isProcessing: false,
        status: 'idle',
        progress: 0
      }));
      
      return { img, imageData };
      
    } catch (error) {
      console.error('Failed to load image:', error);
      setState(prev => ({
        ...prev,
        isProcessing: false,
        status: 'error',
        error: error.message
      }));
      throw error;
    }
  }, []);
  
  /**
   * Upscale loaded image
   */
  const upscale = useCallback(async (useAI = true) => {
    if (!state.originalImageData) {
      throw new Error('No image loaded');
    }
    
    try {
      // Create abort controller
      abortControllerRef.current = new AbortController();
      
      startTimeRef.current = performance.now();
      
      setState(prev => ({
        ...prev,
        isProcessing: true,
        status: useAI ? 'loading' : 'processing',
        error: null,
        progress: 0,
        useAI
      }));
      
      let upscaledImageData;
      
      if (useAI) {
        // Try AI upscaling
        try {
          // Progress callback
          const onProgress = (progressInfo) => {
            setState(prev => ({
              ...prev,
              progress: progressInfo.progress || 0,
              status: progressInfo.status,
              error: progressInfo.error || null
            }));
          };
          
          // Load model if not loaded
          if (!isModelLoaded()) {
            await loadModel(onProgress);
          }
          
          // Upscale with AI
          setState(prev => ({ ...prev, status: 'processing', progress: 0 }));
          upscaledImageData = await upscaleImage(state.originalImageData, onProgress);
          
        } catch (modelError) {
          console.warn('AI upscaling failed, falling back to bicubic:', modelError);
          
          // Fallback to bicubic
          setState(prev => ({
            ...prev,
            status: 'processing',
            progress: 50,
            useAI: false
          }));
          
          upscaledImageData = upscaleBicubic(state.originalImageData, 4);
        }
      } else {
        // Use bicubic upscaling
        setState(prev => ({ ...prev, progress: 10 }));
        upscaledImageData = upscaleBicubic(state.originalImageData, 4);
        setState(prev => ({ ...prev, progress: 90 }));
      }
      
      // Calculate processing time
      const processingTime = performance.now() - startTimeRef.current;
      
      setState(prev => ({
        ...prev,
        isProcessing: false,
        status: 'complete',
        progress: 100,
        upscaledImageData,
        processingTime: Math.round(processingTime)
      }));
      
      return upscaledImageData;
      
    } catch (error) {
      console.error('Upscaling failed:', error);
      
      setState(prev => ({
        ...prev,
        isProcessing: false,
        status: 'error',
        error: error.message
      }));
      
      throw error;
    } finally {
      abortControllerRef.current = null;
    }
  }, [state.originalImageData]);
  
  /**
   * Download upscaled image
   */
  const download = useCallback(async (format = 'png', quality = 0.95) => {
    if (!state.upscaledImageData) {
      throw new Error('No upscaled image available');
    }
    
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `visionupscale_4x_${timestamp}.${format}`;
      
      await downloadImage(state.upscaledImageData, filename, format, quality);
      
    } catch (error) {
      console.error('Download failed:', error);
      throw error;
    }
  }, [state.upscaledImageData]);
  
  /**
   * Reset state
   */
  const reset = useCallback(() => {
    // Cancel any ongoing processing
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    setState({
      isProcessing: false,
      progress: 0,
      status: 'idle',
      error: null,
      originalImage: null,
      upscaledImage: null,
      originalImageData: null,
      upscaledImageData: null,
      useAI: true,
      processingTime: 0
    });
  }, []);
  
  /**
   * Get statistics
   */
  const getStats = useCallback(async () => {
    const stats = {
      original: null,
      upscaled: null,
      improvement: null
    };
    
    if (state.originalImageData) {
      const originalSize = await getImageSize(state.originalImageData);
      stats.original = {
        width: state.originalImageData.width,
        height: state.originalImageData.height,
        size: formatFileSize(originalSize),
        pixels: state.originalImageData.width * state.originalImageData.height
      };
    }
    
    if (state.upscaledImageData) {
      const upscaledSize = await getImageSize(state.upscaledImageData);
      stats.upscaled = {
        width: state.upscaledImageData.width,
        height: state.upscaledImageData.height,
        size: formatFileSize(upscaledSize),
        pixels: state.upscaledImageData.width * state.upscaledImageData.height
      };
      
      if (stats.original) {
        stats.improvement = {
          resolution: `${stats.upscaled.pixels / stats.original.pixels}x`,
          processingTime: state.processingTime,
          method: state.useAI ? 'AI (ESRGAN)' : 'Bicubic'
        };
      }
    }
    
    return stats;
  }, [state.originalImageData, state.upscaledImageData, state.processingTime, state.useAI]);
  
  /**
   * Check if model is available
   */
  const checkModel = useCallback(async () => {
    try {
      if (!isModelLoaded()) {
        await loadModel();
      }
      return { available: true, info: getModelInfo() };
    } catch (error) {
      return { available: false, error: error.message };
    }
  }, []);
  
  return {
    // State
    state,
    
    // Actions
    loadImage,
    upscale,
    download,
    reset,
    
    // Utilities
    getStats,
    checkModel,
    
    // Computed values
    hasOriginalImage: !!state.originalImageData,
    hasUpscaledImage: !!state.upscaledImageData,
    canUpscale: !!state.originalImageData && !state.isProcessing,
    canDownload: !!state.upscaledImageData && !state.isProcessing
  };
}

export default useUpscaler;
