/**
 * VisionUpscale ONNX Runtime Web Inference
 * =========================================
 * Client-side AI inference using ONNX Runtime Web and WebAssembly.
 * Performs 4x image super-resolution entirely in the browser.
 * 
 * Features:
 * - Zero server uploads - all processing on-device
 * - Automatic model loading and caching
 * - Image tiling for large images
 * - Memory-efficient processing
 * - Bicubic fallback when model unavailable
 * - Progress tracking
 */

import * as ort from 'onnxruntime-web';

// Configure ONNX Runtime
ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.17.1/dist/';
ort.env.wasm.numThreads = navigator.hardwareConcurrency || 4;

// Model configuration
const MODEL_CONFIG = {
  path: '/model/visionupscale_4x.onnx',
  scaleFactor: 4,
  inputSize: 64, // Input patch size
  outputSize: 256, // Output patch size (inputSize * scaleFactor)
  channels: 3,
  maxImageSize: 2048, // Max dimension before tiling
  tileOverlap: 16 // Overlap between tiles to avoid seams
};

let modelSession = null;
let modelLoaded = false;
let modelLoadError = null;

/**
 * Load ONNX model
 */
export async function loadModel(onProgress) {
  if (modelLoaded && modelSession) {
    return modelSession;
  }
  
  try {
    if (onProgress) onProgress({ status: 'loading', progress: 0 });
    
    // Create session options
    const sessionOptions = {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
      enableCpuMemArena: true,
      enableMemPattern: true,
      executionMode: 'sequential'
    };
    
    // Try to use WebGL if available
    if (ort.env.webgl) {
      sessionOptions.executionProviders.unshift('webgl');
    }
    
    if (onProgress) onProgress({ status: 'loading', progress: 30 });
    
    // Load model
    modelSession = await ort.InferenceSession.create(
      MODEL_CONFIG.path,
      sessionOptions
    );
    
    modelLoaded = true;
    modelLoadError = null;
    
    if (onProgress) onProgress({ status: 'loaded', progress: 100 });
    
    console.log('ONNX model loaded successfully');
    console.log('Execution providers:', modelSession.executionProviders);
    
    return modelSession;
    
  } catch (error) {
    console.error('Failed to load ONNX model:', error);
    modelLoadError = error.message;
    modelLoaded = false;
    
    if (onProgress) {
      onProgress({ 
        status: 'error', 
        error: `Model loading failed: ${error.message}` 
      });
    }
    
    throw error;
  }
}

/**
 * Check if model is available
 */
export function isModelLoaded() {
  return modelLoaded && modelSession !== null;
}

/**
 * Get model load error
 */
export function getModelError() {
  return modelLoadError;
}

/**
 * Preprocess image for model input
 * Converts ImageData to normalized tensor [1, 3, H, W]
 */
function preprocessImage(imageData) {
  const { width, height, data } = imageData;
  
  // Create Float32Array for tensor
  const tensorData = new Float32Array(3 * height * width);
  
  // Convert RGBA to RGB and normalize to [0, 1]
  for (let i = 0; i < height * width; i++) {
    const pixelOffset = i * 4;
    
    // R, G, B channels (normalize to 0-1)
    tensorData[i] = data[pixelOffset] / 255.0;                    // R
    tensorData[height * width + i] = data[pixelOffset + 1] / 255.0;   // G
    tensorData[2 * height * width + i] = data[pixelOffset + 2] / 255.0; // B
  }
  
  // Create tensor
  const tensor = new ort.Tensor('float32', tensorData, [1, 3, height, width]);
  
  return tensor;
}

/**
 * Postprocess model output to ImageData
 * Converts tensor [1, 3, H, W] to ImageData
 */
function postprocessOutput(tensor) {
  const [batch, channels, height, width] = tensor.dims;
  const data = tensor.data;
  
  // Create ImageData
  const imageData = new ImageData(width, height);
  const pixels = imageData.data;
  
  // Convert CHW to HWC and denormalize
  for (let i = 0; i < height * width; i++) {
    const r = Math.max(0, Math.min(255, data[i] * 255));
    const g = Math.max(0, Math.min(255, data[height * width + i] * 255));
    const b = Math.max(0, Math.min(255, data[2 * height * width + i] * 255));
    
    const pixelOffset = i * 4;
    pixels[pixelOffset] = r;     // R
    pixels[pixelOffset + 1] = g; // G
    pixels[pixelOffset + 2] = b; // B
    pixels[pixelOffset + 3] = 255; // A
  }
  
  return imageData;
}

/**
 * Run inference on a single image patch
 */
async function inferPatch(session, imageData) {
  // Preprocess
  const inputTensor = preprocessImage(imageData);
  
  // Run inference
  const feeds = { input: inputTensor };
  const results = await session.run(feeds);
  
  // Get output tensor
  const outputTensor = results.output;
  
  // Postprocess
  const outputImageData = postprocessOutput(outputTensor);
  
  return outputImageData;
}

/**
 * Upscale image using model inference
 */
