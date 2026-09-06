const router = require('express').Router();
const { generateQuote, acceptQuote, getQuotesForMerchant } = require('../services/MicroFactoringService');

// POST /api/factoring/quote
router.post('/quote', async (req, res) => {
  try {
    const { merchantId = process.env.DEMO_MERCHANT_ID, productId } = req.body;
    const result = await generateQuote(merchantId, productId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/factoring/accept
router.post('/accept', async (req, res) => {
  try {
    const { quoteId, merchantId = process.env.DEMO_MERCHANT_ID } = req.body;
    const result = await acceptQuote(quoteId, merchantId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/factoring/quotes?merchantId=
router.get('/quotes', async (req, res) => {
  try {
    const merchantId = req.query.merchantId || process.env.DEMO_MERCHANT_ID;
    const quotes = await getQuotesForMerchant(merchantId);
    res.json({ quotes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
