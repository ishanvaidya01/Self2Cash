const router = require('express').Router();
const Sale = require('../models/Sale');
const Inventory = require('../models/Inventory');
const { refreshInventoryMetrics } = require('../services/WorkingCapitalService');
const { v4: uuidv4 } = require('uuid');

// POST /api/sales
router.post('/', async (req, res) => {
  try {
    const { merchantId = process.env.DEMO_MERCHANT_ID, productId, quantity, sellingPrice, paymentMode = 'CASH', customerId } = req.body;

    // Deduct from inventory
    const inv = await Inventory.findOne({ merchantId, productId });
    if (!inv || inv.quantity < quantity) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }

    const sale = await Sale.create({
      saleId: uuidv4(),
      merchantId,
      productId,
      quantity,
      sellingPrice,
      totalAmount: quantity * sellingPrice,
      paymentMode,
      customerId: customerId || null,
      timestamp: new Date()
    });

    await Inventory.updateOne({ merchantId, productId }, { $inc: { quantity: -quantity }, lastUpdated: new Date() });
    await refreshInventoryMetrics(merchantId);

    res.json({ success: true, sale });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sales?merchantId=&days=30
router.get('/', async (req, res) => {
  try {
    const merchantId = req.query.merchantId || process.env.DEMO_MERCHANT_ID;
    const days = parseInt(req.query.days || '30');
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const sales = await Sale.find({ merchantId, timestamp: { $gte: cutoff }, isReturned: false })
      .sort({ timestamp: -1 });

    const summary = await Sale.aggregate([
      { $match: { merchantId, timestamp: { $gte: cutoff }, isReturned: false } },
      { $group: {
        _id: null,
        totalRevenue: { $sum: '$totalAmount' },
        totalUnits: { $sum: '$quantity' },
        cashRevenue: { $sum: { $cond: [{ $eq: ['$paymentMode', 'CASH'] }, '$totalAmount', 0] } },
        upiRevenue: { $sum: { $cond: [{ $eq: ['$paymentMode', 'UPI'] }, '$totalAmount', 0] } },
        creditRevenue: { $sum: { $cond: [{ $eq: ['$paymentMode', 'CREDIT'] }, '$totalAmount', 0] } }
      }}
    ]);

    res.json({ sales: sales.slice(0, 100), summary: summary[0] || {}, days });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
