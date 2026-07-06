/**
 * Processing History Page
 * =======================
 * View all processed images with sorting and filtering.
 */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Download, Trash2, ChevronUp, ChevronDown, Eye } from 'lucide-react';

export default function History() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');

  // Mock data
  const mockHistory = [
    {
      id: 1,
      filename: 'vacation-photo.jpg',
      date: '2024-01-15',
      time: '14:30',
      originalSize: '1920x1080',
      upscaledSize: '7680x4320',
      processingTime: 2.1,
      inferenceTime: 1.8,
      method: 'ESRGAN',
      status: 'completed',
      scale: '4×',
    },
    {
      id: 2,
      filename: 'artwork-scan.png',
      date: '2024-01-14',
      time: '10:15',
      originalSize: '800x600',
      upscaledSize: '3200x2400',
      processingTime: 1.5,
      inferenceTime: 1.2,
      method: 'ESRGAN',
      status: 'completed',
      scale: '4×',
    },
    {
      id: 3,
      filename: 'old-photo.jpg',
      date: '2024-01-13',
      time: '09:45',
      originalSize: '640x480',
      upscaledSize: '2560x1920',
      processingTime: 1.2,
      inferenceTime: 0.9,
      method: 'Bicubic',
      status: 'completed',
      scale: '4×',
    },
    {
      id: 4,
      filename: 'screenshot.png',
      date: '2024-01-12',
      time: '16:20',
      originalSize: '1280x720',
      upscaledSize: '5120x2880',
      processingTime: 2.3,
      inferenceTime: 2.0,
      method: 'ESRGAN',
      status: 'completed',
      scale: '4×',
    },
  ];

  const filteredAndSorted = useMemo(() => {
    let items = mockHistory;

    // Filter by search term
    if (searchTerm) {
      items = items.filter(item =>
        item.filename.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (filterStatus !== 'all') {
      items = items.filter(item => item.status === filterStatus);
    }

    // Sort
    const [sortField, sortOrder] = sortBy.split('-');
    items.sort((a, b) => {
      let aValue, bValue;

      if (sortField === 'date') {
        aValue = new Date(a.date + ' ' + a.time);
        bValue = new Date(b.date + ' ' + b.time);
      } else if (sortField === 'time') {
        aValue = a.processingTime;
        bValue = b.processingTime;
      } else if (sortField === 'size') {
        aValue = parseInt(a.upscaledSize.split('x')[0]);
        bValue = parseInt(b.upscaledSize.split('x')[0]);
      } else {
        aValue = a.filename;
        bValue = b.filename;
      }

      return sortOrder === 'asc' ? (aValue > bValue ? 1 : -1) : (aValue < bValue ? 1 : -1);
    });

    return items;
  }, [searchTerm, filterStatus, sortBy]);

  const handleDelete = (id) => {
    console.log('Delete history item:', id);
  };

  const handleDownload = (id) => {
    console.log('Download history item:', id);
  };

  const handlePreview = (id) => {
    console.log('Preview history item:', id);
  };

  return (
    <div className="history-page">
      <motion.div
        className="history-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="header-title-section">
          <h1 className="page-title">Processing History</h1>
          <p className="page-description">View all your image enhancements</p>
        </div>
      </motion.div>

      <motion.div
        className="history-controls"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <div className="search-box">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search by filename..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="controls-group">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="filter-select"
          >
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="time-asc">Fastest First</option>
            <option value="time-desc">Slowest First</option>
            <option value="size-desc">Largest First</option>
            <option value="size-asc">Smallest First</option>
            <option value="name-asc">Name A-Z</option>
            <option value="name-desc">Name Z-A</option>
          </select>
        </div>
      </motion.div>

      <motion.div
        className="history-content"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {filteredAndSorted.length > 0 ? (
          <div className="history-table-wrapper">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Filename</th>
                  <th>Date & Time</th>
                  <th>Original</th>
                  <th>Enhanced</th>
                  <th>Processing Time</th>
                  <th>Method</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSorted.map((item, index) => (
                  <motion.tr
                    key={item.id}
                    className="history-row"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ backgroundColor: 'var(--color-bg-tertiary)' }}
                  >
                    <td className="filename-cell">
                      <span className="filename">{item.filename}</span>
                    </td>
                    <td>
                      <span className="date-time">
                        {item.date} {item.time}
                      </span>
                    </td>
                    <td>
                      <span className="resolution">{item.originalSize}</span>
                    </td>
                    <td>
                      <span className="resolution">
                        {item.upscaledSize}
                        <span className="scale-badge">{item.scale}</span>
                      </span>
                    </td>
                    <td>
                      <span className="time-badge">{item.processingTime.toFixed(2)}s</span>
                    </td>
                    <td>
                      <span className={`method-badge ${item.method.toLowerCase()}`}>
                        {item.method}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${item.status}`}>
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons-group">
                        <button
                          className="icon-button"
                          onClick={() => handlePreview(item.id)}
                          title="Preview"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          className="icon-button"
                          onClick={() => handleDownload(item.id)}
                          title="Download"
                        >
                          <Download size={18} />
                        </button>
                        <button
                          className="icon-button delete"
                          onClick={() => handleDelete(item.id)}
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h3>No history found</h3>
            <p>Your processed images will appear here</p>
          </div>
        )}
      </motion.div>

      <style jsx>{`
        .history-page {
          padding: 2rem;
          min-height: calc(100vh - 80px);
          background: var(--color-bg-primary);
        }

        .history-header {
          margin-bottom: 2rem;
        }

        .header-title-section {
          margin-bottom: 1.5rem;
        }

        .page-title {
          font-size: 2.5rem;
          margin-bottom: 0.5rem;
        }

        .page-description {
          font-size: 1.125rem;
          color: var(--color-text-secondary);
        }

        .history-controls {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
          flex-wrap: wrap;
        }

        .search-box {
          flex: 1;
          min-width: 250px;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          color: var(--color-text-primary);
        }

        .search-box input {
          flex: 1;
          background: transparent;
          border: none;
          color: var(--color-text-primary);
          font-size: 1rem;
        }

        .search-box input::placeholder {
          color: var(--color-text-tertiary);
        }

        .controls-group {
          display: flex;
          gap: 0.5rem;
        }

        .filter-select {
          padding: 0.75rem 1rem;
          background: var(--color-bg-secondary);
          color: var(--color-text-primary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          cursor: pointer;
        }

        .history-content {
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          overflow: hidden;
        }

        .history-table-wrapper {
          overflow-x: auto;
        }

        .history-table {
          width: 100%;
          border-collapse: collapse;
        }

        .history-table thead {
          background: var(--color-bg-tertiary);
        }

        .history-table th {
          padding: 1rem;
          text-align: left;
          font-weight: 600;
          color: var(--color-text-secondary);
          font-size: 0.875rem;
          border-bottom: 1px solid var(--color-border);
        }

        .history-table td {
          padding: 1rem;
          border-bottom: 1px solid var(--color-border);
          color: var(--color-text-primary);
          font-size: 0.875rem;
        }

        .history-row:last-child td {
          border-bottom: none;
        }

        .filename-cell {
          font-weight: 500;
        }

        .filename {
          display: inline-block;
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .date-time {
          color: var(--color-text-secondary);
        }

        .resolution {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .scale-badge {
          display: inline-block;
          padding: 0.25rem 0.5rem;
          background: var(--color-primary);
          color: white;
          border-radius: 3px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .time-badge {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          background: var(--color-bg-tertiary);
          border-radius: var(--radius-full);
          color: var(--color-primary);
          font-weight: 500;
        }

        .method-badge {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: var(--radius-full);
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .method-badge.esrgan {
          background: var(--color-primary);
          color: white;
        }

        .method-badge.bicubic {
          background: var(--color-secondary);
          color: white;
        }

        .status-badge {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: var(--radius-full);
          font-size: 0.75rem;
          font-weight: 600;
        }

        .status-badge.completed {
          background: var(--color-success);
          color: white;
        }

        .status-badge.failed {
          background: var(--color-error);
          color: white;
        }

        .action-buttons-group {
          display: flex;
          gap: 0.5rem;
        }

        .icon-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border: 1px solid var(--color-border);
          background: var(--color-bg-tertiary);
          border-radius: var(--radius-md);
          color: var(--color-text-secondary);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .icon-button:hover {
          background: var(--color-primary);
          color: white;
          border-color: var(--color-primary);
        }

        .icon-button.delete:hover {
          background: var(--color-error);
          border-color: var(--color-error);
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem 2rem;
          text-align: center;
          color: var(--color-text-secondary);
        }

        .empty-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .empty-state h3 {
          margin-bottom: 0.5rem;
        }

        @media (max-width: 1024px) {
          .history-table {
            font-size: 0.8rem;
          }

          .history-table th,
          .history-table td {
            padding: 0.75rem;
          }

          .filename {
            max-width: 150px;
          }
        }

        @media (max-width: 768px) {
          .history-page {
            padding: 1rem;
          }

          .history-controls {
            flex-direction: column;
          }

          .search-box {
            flex: 1 1 100%;
          }

          .controls-group {
            width: 100%;
            flex-direction: column;
          }

          .filter-select {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
