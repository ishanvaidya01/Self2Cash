const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema({
  purchaseId: { type: String, required: true, unique: true },
  merchantId: { type: String, required: true, index: true },
  productId: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  purchasePrice: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  supplierId: { type: String, required: true },
  invoiceNumber: { type: String, default: '' },
  timestamp: { type: Date, required: true, index: true },
  batchExpiryDate: { type: Date, default: null },
  paymentStatus: {
    type: String,
    enum: ['PAID', 'CREDIT', 'PARTIAL'],
    default: 'PAID'
  }
}, { timestamps: true });

purchaseSchema.index({ merchantId: 1, timestamp: -1 });
purchaseSchema.index({ merchantId: 1, productId: 1 });

module.exports = mongoose.model('Purchase', purchaseSchema);
