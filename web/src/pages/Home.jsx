/**
 * Home Page
 * =========
 * Landing page with hero section, features, and CTA.
 */

import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Sparkles, Shield, Zap, Brain, Download, Eye, 
  Code, Cpu, ArrowRight, CheckCircle, Upload
} from 'lucide-react';
import FeatureCard from '../components/FeatureCard';

export default function Home() {
  const features = [
    {
      icon: Brain,
      title: '4× AI Upscaling',
      description: 'State-of-the-art ESRGAN model with 23 RRDB blocks for exceptional quality enhancement.'
    },
    {
      icon: Shield,
      title: '100% Private',
      description: 'Images never leave your device. All processing happens locally in your browser using WebAssembly.'
    },
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Optimized ONNX Runtime Web with WebGL acceleration for near-instant results.'
    },
    {
      icon: Cpu,
      title: 'Edge Computing',
      description: 'Zero server uploads, zero latency. Powered entirely by your device\'s computing power.'
    },
    {
      icon: Eye,
      title: 'Real-time Preview',
      description: 'Interactive before/after comparison slider to see the enhancement immediately.'
    },
    {
      icon: Download,
      title: 'Export Ready',
      description: 'Download your enhanced images in PNG or JPEG format with adjustable quality.'
    }
  ];
  
  const stats = [
    { value: '4×', label: 'Resolution Increase' },
    { value: '23', label: 'RRDB Blocks' },
    { value: '100%', label: 'Privacy Guaranteed' },
    { value: '0ms', label: 'Server Latency' }
  ];
  
  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-container">
          <motion.div
            className="hero-content"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <motion.div
              className="hero-badge"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Sparkles size={16} />
              <span>AI-Powered Image Enhancement</span>
            </motion.div>
            
            <h1 className="hero-title">
              Enhance Your Images
              <br />
              <span className="gradient-text">4× with AI</span>
            </h1>
            
            <p className="hero-description">
              Professional image super-resolution powered by ESRGAN. 
              Upscale photos, graphics, and artwork with exceptional quality - 
              all in your browser, completely private.
            </p>
            
            <div className="hero-buttons">
              <Link to="/upload" className="btn btn-primary btn-large">
                <Upload size={20} />
                <span>Start Upscaling</span>
                <ArrowRight size={18} />
              </Link>
              
              <Link to="/documentation" className="btn btn-secondary btn-large">
                <Code size={20} />
                <span>View Documentation</span>
              </Link>
            </div>
            
            <div className="hero-features">
              <div className="hero-feature">
                <CheckCircle size={18} />
                <span>No uploads required</span>
              </div>
              <div className="hero-feature">
                <CheckCircle size={18} />
                <span>Works offline</span>
              </div>
              <div className="hero-feature">
                <CheckCircle size={18} />
                <span>Free forever</span>
              </div>
            </div>
          </motion.div>
          
          <motion.div
            className="hero-visual"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="hero-visual-card">
              <div className="hero-visual-header">
                <div className="visual-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <span className="visual-title">VisionUpscale</span>
              </div>
              
              <div className="hero-visual-content" style={{ padding: 0, overflow: 'hidden' }}>
                <img 
                  src="/images/hero.png" 
                  alt="AI Enhancement" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              </div>
            </div>
          </motion.div>
        </div>
      </section>
      
      {/* Stats Section */}
      <section className="stats-section">
        <div className="stats-container">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              className="stat-card"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <h3 className="stat-value">{stat.value}</h3>
              <p className="stat-label">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>
      
      {/* Features Section */}
      <section className="features-section">
        <div className="features-container">
          <motion.div
            className="features-header"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="section-title">Powerful Features</h2>
            <p className="section-description">
              Everything you need for professional image enhancement, 
              powered by cutting-edge AI technology
            </p>
          </motion.div>
          
          <div className="features-grid">
            {features.map((feature, index) => (
              <FeatureCard
                key={index}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                delay={index * 0.1}
              />
            ))}
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="cta-section">
        <motion.div
          className="cta-container"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="cta-content">
            <h2 className="cta-title">Ready to enhance your images?</h2>
            <p className="cta-description">
              Start upscaling your images with AI-powered technology. 
              No sign-up required, completely free.
            </p>
            
            <Link to="/upload" className="btn btn-primary btn-large">
              <Sparkles size={20} />
              <span>Get Started Now</span>
              <ArrowRight size={18} />
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
