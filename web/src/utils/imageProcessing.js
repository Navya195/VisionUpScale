/**
 * VisionUpscale Image Processing Utilities
 * ==========================================
 * Client-side image processing utilities for the web app.
 * 
 * Features:
 * - File loading and validation
 * - Image resizing and format conversion
 * - Canvas manipulation
 * - Download utilities
 * - Memory-efficient processing
 */

/**
 * Load image from File object
 */
export async function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      reject(new Error('File is not an image'));
      return;
    }
    
    // Validate file size (max 20MB)
    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      reject(new Error('Image file is too large (max 20MB)'));
      return;
    }
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        resolve(img);
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      
      img.src = e.target.result;
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsDataURL(file);
  });
}

/**
 * Convert Image to ImageData
 */
export function imageToImageData(image, maxSize = null) {
  let { width, height } = image;
  
  // Resize if too large
  if (maxSize && (width > maxSize || height > maxSize)) {
    const scale = maxSize / Math.max(width, height);
    width = Math.floor(width * scale);
    height = Math.floor(height * scale);
  }
  
  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0, width, height);
  
  return ctx.getImageData(0, 0, width, height);
}

/**
 * Convert ImageData to canvas element
 */
export function imageDataToCanvas(imageData) {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  
  const ctx = canvas.getContext('2d');
  ctx.putImageData(imageData, 0, 0);
  
  return canvas;
}

/**
 * Convert ImageData to data URL
 */
export function imageDataToDataURL(imageData, format = 'image/png', quality = 0.95) {
  const canvas = imageDataToCanvas(imageData);
  return canvas.toDataURL(format, quality);
}

/**
 * Convert ImageData to Blob
 */
export async function imageDataToBlob(imageData, format = 'image/png', quality = 0.95) {
  const canvas = imageDataToCanvas(imageData);
  
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob'));
        }
      },
      format,
      quality
    );
  });
}

/**
 * Download ImageData as file
 */
export async function downloadImage(imageData, filename, format = 'png', quality = 0.95) {
  const mimeType = `image/${format}`;
  const blob = await imageDataToBlob(imageData, mimeType, quality);
  
  // Create download link
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  
  // Cleanup
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * Calculate image dimensions after resize
 */
export function calculateResizeDimensions(width, height, maxSize) {
  if (width <= maxSize && height <= maxSize) {
    return { width, height };
  }
  
  const aspectRatio = width / height;
  
  if (width > height) {
    return {
      width: maxSize,
      height: Math.round(maxSize / aspectRatio)
    };
  } else {
    return {
      width: Math.round(maxSize * aspectRatio),
      height: maxSize
    };
  }
}

/**
 * Resize image maintaining aspect ratio
 */
export function resizeImage(imageData, maxSize) {
  const { width: originalWidth, height: originalHeight } = imageData;
  
  // Calculate new dimensions
  const { width, height } = calculateResizeDimensions(
    originalWidth,
    originalHeight,
    maxSize
  );
  
  // No resize needed
  if (width === originalWidth && height === originalHeight) {
    return imageData;
  }
  
  // Create canvas for resize
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  
  // Draw original image
  const tempCanvas = imageDataToCanvas(imageData);
  
  // Enable high-quality scaling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  
  // Draw resized
  ctx.drawImage(tempCanvas, 0, 0, width, height);
  
  return ctx.getImageData(0, 0, width, height);
}

/**
 * Get image file size in bytes
 */
export async function getImageSize(imageData, format = 'png', quality = 0.95) {
  const blob = await imageDataToBlob(imageData, `image/${format}`, quality);
  return blob.size;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get image dimensions string
 */
export function formatDimensions(width, height) {
  return `${width} × ${height}`;
}

/**
 * Calculate upscaling factor
 */
export function calculateUpscaleFactor(originalWidth, originalHeight, newWidth, newHeight) {
  const widthFactor = newWidth / originalWidth;
  const heightFactor = newHeight / originalHeight;
  return Math.min(widthFactor, heightFactor);
}

/**
 * Create thumbnail from ImageData
 */
export function createThumbnail(imageData, maxSize = 200) {
  return resizeImage(imageData, maxSize);
}

/**
 * Compare two images and calculate difference
 */
export function compareImages(imageData1, imageData2) {
  if (imageData1.width !== imageData2.width || imageData1.height !== imageData2.height) {
    throw new Error('Images must have the same dimensions');
  }
  
  const data1 = imageData1.data;
  const data2 = imageData2.data;
  const length = data1.length;
  
  let totalDiff = 0;
  let maxDiff = 0;
  
  for (let i = 0; i < length; i += 4) {
    const diff = Math.abs(data1[i] - data2[i]) +
                Math.abs(data1[i + 1] - data2[i + 1]) +
                Math.abs(data1[i + 2] - data2[i + 2]);
    
    totalDiff += diff;
    maxDiff = Math.max(maxDiff, diff);
  }
  
  const avgDiff = totalDiff / (length / 4) / 3; // Average per pixel per channel
  
  return {
    averageDifference: avgDiff,
    maxDifference: maxDiff,
    similarity: 1 - (avgDiff / 255)
  };
}

/**
 * Apply brightness adjustment
 */
export function adjustBrightness(imageData, amount) {
  const data = imageData.data;
  const adjustment = amount * 255;
  
  const result = new ImageData(
    new Uint8ClampedArray(data),
    imageData.width,
    imageData.height
  );
  
  for (let i = 0; i < result.data.length; i += 4) {
    result.data[i] = Math.max(0, Math.min(255, data[i] + adjustment));
    result.data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + adjustment));
    result.data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + adjustment));
  }
  
  return result;
}

/**
 * Apply contrast adjustment
 */
export function adjustContrast(imageData, amount) {
  const data = imageData.data;
  const factor = (259 * (amount + 255)) / (255 * (259 - amount));
  
  const result = new ImageData(
    new Uint8ClampedArray(data),
    imageData.width,
    imageData.height
  );
  
  for (let i = 0; i < result.data.length; i += 4) {
    result.data[i] = Math.max(0, Math.min(255, factor * (data[i] - 128) + 128));
    result.data[i + 1] = Math.max(0, Math.min(255, factor * (data[i + 1] - 128) + 128));
    result.data[i + 2] = Math.max(0, Math.min(255, factor * (data[i + 2] - 128) + 128));
  }
  
  return result;
}

/**
 * Create image from URL
 */
export async function loadImageFromURL(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image from URL'));
    
    img.src = url;
  });
}

/**
 * Copy ImageData
 */
export function cloneImageData(imageData) {
  return new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  );
}

export default {
  loadImageFromFile,
  imageToImageData,
  imageDataToCanvas,
  imageDataToDataURL,
  imageDataToBlob,
  downloadImage,
  resizeImage,
  calculateResizeDimensions,
  getImageSize,
  formatFileSize,
  formatDimensions,
  calculateUpscaleFactor,
  createThumbnail,
  compareImages,
  adjustBrightness,
  adjustContrast,
  loadImageFromURL,
  cloneImageData
};
