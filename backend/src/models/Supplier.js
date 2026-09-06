const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  supplierId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  contactPhone: { type: String, default: '' },
  categories: [{ type: String }],
  leadTimeDays: { type: Number, default: 2 },
  reliabilityScore: { type: Number, min: 0, max: 100, default: 80 },
  priceHistory: [{
    productId: String,
    price: Number,
    date: Date
  }],
  address: { type: String, default: '' },
  paymentTermsDays: { type: Number, default: 7 } // credit days offered
}, { timestamps: true });

module.exports = mongoose.model('Supplier', supplierSchema);
