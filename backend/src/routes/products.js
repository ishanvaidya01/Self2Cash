const router = require('express').Router();
const Product = require('../models/Product');

router.post('/', async (req, res) => {
  try {
    const data = { ...req.body, merchantId: req.body.merchantId || process.env.DEMO_MERCHANT_ID };
    if (!data.productId) data.productId = `${data.merchantId}_${Date.now()}`;
    const product = await Product.create(data);
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const merchantId = req.query.merchantId || process.env.DEMO_MERCHANT_ID;
    const products = await Product.find({ merchantId, isActive: true }).sort({ category: 1, name: 1 });
    res.json({ products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
