const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  type: { type: String, enum: ['CREDIT', 'PAYMENT'], required: true },
  amount: { type: Number, required: true },
  date: { type: Date, required: true },
  note: { type: String, default: '' },
  productId: { type: String, default: null }
});

const customerSchema = new mongoose.Schema({
  customerId: { type: String, required: true, unique: true },
  merchantId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  creditLimit: { type: Number, default: 5000 },
  currentDue: { type: Number, default: 0 },
  lastPaymentDate: { type: Date, default: null },
  transactions: [transactionSchema],
  isOverdue: { type: Boolean, default: false },
  overdueSince: { type: Date, default: null },
  whatsappReminderSentAt: { type: Date, default: null }
}, { timestamps: true });

customerSchema.index({ merchantId: 1, isOverdue: 1 });

module.exports = mongoose.model('Customer', customerSchema);
