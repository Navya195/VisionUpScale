/**
 * Documentation Page
 * ==================
 * Complete documentation, API reference, and FAQ.
 */

import { motion } from 'framer-motion';
import { 
  BookOpen, Code, Terminal, HelpCircle, 
  CheckCircle, AlertCircle, Info 
} from 'lucide-react';

export default function Documentation() {
  const faqs = [
    {
      question: 'How does VisionUpscale work?',
      answer: 'VisionUpscale uses ESRGAN (Enhanced Super-Resolution GAN) model trained on high-quality images. The model is converted to ONNX format and runs in your browser using WebAssembly for complete privacy.'
    },
    {
      question: 'Are my images uploaded to a server?',
      answer: 'No! All processing happens locally in your browser. Your images never leave your device, ensuring complete privacy.'
    },
    {
      question: 'What image formats are supported?',
      answer: 'We support PNG, JPEG, WebP, and BMP formats. Maximum file size is 20MB.'
    },
    {
      question: 'What is the maximum image size?',
      answer: 'Images up to 2048×2048 pixels can be processed directly. Larger images are automatically tiled for processing.'
    },
    {
      question: 'How long does processing take?',
      answer: 'Processing time depends on image size and your device. Typically 2-10 seconds for standard images using WebAssembly acceleration.'
    },
    {
      question: 'Can I use this offline?',
      answer: 'Yes! Once the model is loaded, you can process images offline. The model is cached in your browser.'
    },
    {
      question: 'Is it really free?',
      answer: 'Yes, completely free forever! No sign-up, no payments, no hidden costs.'
    },
    {
      question: 'Can I use this for commercial projects?',
      answer: 'Yes! VisionUpscale is MIT licensed. You can use it freely for personal and commercial projects.'
    }
  ];
  
  return (
    <div className="documentation-page">
      <div className="docs-container">
        {/* Header */}
        <motion.div
          className="docs-header"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="docs-header-icon">
            <BookOpen size={48} />
          </div>
          <h1 className="page-title">Documentation</h1>
          <p className="page-subtitle">
            Everything you need to know about VisionUpscale
          </p>
        </motion.div>
        
        {/* Quick Start */}
        <motion.section
          className="docs-section"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="docs-section-title">
            <Terminal size={24} />
            Quick Start
          </h2>
          
          <div className="docs-content">
            <div className="docs-steps">
              <div className="docs-step">
                <div className="step-badge">1</div>
                <div className="step-content">
                  <h3>Upload an Image</h3>
                  <p>
                    Drag and drop an image or click to browse. 
                    Supports PNG, JPEG, WebP formats up to 20MB.
                  </p>
                </div>
              </div>
              
              <div className="docs-step">
                <div className="step-badge">2</div>
                <div className="step-content">
                  <h3>Choose Enhancement Method</h3>
                  <p>
                    Select AI enhancement for best quality or quick upscale 
                    for faster results.
                  </p>
                </div>
              </div>
              
              <div className="docs-step">
                <div className="step-badge">3</div>
                <div className="step-content">
                  <h3>Download Result</h3>
                  <p>
                    Compare before/after with the interactive slider, 
                    then download in your preferred format.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.section>
        
        {/* Technical Details */}
        <motion.section
          className="docs-section"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="docs-section-title">
            <Code size={24} />
            Technical Details
          </h2>
          
          <div className="docs-content">
            <div className="tech-details">
              <div className="tech-detail-card">
                <h3>Model Architecture</h3>
                <ul>
                  <li>ESRGAN (Enhanced Super-Resolution GAN)</li>
                  <li>23 Residual-in-Residual Dense Blocks (RRDB)</li>
                  <li>64 base features, 32 growth channels</li>
                  <li>Trained on DIV2K dataset</li>
                  <li>4× upscaling factor</li>
                </ul>
              </div>
              
              <div className="tech-detail-card">
                <h3>Browser Requirements</h3>
                <ul>
                  <li>Modern browser with WebAssembly support</li>
                  <li>Minimum 4GB RAM recommended</li>
                  <li>WebGL support for acceleration</li>
                  <li>Chrome, Firefox, Safari, Edge supported</li>
                </ul>
              </div>
              
              <div className="tech-detail-card">
                <h3>Performance</h3>
                <ul>
                  <li>Processing: 2-10 seconds typical</li>
                  <li>Model size: ~16MB (cached)</li>
                  <li>Memory usage: 200-500MB during processing</li>
                  <li>Automatic tiling for large images</li>
                </ul>
              </div>
              
              <div className="tech-detail-card">
                <h3>Export Formats</h3>
                <ul>
                  <li>PNG: Lossless, best quality</li>
                  <li>JPEG: Smaller files, good quality</li>
                  <li>WebP: Modern format, balanced</li>
                  <li>Adjustable quality settings</li>
                </ul>
              </div>
            </div>
          </div>
        </motion.section>
        
        {/* API Reference */}
        <motion.section
          className="docs-section"
          id="api"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="docs-section-title">
            <Code size={24} />
            API Reference
          </h2>
          
          <div className="docs-content">
            <div className="code-block">
              <div className="code-header">
                <span>JavaScript</span>
                <button className="copy-button">Copy</button>
              </div>
              <pre><code>{`import { loadModel, upscaleImage } from './utils/onnxInference';
import { imageToImageData } from './utils/imageProcessing';

// Load the model
await loadModel();

// Prepare image
const img = await loadImageFromFile(file);
const imageData = imageToImageData(img);

// Upscale
const upscaled = await upscaleImage(imageData, {
  onProgress: (info) => {
    console.log(\`Progress: \${info.progress}%\`);
  }
});

// Download result
await downloadImage(upscaled, 'enhanced.png');`}</code></pre>
            </div>
            
            <div className="info-box info">
              <Info size={20} />
              <p>
                <strong>Note:</strong> The model is automatically loaded on first use 
                and cached for subsequent operations.
              </p>
            </div>
          </div>
        </motion.section>
        
        {/* Best Practices */}
        <motion.section
          className="docs-section"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="docs-section-title">
            <CheckCircle size={24} />
            Best Practices
          </h2>
          
          <div className="docs-content">
            <div className="tips-grid">
              <div className="tip-card success">
                <CheckCircle size={24} />
                <h3>Do</h3>
                <ul>
                  <li>Use high-quality source images</li>
                  <li>Process images under 2048×2048 for best speed</li>
                  <li>Use PNG format for lossless quality</li>
                  <li>Allow model to load on first use</li>
                  <li>Use AI mode for photographic images</li>
                </ul>
              </div>
              
              <div className="tip-card warning">
                <AlertCircle size={24} />
                <h3>Avoid</h3>
                <ul>
                  <li>Extremely compressed source images</li>
                  <li>Images with heavy artifacts</li>
                  <li>Very low resolution sources (&lt; 100px)</li>
                  <li>Processing during low memory conditions</li>
                  <li>Multiple simultaneous processes</li>
                </ul>
              </div>
            </div>
          </div>
        </motion.section>
        
        {/* FAQ */}
        <motion.section
          className="docs-section"
          id="faq"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="docs-section-title">
            <HelpCircle size={24} />
            Frequently Asked Questions
          </h2>
          
          <div className="docs-content">
            <div className="faq-list">
              {faqs.map((faq, index) => (
                <motion.details
                  key={index}
                  className="faq-item"
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                >
                  <summary className="faq-question">
                    <HelpCircle size={20} />
                    <span>{faq.question}</span>
                  </summary>
                  <div className="faq-answer">
                    <p>{faq.answer}</p>
                  </div>
                </motion.details>
              ))}
            </div>
          </div>
        </motion.section>
        
        {/* Support */}
        <motion.section
          className="docs-section support-section"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="docs-section-title">Need Help?</h2>
          
          <div className="support-content">
            <p>
              Can't find what you're looking for? We're here to help!
            </p>
            
            <div className="support-links">
              <a href="https://github.com/visionupscale/issues" className="btn btn-primary">
                Report an Issue
              </a>
              <a href="/about#contact" className="btn btn-secondary">
                Contact Us
              </a>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
