const router = require('express').Router();
const { getForecast } = require('../services/ForecastService');

// GET /api/forecast/:productId?merchantId=
router.get('/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const merchantId = req.query.merchantId || process.env.DEMO_MERCHANT_ID;
    const result = await getForecast(merchantId, productId);
    if (!result) return res.status(404).json({ error: 'Product not found' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
