const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  productId: { type: String, required: true, unique: true },
  merchantId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  brand: { type: String, default: '' },
  barcode: { type: String, default: '' },
  category: {
    type: String,
    required: true,
    enum: ['Grains & Staples', 'Oils & Ghee', 'Biscuits & Snacks', 'Personal Care', 'Household', 'Dairy & Beverages', 'Spices & Condiments', 'Noodles & Pasta', 'Confectionery', 'Other']
  },
  purchasePrice: { type: Number, required: true },
  sellingPrice: { type: Number, required: true },
  unit: { type: String, default: 'unit' }, // kg, litre, unit, pack
  supplierId: { type: String, required: true },
  perishable: { type: Boolean, default: false },
  shelfLifeDays: { type: Number, default: 365 },
  minStockLevel: { type: Number, default: 10 },
  reorderQuantity: { type: Number, default: 50 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

productSchema.index({ merchantId: 1, category: 1 });
productSchema.index({ barcode: 1 });

module.exports = mongoose.model('Product', productSchema);
