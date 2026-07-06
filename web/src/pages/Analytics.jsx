/**
 * Analytics Page
 * ==============
 * Dashboard analytics with charts and statistics.
 */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, BarChart3, PieChart as PieChartIcon, Calendar } from 'lucide-react';

export default function Analytics() {
  const [timeRange, setTimeRange] = useState('month');

  // Mock analytics data
  const processingTrendData = [
    { date: 'Jan 1', count: 5, avgTime: 2.1 },
    { date: 'Jan 2', count: 8, avgTime: 2.0 },
    { date: 'Jan 3', count: 12, avgTime: 2.2 },
    { date: 'Jan 4', count: 6, avgTime: 1.9 },
    { date: 'Jan 5', count: 15, avgTime: 2.3 },
    { date: 'Jan 6', count: 11, avgTime: 2.0 },
    { date: 'Jan 7', count: 18, avgTime: 2.1 },
  ];

  const methodDistribution = [
    { name: 'ESRGAN', value: 85, color: '#6366f1' },
    { name: 'Bicubic', value: 15, color: '#8b5cf6' },
  ];

  const resolutionData = [
    { range: '<1MP', count: 12 },
    { range: '1-5MP', count: 28 },
    { range: '5-10MP', count: 35 },
    { range: '>10MP', count: 25 },
  ];

  const stats = useMemo(() => ({
    totalImages: 100,
    successRate: 99.2,
    avgProcessingTime: 2.1,
    totalStorage: 15.4,
    esrganCount: 85,
    bicubicCount: 15,
    avgImageSize: 2.8,
  }), []);

  return (
    <div className="analytics-page">
      <motion.div
        className="analytics-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-description">Track your image enhancement statistics</p>
        </div>

        <div className="time-range-selector">
          <button
            className={`range-button ${timeRange === 'week' ? 'active' : ''}`}
            onClick={() => setTimeRange('week')}
          >
            Week
          </button>
          <button
            className={`range-button ${timeRange === 'month' ? 'active' : ''}`}
            onClick={() => setTimeRange('month')}
          >
            Month
          </button>
          <button
            className={`range-button ${timeRange === 'year' ? 'active' : ''}`}
            onClick={() => setTimeRange('year')}
          >
            Year
          </button>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        className="stats-grid"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <div className="stat-card">
          <BarChart3 size={24} color="var(--color-primary)" />
          <div className="stat-info">
            <p className="stat-label">Total Images</p>
            <p className="stat-value">{stats.totalImages}</p>
          </div>
        </div>

        <div className="stat-card">
          <TrendingUp size={24} color="var(--color-success)" />
          <div className="stat-info">
            <p className="stat-label">Success Rate</p>
            <p className="stat-value">{stats.successRate}%</p>
          </div>
        </div>

        <div className="stat-card">
          <Calendar size={24} color="var(--color-secondary)" />
          <div className="stat-info">
            <p className="stat-label">Avg Processing</p>
            <p className="stat-value">{stats.avgProcessingTime}s</p>
          </div>
        </div>

        <div className="stat-card">
          <PieChartIcon size={24} color="var(--color-accent)" />
          <div className="stat-info">
            <p className="stat-label">Storage Used</p>
            <p className="stat-value">{stats.totalStorage}GB</p>
          </div>
        </div>
      </motion.div>

      {/* Charts */}
      <motion.div
        className="charts-grid"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {/* Trend Chart */}
        <div className="chart-container">
          <h3>Processing Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={processingTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" stroke="var(--color-text-tertiary)" />
              <YAxis stroke="var(--color-text-tertiary)" />
              <Tooltip
                contentStyle={{
                  background: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-text-primary)',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="count"
                stroke="var(--color-primary)"
                strokeWidth={2}
                dot={{ fill: 'var(--color-primary)' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Resolution Distribution */}
        <div className="chart-container">
          <h3>Resolution Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={resolutionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="range" stroke="var(--color-text-tertiary)" />
              <YAxis stroke="var(--color-text-tertiary)" />
              <Tooltip
                contentStyle={{
                  background: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-text-primary)',
                }}
              />
              <Bar dataKey="count" fill="var(--color-secondary)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Method Distribution */}
        <div className="chart-container">
          <h3>Method Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={methodDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {methodDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-text-primary)',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Summary Statistics */}
        <div className="summary-card">
          <h3>Summary</h3>
          <div className="summary-items">
            <div className="summary-item">
              <span className="summary-label">ESRGAN Upscales:</span>
              <span className="summary-value">{stats.esrganCount}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Bicubic Upscales:</span>
              <span className="summary-value">{stats.bicubicCount}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Avg Image Size:</span>
              <span className="summary-value">{stats.avgImageSize}MB</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Total Storage:</span>
              <span className="summary-value">{stats.totalStorage}GB</span>
            </div>
          </div>
        </div>
      </motion.div>

      <style jsx>{`
        .analytics-page {
          padding: 2rem;
          min-height: calc(100vh - 80px);
          background: var(--color-bg-primary);
        }

        .analytics-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
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

        .time-range-selector {
          display: flex;
          gap: 0.5rem;
        }

        .range-button {
          padding: 0.5rem 1rem;
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          color: var(--color-text-secondary);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .range-button:hover {
          border-color: var(--color-primary);
          color: var(--color-primary);
        }

        .range-button.active {
          background: var(--color-primary);
          color: white;
          border-color: var(--color-primary);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.5rem;
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
        }

        .stat-info {
          flex: 1;
        }

        .stat-label {
          font-size: 0.875rem;
          color: var(--color-text-secondary);
          margin: 0 0 0.25rem 0;
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0;
        }

        .charts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 2rem;
        }

        .chart-container {
          padding: 2rem;
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
        }

        .chart-container h3 {
          margin: 0 0 1.5rem 0;
          font-size: 1.125rem;
        }

        .summary-card {
          padding: 2rem;
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
        }

        .summary-card h3 {
          margin: 0 0 1.5rem 0;
          font-size: 1.125rem;
        }

        .summary-items {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .summary-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem;
          background: var(--color-bg-tertiary);
          border-radius: var(--radius-md);
        }

        .summary-label {
          color: var(--color-text-secondary);
        }

        .summary-value {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--color-primary);
        }

        @media (max-width: 768px) {
          .analytics-page {
            padding: 1rem;
          }

          .analytics-header {
            flex-direction: column;
            gap: 1rem;
          }

          .charts-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
