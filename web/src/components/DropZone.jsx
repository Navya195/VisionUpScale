/**
 * DropZone Component
 * ==================
 * Drag-and-drop file upload component with visual feedback.
 */

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Image as ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';

export default function DropZone({ onImageSelect, disabled = false }) {
  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      onImageSelect(acceptedFiles[0]);
    }
  }, [onImageSelect]);
  
  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.bmp']
    },
    maxFiles: 1,
    disabled,
    multiple: false
  });
  
  return (
    <motion.div
      {...getRootProps()}
      className={`drop-zone ${isDragActive ? 'active' : ''} ${isDragReject ? 'reject' : ''} ${disabled ? 'disabled' : ''}`}
      whileHover={!disabled ? { scale: 1.02 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <input {...getInputProps()} />
      
      <div className="drop-zone-content">
        <motion.div
          className="drop-zone-icon"
          animate={isDragActive ? { scale: 1.2, rotate: 5 } : { scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          {isDragActive ? (
            <Upload size={48} strokeWidth={2} />
          ) : (
            <ImageIcon size={48} strokeWidth={2} />
          )}
        </motion.div>
        
        <div className="drop-zone-text">
          {isDragActive ? (
            <p className="drop-zone-title">Drop image here</p>
          ) : isDragReject ? (
            <>
              <p className="drop-zone-title error">Invalid file type</p>
              <p className="drop-zone-subtitle">Please upload an image file</p>
            </>
          ) : (
            <>
              <p className="drop-zone-title">
                Drag & drop an image here
              </p>
              <p className="drop-zone-subtitle">
                or click to browse files
              </p>
              <p className="drop-zone-formats">
                Supports PNG, JPG, WEBP • Max 20MB
              </p>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
