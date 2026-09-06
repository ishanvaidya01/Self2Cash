const mongoose = require('mongoose');

const visionVerificationSchema = new mongoose.Schema({
  verifyId: { type: String, required: true, unique: true },
  merchantId: { type: String, required: true, index: true },
  productId: { type: String, required: true },
  productName: { type: String, required: true },
  digitalCount: { type: Number, required: true },
  cvCount: { type: Number, required: true },
  mismatch: { type: Number, required: true }, // digitalCount - cvCount (positive = shrinkage)
  mismatchPercent: { type: Number, required: true },
  financialImpact: { type: Number, required: true }, // mismatch × purchasePrice
  confidence: { type: Number, min: 0, max: 1, default: 0.85 },
  timestamp: { type: Date, default: Date.now },
  imageRef: { type: String, default: null }, // filename or URL
  status: {
    type: String,
    enum: ['PENDING_REVIEW', 'CONFIRMED', 'DISMISSED'],
    default: 'PENDING_REVIEW'
  },
  // Classification of discrepancy cause
  discrepancyCause: {
    type: String,
    enum: ['SHRINKAGE', 'UNBILLED_SALE', 'DAMAGE', 'COUNTING_ERROR', 'UNKNOWN'],
    default: 'UNKNOWN'
  }
}, { timestamps: true });

module.exports = mongoose.model('VisionVerification', visionVerificationSchema);
