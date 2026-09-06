const router = require('express').Router();
const { computeCreditScore } = require('../services/CreditScoreService');

// GET /api/credit-score/:merchantId
router.get('/:merchantId', async (req, res) => {
  try {
    const result = await computeCreditScore(req.params.merchantId);
    if (!result) return res.status(404).json({ error: 'Merchant not found' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
