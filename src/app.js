const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const env = require('./config/env');
const procurementRoutes = require('./routes/procurementRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');

const app = express();
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

const allowedClientOrigin = env.clientUrl ? env.clientUrl.replace(/\/+$/, '') : '*';
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedClientOrigin === '*' || origin.replace(/\/+$/, '') === allowedClientOrigin) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('combined'));
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'procurement-match-api' }));
app.use('/api', procurementRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((error, req, res, next) => {
  if (error.name === 'ValidationError') return res.status(400).json({ error: 'Database validation failed', details: Object.values(error.errors).map(item => item.message) });
  if (error.code === 11000) return res.status(409).json({ error: 'Duplicate record', fields: error.keyValue });
  const status = error.status || 500;
  res.status(status).json({ error: status === 500 ? 'Internal server error' : error.message, details: error.details });
});

module.exports = app;
