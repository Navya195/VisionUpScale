/**
 * About Page
 * ==========
 * Information about VisionUpscale, technology, and team.
 */

import { motion } from 'framer-motion';
import { 
  Sparkles, Shield, Zap, Brain, Code, 
  Github, Mail, Heart, Award 
} from 'lucide-react';

export default function About() {
  const technologies = [
    { name: 'PyTorch', description: 'Deep learning framework' },
    { name: 'ONNX', description: 'Model interchange format' },
    { name: 'React', description: 'UI framework' },
    { name: 'WebAssembly', description: 'Near-native performance' },
    { name: 'ONNX Runtime Web', description: 'Browser inference' },
    { name: 'Vite', description: 'Build tool' }
  ];
  
  return (
    <div className="about-page">
      <div className="about-container">
        {/* Hero Section */}
        <motion.section
          className="about-hero"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="about-hero-icon">
            <Sparkles size={64} strokeWidth={2} />
          </div>
          
          <h1 className="page-title">About VisionUpscale</h1>
          <p className="page-subtitle">
            AI-powered image super-resolution that respects your privacy
          </p>
        </motion.section>
        
        {/* Mission Section */}
        <motion.section
          className="about-section"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="section-title">Our Mission</h2>
          <div className="section-content">
            <p>
              VisionUpscale brings professional-grade AI image enhancement to everyone, 
              completely free and private. We believe powerful image processing tools 
              should be accessible without compromising your privacy or requiring 
              expensive cloud infrastructure.
            </p>
            
            <p>
              By leveraging cutting-edge web technologies like WebAssembly and ONNX Runtime, 
              we enable state-of-the-art super-resolution entirely in your browser. 
              Your images never leave your device, ensuring complete privacy while 
              delivering exceptional results.
            </p>
          </div>
        </motion.section>
        
        {/* Technology Section */}
        <motion.section
          className="about-section"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="section-title">Technology Stack</h2>
          <div className="tech-grid">
            {technologies.map((tech, index) => (
              <motion.div
                key={index}
                className="tech-card"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -5 }}
              >
                <h3>{tech.name}</h3>
                <p>{tech.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>
        
        {/* How It Works */}
        <motion.section
          className="about-section"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="section-title">How It Works</h2>
          
          <div className="process-steps">
            <div className="process-step">
              <div className="step-number">1</div>
              <div className="step-icon"><Code size={24} /></div>
              <h3>Train the Model</h3>
              <p>
                ESRGAN model trained on DIV2K dataset using PyTorch with 
                23 RRDB blocks for exceptional quality.
              </p>
            </div>
            
            <div className="process-step">
              <div className="step-number">2</div>
              <div className="step-icon"><Zap size={24} /></div>
              <h3>Export to ONNX</h3>
              <p>
                Model converted to ONNX format for cross-platform compatibility 
                and optimized browser inference.
              </p>
            </div>
            
            <div className="process-step">
              <div className="step-number">3</div>
              <div className="step-icon"><Brain size={24} /></div>
              <h3>Browser Inference</h3>
              <p>
                ONNX Runtime Web executes the model using WebAssembly and WebGL 
                for near-native performance.
              </p>
            </div>
            
            <div className="process-step">
              <div className="step-number">4</div>
              <div className="step-icon"><Shield size={24} /></div>
              <h3>Private Processing</h3>
              <p>
                All processing happens locally on your device. 
                Images never leave your browser.
              </p>
            </div>
          </div>
        </motion.section>
        
        {/* Features Grid */}
        <motion.section
          className="about-section"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="section-title">Key Features</h2>
          
          <div className="features-list">
            <div className="feature-item">
              <Brain size={24} />
              <div>
                <h3>Advanced AI Model</h3>
                <p>
                  ESRGAN architecture with 23 RRDB blocks trained on professional datasets
                </p>
              </div>
            </div>
            
            <div className="feature-item">
              <Shield size={24} />
              <div>
                <h3>Complete Privacy</h3>
                <p>
                  Zero server uploads, all processing happens locally in your browser
                </p>
              </div>
            </div>
            
            <div className="feature-item">
              <Zap size={24} />
              <div>
                <h3>Fast Performance</h3>
                <p>
                  WebAssembly and WebGL acceleration for near-instant results
                </p>
              </div>
            </div>
            
            <div className="feature-item">
              <Award size={24} />
              <div>
                <h3>Professional Quality</h3>
                <p>
                  4× resolution increase with exceptional detail preservation
                </p>
              </div>
            </div>
          </div>
        </motion.section>
        
        {/* Contact Section */}
        <motion.section
          className="about-section contact-section"
          id="contact"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="section-title">Get in Touch</h2>
          
          <div className="contact-content">
            <p>
              Have questions, feedback, or want to contribute? 
              We'd love to hear from you!
            </p>
            
            <div className="contact-links">
              <a 
                href="https://github.com/visionupscale" 
                className="contact-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github size={24} />
                <span>GitHub</span>
              </a>
              
              <a 
                href="mailto:contact@visionupscale.com" 
                className="contact-link"
              >
                <Mail size={24} />
                <span>Email</span>
              </a>
            </div>
          </div>
        </motion.section>
        
        {/* Footer Message */}
        <motion.div
          className="about-footer-message"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <Heart size={20} className="heart" />
          <p>
            Built with passion for the open web and respect for user privacy
          </p>
        </motion.div>
      </div>
    </div>
  );
}
