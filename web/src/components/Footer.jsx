/**
 * Footer Component
 * ================
 * Site footer with links and information.
 */

import { Heart, Github, Twitter, Mail } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-content">
          {/* About Section */}
          <div className="footer-section">
            <h3 className="footer-title">VisionUpscale</h3>
            <p className="footer-text">
              Edge-based image super-resolution powered by AI. 
              Enhance your images 4× with complete privacy - 
              all processing happens in your browser.
            </p>
          </div>
          
          {/* Quick Links */}
          <div className="footer-section">
            <h4 className="footer-subtitle">Quick Links</h4>
            <ul className="footer-links">
              <li><a href="/">Home</a></li>
              <li><a href="/upload">Upscale</a></li>
              <li><a href="/documentation">Documentation</a></li>
              <li><a href="/about">About</a></li>
            </ul>
          </div>
          
          {/* Resources */}
          <div className="footer-section">
            <h4 className="footer-subtitle">Resources</h4>
            <ul className="footer-links">
              <li><a href="https://github.com" target="_blank" rel="noopener noreferrer">GitHub</a></li>
              <li><a href="/documentation#api">API Reference</a></li>
              <li><a href="/documentation#faq">FAQ</a></li>
              <li><a href="/about#contact">Contact</a></li>
            </ul>
          </div>
          
          {/* Social */}
          <div className="footer-section">
            <h4 className="footer-subtitle">Connect</h4>
            <div className="footer-social">
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
                <Github size={20} />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
                <Twitter size={20} />
              </a>
              <a href="mailto:contact@visionupscale.com" aria-label="Email">
                <Mail size={20} />
              </a>
            </div>
          </div>
        </div>
        
        {/* Bottom Bar */}
        <div className="footer-bottom">
          <p className="footer-copyright">
            © {currentYear} VisionUpscale. Made with <Heart size={14} className="heart" /> for the web.
          </p>
          <div className="footer-bottom-links">
            <a href="/privacy">Privacy Policy</a>
            <span>•</span>
            <a href="/terms">Terms of Service</a>
            <span>•</span>
            <a href="/license">MIT License</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
