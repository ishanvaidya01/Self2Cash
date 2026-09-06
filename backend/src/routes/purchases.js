const router = require('express').Router();
const Purchase = require('../models/Purchase');
const Inventory = require('../models/Inventory');
const { refreshInventoryMetrics } = require('../services/WorkingCapitalService');
const { v4: uuidv4 } = require('uuid');

// POST /api/purchases
router.post('/', async (req, res) => {
  try {
    const { merchantId = process.env.DEMO_MERCHANT_ID, productId, quantity, purchasePrice, supplierId, batchExpiryDate } = req.body;

    const purchase = await Purchase.create({
      purchaseId: uuidv4(),
      merchantId,
      productId,
      quantity,
      purchasePrice,
      totalAmount: quantity * purchasePrice,
      supplierId,
      timestamp: new Date(),
      batchExpiryDate: batchExpiryDate || null,
      paymentStatus: 'PAID'
    });

    // Add to inventory
    await Inventory.updateOne(
      { merchantId, productId },
      { $inc: { quantity }, lastUpdated: new Date(), ...(batchExpiryDate && { batchExpiryDate }) },
      { upsert: false }
    );

    await refreshInventoryMetrics(merchantId);
    res.json({ success: true, purchase });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/purchases?merchantId=
router.get('/', async (req, res) => {
  try {
    const merchantId = req.query.merchantId || process.env.DEMO_MERCHANT_ID;
    const purchases = await Purchase.find({ merchantId }).sort({ timestamp: -1 }).limit(50);
    res.json({ purchases });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
