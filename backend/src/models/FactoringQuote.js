const mongoose = require('mongoose');

const factoringQuoteSchema = new mongoose.Schema({
  quoteId: { type: String, required: true, unique: true },
  merchantId: { type: String, required: true, index: true },
  productId: { type: String, required: true },
  productName: { type: String, required: true },
  // Projections
  projectedUnits7d: { type: Number, required: true },
  projectedRevenue7d: { type: Number, required: true },
  forecastConfidence: { type: Number, min: 0, max: 1, required: true },
  daysToStockout: { type: Number, required: true },
  // Quote terms
  advanceAmount: { type: Number, required: true }, // projectedRevenue × 0.85 × confidence
  feeRate: { type: Number, required: true }, // 2–4% based on confidence
  feeAmount: { type: Number, required: true },
  repaymentAmount: { type: Number, required: true },
  // Cash Conversion Clock source
  avgCashConversionDays: { type: Number, required: true },
  repaymentMechanism: { type: String, default: 'Auto-deducted as sales post' },
  status: {
    type: String,
    enum: ['QUOTED', 'ACCEPTED', 'DECLINED', 'REPAID'],
    default: 'QUOTED'
  },
  quotedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  acceptedAt: { type: Date, default: null }
}, { timestamps: true });

factoringQuoteSchema.index({ merchantId: 1, status: 1 });

module.exports = mongoose.model('FactoringQuote', factoringQuoteSchema);
