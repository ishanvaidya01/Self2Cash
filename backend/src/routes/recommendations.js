const router = require('express').Router();
const { getRecommendations } = require('../services/RecommendationService');

router.get('/', async (req, res) => {
  try {
    const merchantId = req.query.merchantId || process.env.DEMO_MERCHANT_ID;
    const result = await getRecommendations(merchantId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
