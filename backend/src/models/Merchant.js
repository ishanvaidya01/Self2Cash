const mongoose = require('mongoose');

const merchantSchema = new mongoose.Schema({
  merchantId: { type: String, required: true, unique: true },
  storeName: { type: String, required: true },
  ownerName: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, default: '' },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true } // [longitude, latitude]
  },
  meshRadiusMeters: { type: Number, default: 2000 },
  meshEnabled: { type: Boolean, default: true },
  businessType: { type: String, default: 'General Store' },
  gstNumber: { type: String, default: '' },
  monthlyTurnover: { type: Number, default: 0 },
  yearsInBusiness: { type: Number, default: 1 },
  // Financial health cache (updated by FinancialHealthService)
  healthScore: { type: Number, default: 0 },
  healthScoreUpdatedAt: { type: Date, default: null },
  // Auth
  passwordHash: { type: String, default: 'demo_hash' }
}, { timestamps: true });

merchantSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Merchant', merchantSchema);
