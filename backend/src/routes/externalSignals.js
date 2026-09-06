const router = require('express').Router();
const { getAllSignals, pollMandiPrices, pollWeather } = require('../services/ExternalSignalService');

// GET /api/external-signals?merchantId=
router.get('/', async (req, res) => {
  try {
    const result = await getAllSignals();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/external-signals/refresh — trigger immediate refresh
router.post('/refresh', async (req, res) => {
  try {
    await Promise.all([pollMandiPrices(), pollWeather()]);
    const result = await getAllSignals();
    res.json({ refreshed: true, signals: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
