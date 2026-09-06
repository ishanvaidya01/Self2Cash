const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  productId: { type: String, required: true },
  merchantId: { type: String, required: true, index: true },
  quantity: { type: Number, required: true, min: 0 },
  reservedQuantity: { type: Number, default: 0 }, // qty reserved for mesh swaps
  lastUpdated: { type: Date, default: Date.now },
  batchExpiryDate: { type: Date, default: null },
  // Computed fields (updated by services)
  avgDailySales: { type: Number, default: 0 },
  daysToStockout: { type: Number, default: 999 },
  velocityTier: {
    type: String,
    enum: ['FAST', 'MEDIUM', 'SLOW', 'DEAD', 'UNKNOWN'],
    default: 'UNKNOWN'
  },
  capitalLocked: { type: Number, default: 0 }, // qty × purchasePrice
  lastVisionVerifiedAt: { type: Date, default: null },
  visionMismatchCount: { type: Number, default: 0 }
}, { timestamps: true });

inventorySchema.index({ merchantId: 1, productId: 1 }, { unique: true });
inventorySchema.index({ merchantId: 1, velocityTier: 1 });
inventorySchema.index({ merchantId: 1, daysToStockout: 1 });

module.exports = mongoose.model('Inventory', inventorySchema);
