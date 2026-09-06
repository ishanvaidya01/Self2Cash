const { pollMandiPrices } = require('../services/ExternalSignalService');

let isPolling = false;

async function poll() {
  if (isPolling) return;
  isPolling = true;
  try {
    console.log('[Job] Mandi price poll starting...');
    await pollMandiPrices();
  } catch (err) {
    console.error('[Job] Mandi poll error:', err.message);
  } finally {
    isPolling = false;
  }
}

module.exports = { poll };