export async function upscaleImage(imageData, onProgress) {
  try {
    // Load model if not loaded
    if (!isModelLoaded()) {
      await loadModel(onProgress);
    }
    
    if (!modelSession) {
      throw new Error('Model not loaded');
    }
    
    const { width, height } = imageData;
    
    // Update progress
    if (onProgress) {
      onProgress({ status: 'processing', progress: 0 });
    }
    
    // Check if image needs tiling
    const needsTiling = width > MODEL_CONFIG.maxImageSize || 
                       height > MODEL_CONFIG.maxImageSize;
    
    let result;
    
    if (needsTiling) {
      // Process with tiling for large images
      result = await upscaleWithTiling(modelSession, imageData, onProgress);
    } else {
      // Process entire image at once
      result = await inferPatch(modelSession, imageData);
      
      if (onProgress) {
        onProgress({ status: 'processing', progress: 90 });
      }
    }
    
    if (onProgress) {
      onProgress({ status: 'complete', progress: 100 });
    }
    
    return result;
    
  } catch (error) {
    console.error('Upscaling failed:', error);
    
    if (onProgress) {
      onProgress({ 
        status: 'error', 
        error: `Upscaling failed: ${error.message}` 
      });
    }
    
    throw error;
  }
}

/**
 * Upscale large image using tiling
 */
async function upscaleWithTiling(session, imageData, onProgress) {
  const { width, height } = imageData;
  const tileSize = MODEL_CONFIG.inputSize;
  const overlap = MODEL_CONFIG.tileOverlap;
  const scale = MODEL_CONFIG.scaleFactor;
  
  // Calculate output dimensions
  const outputWidth = width * scale;
  const outputHeight = height * scale;
  
  // Create output ImageData
  const outputData = new ImageData(outputWidth, outputHeight);
  
  // Calculate number of tiles
  const tilesX = Math.ceil(width / (tileSize - overlap));
  const tilesY = Math.ceil(height / (tileSize - overlap));
  const totalTiles = tilesX * tilesY;
  
  let processedTiles = 0;
  
  // Process each tile
  for (let y = 0; y < tilesY; y++) {
    for (let x = 0; x < tilesX; x++) {
      // Calculate tile boundaries
      const startX = x * (tileSize - overlap);
      const startY = y * (tileSize - overlap);
      const endX = Math.min(startX + tileSize, width);
      const endY = Math.min(startY + tileSize, height);
      
      const tileWidth = endX - startX;
      const tileHeight = endY - startY;
      
      // Extract tile
      const tileData = extractTile(imageData, startX, startY, tileWidth, tileHeight);
      
      // Upscale tile
      const upscaledTile = await inferPatch(session, tileData);
      
      // Place tile in output
      placeTile(
        outputData,
        upscaledTile,
        startX * scale,
        startY * scale
      );
      
      // Update progress
      processedTiles++;
      if (onProgress) {
        const progress = Math.floor((processedTiles / totalTiles) * 90);
        onProgress({ status: 'processing', progress });
      }
    }
  }
  
  return outputData;
}

/**
 * Extract tile from image
 */
function extractTile(imageData, x, y, width, height) {
  const tileData = new ImageData(width, height);
  
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const srcIdx = ((y + row) * imageData.width + (x + col)) * 4;
      const dstIdx = (row * width + col) * 4;
      
      tileData.data[dstIdx] = imageData.data[srcIdx];
      tileData.data[dstIdx + 1] = imageData.data[srcIdx + 1];
      tileData.data[dstIdx + 2] = imageData.data[srcIdx + 2];
      tileData.data[dstIdx + 3] = imageData.data[srcIdx + 3];
    }
  }
  
  return tileData;
}

/**
 * Place tile in output image
 */
function placeTile(outputData, tileData, x, y) {
  const { width: tileWidth, height: tileHeight } = tileData;
  
  for (let row = 0; row < tileHeight; row++) {
    for (let col = 0; col < tileWidth; col++) {
      const srcIdx = (row * tileWidth + col) * 4;
      const dstIdx = ((y + row) * outputData.width + (x + col)) * 4;
      
      if (dstIdx < outputData.data.length) {
        outputData.data[dstIdx] = tileData.data[srcIdx];
        outputData.data[dstIdx + 1] = tileData.data[srcIdx + 1];
        outputData.data[dstIdx + 2] = tileData.data[srcIdx + 2];
        outputData.data[dstIdx + 3] = tileData.data[srcIdx + 3];
      }
    }
  }
}

/**
 * Bicubic fallback for when model is unavailable
 */
export function upscaleBicubic(imageData, scaleFactor = 4) {
  const { width, height } = imageData;
  const newWidth = width * scaleFactor;
  const newHeight = height * scaleFactor;
  
  // Create canvas for bicubic interpolation
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.putImageData(imageData, 0, 0);
  
  // Create output canvas
  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = newWidth;
  outputCanvas.height = newHeight;
  const outputCtx = outputCanvas.getContext('2d');
  
  // Enable image smoothing for better quality
  outputCtx.imageSmoothingEnabled = true;
  outputCtx.imageSmoothingQuality = 'high';
  
  // Draw scaled image
  outputCtx.drawImage(canvas, 0, 0, newWidth, newHeight);
  
  // Get output ImageData
  return outputCtx.getImageData(0, 0, newWidth, newHeight);
}

/**
 * Get model info
 */
export function getModelInfo() {
  return {
    loaded: isModelLoaded(),
    error: getModelError(),
    config: MODEL_CONFIG
  };
}

export default {
  loadModel,
  upscaleImage,
  upscaleBicubic,
  isModelLoaded,
  getModelInfo
};
