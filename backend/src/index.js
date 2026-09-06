require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const cron = require('node-cron');

const app = express();
const server = http.createServer(app);

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logger (dev only)
app.use((req, _res, next) => {
  if (process.env.NODE_ENV !== 'test') {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  }
  next();
});

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/products',     require('./routes/products'));
app.use('/api/inventory',    require('./routes/inventory'));
app.use('/api/sales',        require('./routes/sales'));
app.use('/api/purchases',    require('./routes/purchases'));
app.use('/api/alerts',       require('./routes/alerts'));
app.use('/api/working-capital', require('./routes/workingCapital'));
app.use('/api/forecast',     require('./routes/forecast'));
app.use('/api/recommendations', require('./routes/recommendations'));
app.use('/api/business-health', require('./routes/businessHealth'));
app.use('/api/simulate',     require('./routes/simulate'));
app.use('/api/external-signals', require('./routes/externalSignals'));
app.use('/api/vision',       require('./routes/vision'));
app.use('/api/khata',        require('./routes/khata'));
app.use('/api/credit-score', require('./routes/creditScore'));
app.use('/api/mesh',         require('./routes/mesh'));
app.use('/api/factoring',    require('./routes/factoring'));
app.use('/api/merchants',    require('./routes/merchants'));

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// ─── WebSocket Server ─────────────────────────────────────────────────────────
const wss = new WebSocket.Server({ server, path: '/ws' });
const meshBroadcaster = require('./websocket/meshBroadcaster');
meshBroadcaster.init(wss);

// ─── Background Jobs ──────────────────────────────────────────────────────────
const mandiPoller = require('./jobs/mandiPricePoller');
const meshScanner = require('./jobs/meshScanner');
const alertGenerator = require('./jobs/alertGenerator');

// Mandi price refresh every 6 hours
cron.schedule('0 */6 * * *', () => mandiPoller.poll());

// Mesh match scan every 30 seconds (configurable via env)
const meshInterval = parseInt(process.env.MESH_SCAN_INTERVAL_MS || '30000');
setInterval(() => meshScanner.scan(), meshInterval);

// Alert generation every 5 minutes
cron.schedule('*/5 * * * *', () => alertGenerator.generate());

// ─── MongoDB Connection ───────────────────────────────────────────────────────
async function start() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ MongoDB connected:', process.env.MONGODB_URI);

    // Run initial jobs on startup
    setTimeout(() => mandiPoller.poll(), 2000);
    setTimeout(() => meshScanner.scan(), 5000);
    setTimeout(() => alertGenerator.generate(), 8000);

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`🚀 Shelf2Cash Backend running on port ${PORT}`);
      console.log(`🕸  WebSocket server at ws://localhost:${PORT}/ws`);
    });
  } catch (err) {
    console.error('❌ Failed to connect to MongoDB:', err.message);
    process.exit(1);
  }
}

start();

module.exports = { app, server };
