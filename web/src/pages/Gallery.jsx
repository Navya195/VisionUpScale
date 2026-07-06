/**
 * Gallery Page
 * ============
 * View, search, filter, and manage previous enhancements.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Trash2, Download, ChevronRight, Grid, List } from 'lucide-react';
import { Modal } from '../components/Modal';

export default function Gallery() {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [selectedImage, setSelectedImage] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Mock data
  const images = [
    { id: 1, name: 'vacation-photo', size: '2.4 MB', date: '2024-01-15', before: '1920x1080', after: '7680x4320' },
    { id: 2, name: 'artwork-scan', size: '1.8 MB', date: '2024-01-14', before: '800x600', after: '3200x2400' },
    { id: 3, name: 'old-photo', size: '3.2 MB', date: '2024-01-13', before: '640x480', after: '2560x1920' },
  ];

  const filteredImages = images.filter(img =>
    img.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePreview = (image) => {
    setSelectedImage(image);
    setIsPreviewOpen(true);
  };

  const handleDelete = (id) => {
    console.log('Delete image:', id);
  };

  const handleDownload = (id) => {
    console.log('Download image:', id);
  };

  return (
    <div className="gallery-page">
      <motion.div
        className="gallery-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="gallery-title-section">
          <h1 className="page-title">Gallery</h1>
          <p className="page-description">Manage your enhanced images</p>
        </div>

        <div className="gallery-controls">
          <div className="search-box">
            <Search size={20} />
            <input
              type="text"
              placeholder="Search images..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="view-mode-toggle">
            <button
              className={`view-button ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              <Grid size={18} />
            </button>
            <button
              className={`view-button ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </motion.div>

      <motion.div
        className={`gallery-content gallery-${viewMode}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        {filteredImages.length > 0 ? (
          <>
            {viewMode === 'grid' ? (
              <div className="gallery-grid">
                {filteredImages.map((image, index) => (
                  <motion.div
                    key={image.id}
                    className="gallery-card"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div className="gallery-card-image" onClick={() => handlePreview(image)}>
                      <div className="gallery-placeholder">
                        <span>{image.before}</span>
                      </div>
                      <div className="gallery-overlay">
                        <ChevronRight size={32} />
                      </div>
                    </div>
                    <div className="gallery-card-info">
                      <p className="gallery-card-name">{image.name}</p>
                      <p className="gallery-card-meta">{image.size} • {image.date}</p>
                      <div className="gallery-card-actions">
                        <button
                          className="action-button"
                          onClick={() => handleDownload(image.id)}
                          title="Download"
                        >
                          <Download size={18} />
                        </button>
                        <button
                          className="action-button delete"
                          onClick={() => handleDelete(image.id)}
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="gallery-list">
                {filteredImages.map((image, index) => (
                  <motion.div
                    key={image.id}
                    className="gallery-list-item"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div className="list-item-content" onClick={() => handlePreview(image)}>
                      <div className="list-item-info">
                        <p className="list-item-name">{image.name}</p>
                        <p className="list-item-meta">
                          {image.size} • {image.before} → {image.after} • {image.date}
                        </p>
                      </div>
                    </div>
                    <div className="list-item-actions">
                      <button
                        className="action-button"
                        onClick={() => handleDownload(image.id)}
                      >
                        <Download size={18} />
                      </button>
                      <button
                        className="action-button delete"
                        onClick={() => handleDelete(image.id)}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="gallery-empty">
            <div className="empty-icon">📸</div>
            <h3>No images found</h3>
            <p>Try adjusting your search or upload new images to get started</p>
          </div>
        )}
      </motion.div>

      {/* Preview Modal */}
      <Modal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title={selectedImage?.name}
        size="lg"
        footer={
          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={() => setIsPreviewOpen(false)}>
              Close
            </button>
            <button className="btn btn-primary" onClick={() => handleDownload(selectedImage?.id)}>
              <Download size={18} />
              Download
            </button>
          </div>
        }
      >
        <div className="preview-content">
          <div className="preview-placeholder">
            <p>Before: {selectedImage?.before}</p>
            <p>After: {selectedImage?.after}</p>
          </div>
          <div className="preview-info">
            <p><strong>Size:</strong> {selectedImage?.size}</p>
            <p><strong>Date:</strong> {selectedImage?.date}</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
