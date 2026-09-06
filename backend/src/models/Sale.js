const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
  saleId: { type: String, required: true, unique: true },
  merchantId: { type: String, required: true, index: true },
  productId: { type: String, required: true, index: true },
  quantity: { type: Number, required: true, min: 1 },
  sellingPrice: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  paymentMode: {
    type: String,
    enum: ['CASH', 'UPI', 'CREDIT', 'CARD'],
    default: 'CASH'
  },
  customerId: { type: String, default: null }, // null = walk-in
  timestamp: { type: Date, required: true, index: true },
  isReturned: { type: Boolean, default: false }
}, { timestamps: true });

saleSchema.index({ merchantId: 1, timestamp: -1 });
saleSchema.index({ merchantId: 1, productId: 1, timestamp: -1 });

module.exports = mongoose.model('Sale', saleSchema);
