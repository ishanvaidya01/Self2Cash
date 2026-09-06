const router = require('express').Router();
const { getWorkingCapitalBreakdown, getCashConversionClock } = require('../services/WorkingCapitalService');

// GET /api/working-capital?merchantId=
router.get('/', async (req, res) => {
  try {
    const merchantId = req.query.merchantId || process.env.DEMO_MERCHANT_ID;
    const result = await getWorkingCapitalBreakdown(merchantId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/working-capital/clock/:productId?merchantId=
router.get('/clock/:productId', async (req, res) => {
  try {
    const merchantId = req.query.merchantId || process.env.DEMO_MERCHANT_ID;
    const result = await getCashConversionClock(merchantId, req.params.productId);
    if (!result) return res.status(404).json({ error: 'Not found' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
