const router = require('express').Router();
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const { refreshInventoryMetrics } = require('../services/WorkingCapitalService');

// GET /api/inventory?merchantId=merchant_001
router.get('/', async (req, res) => {
  try {
    const merchantId = req.query.merchantId || process.env.DEMO_MERCHANT_ID;
    const items = await Inventory.find({ merchantId }).sort({ daysToStockout: 1 });
    const productIds = items.map(i => i.productId);
    const products = await Product.find({ productId: { $in: productIds } });
    const productMap = new Map(products.map(p => [p.productId, p]));

    const enriched = items.map(inv => ({
      ...inv.toObject(),
      product: productMap.get(inv.productId) || null
    }));

    res.json({ items: enriched, count: enriched.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/inventory/health?merchantId=merchant_001
router.get('/health', async (req, res) => {
  try {
    const merchantId = req.query.merchantId || process.env.DEMO_MERCHANT_ID;
    const items = await Inventory.find({ merchantId });

    const tierCounts = { FAST: 0, MEDIUM: 0, SLOW: 0, DEAD: 0, UNKNOWN: 0 };
    const stockoutRisks = [];

    for (const inv of items) {
      tierCounts[inv.velocityTier || 'UNKNOWN']++;
      if (inv.daysToStockout <= 7 && inv.velocityTier !== 'DEAD') {
        const product = await Product.findOne({ productId: inv.productId });
        if (product) {
          stockoutRisks.push({
            productId: inv.productId,
            name: product.name,
            category: product.category,
            daysToStockout: inv.daysToStockout,
            quantity: inv.quantity
          });
        }
      }
    }

    res.json({ tierCounts, stockoutRisks: stockoutRisks.sort((a, b) => a.daysToStockout - b.daysToStockout) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/inventory (update stock)
router.post('/', async (req, res) => {
  try {
    const { merchantId = process.env.DEMO_MERCHANT_ID, productId, quantity, batchExpiryDate } = req.body;
    const inv = await Inventory.findOneAndUpdate(
      { merchantId, productId },
      { quantity, batchExpiryDate, lastUpdated: new Date() },
      { new: true, upsert: true }
    );
    await refreshInventoryMetrics(merchantId);
    res.json(inv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
