const mongoose = require('mongoose');

const meshMatchSchema = new mongoose.Schema({
  matchId: { type: String, required: true, unique: true },
  surplusMerchantId: { type: String, required: true, index: true },
  surplusMerchantName: { type: String, required: true },
  shortageMerchantId: { type: String, required: true, index: true },
  shortageMerchantName: { type: String, required: true },
  productId: { type: String, required: true },
  productName: { type: String, required: true },
  category: { type: String, required: true },
  surplusQty: { type: Number, required: true },
  shortageQty: { type: Number, required: true }, // forecasted shortage in N days
  proposedTransferQty: { type: Number, required: true },
  distanceMeters: { type: Number, required: true },
  // Financial math
  surplusPurchasePrice: { type: Number, required: true },
  shortageSupplierPrice: { type: Number, required: true }, // what B would pay normally
  estimatedSavings: { type: Number, required: true }, // B's savings vs normal supplier
  transportCostEstimate: { type: Number, default: 50 },
  // Timing
  daysUntilShortageStockout: { type: Number, required: true },
  surplusDaysOfStock: { type: Number, required: true },
  status: {
    type: String,
    enum: ['PROPOSED', 'ACCEPTED', 'DECLINED', 'COMPLETED', 'EXPIRED'],
    default: 'PROPOSED'
  },
  proposedAt: { type: Date, default: Date.now },
  respondedAt: { type: Date, default: null },
  expiresAt: { type: Date, required: true }
}, { timestamps: true });

meshMatchSchema.index({ surplusMerchantId: 1, status: 1 });
meshMatchSchema.index({ shortageMerchantId: 1, status: 1 });
meshMatchSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('MeshMatch', meshMatchSchema);
