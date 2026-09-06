const router = require('express').Router();
const { computeHealthScore } = require('../services/FinancialHealthService');

// GET /api/business-health?merchantId=merchant_001
router.get('/', async (req, res) => {
  try {
    const merchantId = req.query.merchantId || process.env.DEMO_MERCHANT_ID;
    const result = await computeHealthScore(merchantId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
