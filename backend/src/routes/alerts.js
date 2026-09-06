const router = require('express').Router();
const Inventory = require('../models/Inventory');
const Product = require('../models/Product');

// GET /api/alerts?merchantId=
router.get('/', async (req, res) => {
  try {
    const merchantId = req.query.merchantId || process.env.DEMO_MERCHANT_ID;
    const inventoryItems = await Inventory.find({ merchantId });
    const alerts = [];

    for (const inv of inventoryItems) {
      const product = await Product.findOne({ productId: inv.productId });
      if (!product) continue;

      if (inv.daysToStockout <= 2 && inv.velocityTier !== 'DEAD') {
        alerts.push({ type: 'CRITICAL_STOCKOUT', productId: inv.productId, productName: product.name,
          message: `${product.name} will stock out in ${inv.daysToStockout} days`, daysToStockout: inv.daysToStockout });
      } else if (inv.daysToStockout <= 7 && inv.velocityTier !== 'DEAD') {
        alerts.push({ type: 'STOCKOUT_WARNING', productId: inv.productId, productName: product.name,
          message: `${product.name}: only ${inv.daysToStockout} days of stock`, daysToStockout: inv.daysToStockout });
      }

      if (inv.velocityTier === 'DEAD') {
        const capitalLocked = inv.quantity * product.purchasePrice;
        if (capitalLocked > 5000) {
          alerts.push({ type: 'DEAD_STOCK', productId: inv.productId, productName: product.name,
            message: `₹${capitalLocked.toLocaleString('en-IN')} locked in ${product.name} (90+ day stock)`, capitalLocked });
        }
      }

      if (product.perishable && inv.batchExpiryDate) {
        const daysToExpiry = Math.ceil((new Date(inv.batchExpiryDate) - new Date()) / (1000 * 60 * 60 * 24));
        if (daysToExpiry <= 3 && daysToExpiry > 0) {
          alerts.push({ type: 'EXPIRY_WARNING', productId: inv.productId, productName: product.name,
            message: `${product.name} expires in ${daysToExpiry} days`, daysToExpiry });
        }
      }
    }

    alerts.sort((a, b) => {
      const priority = { CRITICAL_STOCKOUT: 0, EXPIRY_WARNING: 1, STOCKOUT_WARNING: 2, DEAD_STOCK: 3 };
      return (priority[a.type] || 99) - (priority[b.type] || 99);
    });

    res.json({ alerts, criticalCount: alerts.filter(a => a.type === 'CRITICAL_STOCKOUT').length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
