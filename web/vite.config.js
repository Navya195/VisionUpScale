import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  // Required for ONNX Runtime Web: serve WASM files with correct MIME type
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },

  // Optimize ONNX Runtime Web chunking
  optimizeDeps: {
    exclude: ['onnxruntime-web'],
  },

  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'onnxruntime': ['onnxruntime-web'],
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['framer-motion', 'lucide-react'],
        },
      },
    },
    // Copy ONNX WASM files to dist
    assetsInlineLimit: 0,
  },

  // Make ONNX WASM files available
  worker: {
    format: 'es',
  },
})
