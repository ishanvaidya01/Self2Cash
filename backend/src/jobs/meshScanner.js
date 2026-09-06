const { runMatchScan } = require('../services/MeshMatchingService');

let isScanning = false;

async function scan() {
  if (isScanning) return;
  isScanning = true;
  try {
    await runMatchScan();
  } catch (err) {
    console.error('[Job] Mesh scan error:', err.message);
  } finally {
    isScanning = false;
  }
}

module.exports = { scan };
