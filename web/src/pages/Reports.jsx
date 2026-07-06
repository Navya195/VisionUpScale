/**
 * Reports Page
 * =============
 * Model training and performance reports.
 */

import { motion } from 'framer-motion';
import { Download, FileText, Calendar } from 'lucide-react';

export default function Reports() {
  const trainingReports = [
    {
      id: 1,
      name: 'ESRGAN Training Report Q1 2024',
      date: '2024-01-15',
      epochs: 400,
      finalPSNR: 32.45,
      finalSSIM: 0.8912,
      trainingTime: '48h 32m',
      datasetSize: 2650,
      size: '8.5 MB'
    },
    {
      id: 2,
      name: 'Model Quantization Report',
      date: '2024-01-10',
      epochs: '-',
      finalPSNR: 32.12,
      finalSSIM: 0.8805,
      trainingTime: '-',
      datasetSize: '-',
      size: '12.3 MB'
    }
  ];

  const trainingMetrics = [
    { label: 'Generator Loss (Final)', value: '0.0342' },
    { label: 'Discriminator Loss (Final)', value: '0.1255' },
    { label: 'PSNR Score', value: '32.45 dB' },
    { label: 'SSIM Score', value: '0.8912' },
    { label: 'Total Training Time', value: '48 hours 32 minutes' },
    { label: 'Average Epoch Time', value: '7 minutes 18 seconds' },
  ];

  const handleDownload = (id) => {
    console.log('Download report:', id);
  };

  return (
    <div className="reports-page">
      <motion.div
        className="reports-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-description">Model training and performance reports</p>
        </div>
      </motion.div>

      {/* Training Metrics */}
      <motion.div
        className="section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h2>Training Metrics</h2>
        <div className="metrics-grid">
          {trainingMetrics.map((metric, index) => (
            <motion.div
              key={index}
              className="metric-item"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
            >
              <span className="metric-label">{metric.label}</span>
              <span className="metric-value">{metric.value}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Training Reports */}
      <motion.div
        className="section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2>Training Reports</h2>
        <div className="reports-list">
          {trainingReports.map((report, index) => (
            <motion.div
              key={report.id}
              className="report-card"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
            >
              <div className="report-header">
                <FileText size={24} />
                <div className="report-info">
                  <h3>{report.name}</h3>
                  <p className="report-date">
                    <Calendar size={14} />
                    {report.date}
                  </p>
                </div>
              </div>

              <div className="report-details">
                <div className="detail">
                  <span>Epochs:</span>
                  <span className="value">{report.epochs}</span>
                </div>
                <div className="detail">
                  <span>Final PSNR:</span>
                  <span className="value">{report.finalPSNR}</span>
                </div>
                <div className="detail">
                  <span>Final SSIM:</span>
                  <span className="value">{report.finalSSIM}</span>
                </div>
                <div className="detail">
                  <span>Training Time:</span>
                  <span className="value">{report.trainingTime}</span>
                </div>
              </div>

              <button className="download-btn" onClick={() => handleDownload(report.id)}>
                <Download size={18} />
                Download ({report.size})
              </button>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <style jsx>{`
        .reports-page {
          padding: 2rem;
          min-height: calc(100vh - 80px);
          background: var(--color-bg-primary);
        }

        .reports-header {
          margin-bottom: 2rem;
        }

        .page-title {
          font-size: 2.5rem;
          margin-bottom: 0.5rem;
        }

        .page-description {
          font-size: 1.125rem;
          color: var(--color-text-secondary);
        }

        .section {
          margin-bottom: 3rem;
        }

        .section h2 {
          font-size: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
        }

        .metric-item {
          padding: 1.5rem;
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
        }

        .metric-label {
          display: block;
          font-size: 0.875rem;
          color: var(--color-text-secondary);
          margin-bottom: 0.75rem;
        }

        .metric-value {
          display: block;
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--color-primary);
        }

        .reports-list {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .report-card {
          padding: 2rem;
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
        }

        .report-header {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .report-header svg {
          color: var(--color-primary);
          flex-shrink: 0;
        }

        .report-info h3 {
          margin: 0 0 0.5rem 0;
          font-size: 1.125rem;
        }

        .report-date {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          color: var(--color-text-secondary);
          margin: 0;
        }

        .report-details {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
          padding: 1rem 0;
          border-top: 1px solid var(--color-border);
          border-bottom: 1px solid var(--color-border);
        }

        .detail {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .detail span {
          font-size: 0.875rem;
        }

        .detail .value {
          font-weight: 600;
          color: var(--color-primary);
        }

        .download-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: var(--color-primary);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .download-btn:hover {
          background: var(--color-primary-dark);
          transform: translateY(-2px);
        }

        @media (max-width: 768px) {
          .reports-page {
            padding: 1rem;
          }

          .metrics-grid,
          .report-details {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
