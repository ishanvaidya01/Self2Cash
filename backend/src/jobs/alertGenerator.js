const Inventory = require('../models/Inventory');
const Product = require('../models/Product');
const broadcaster = require('../websocket/meshBroadcaster');

async function generate() {
  try {
    // Find critical stockouts (< 3 days) across all active merchants
    const criticalItems = await Inventory.find({
      daysToStockout: { $lte: 3, $gt: 0 },
      velocityTier: { $nin: ['DEAD'] }
    });

    for (const inv of criticalItems) {
      const product = await Product.findOne({ productId: inv.productId });
      if (!product) continue;

      broadcaster.emitStockoutAlert(inv.merchantId, {
        productId: inv.productId,
        productName: product.name,
        daysToStockout: inv.daysToStockout,
        quantity: inv.quantity,
        avgDailySales: inv.avgDailySales,
        urgency: inv.daysToStockout < 2 ? 'CRITICAL' : 'HIGH'
      });
    }
  } catch (err) {
    console.error('[Job] Alert generation error:', err.message);
  }
}

module.exports = { generate };
