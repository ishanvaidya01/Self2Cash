/**
 * Shelf2Cash — Seed Runner
 * Usage: node src/seed/run.js
 * Clears all collections then inserts full multi-merchant dataset
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const { buildSeedData } = require('./seedData');

const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const Sale = require('../models/Sale');
const Purchase = require('../models/Purchase');
const Supplier = require('../models/Supplier');
const Customer = require('../models/Customer');
const Merchant = require('../models/Merchant');
const MeshMatch = require('../models/MeshMatch');
const FactoringQuote = require('../models/FactoringQuote');
const VisionVerification = require('../models/VisionVerification');
const ExternalSignal = require('../models/ExternalSignal');

async function seed() {
  console.log('🌱 Shelf2Cash Seed Runner');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB:', process.env.MONGODB_URI);

    // ─── Clear all collections ───────────────────────────────────────────────
    console.log('\n🗑  Clearing existing data...');
    await Promise.all([
      Product.deleteMany({}),
      Inventory.deleteMany({}),
      Sale.deleteMany({}),
      Purchase.deleteMany({}),
      Supplier.deleteMany({}),
      Customer.deleteMany({}),
      Merchant.deleteMany({}),
      MeshMatch.deleteMany({}),
      FactoringQuote.deleteMany({}),
      VisionVerification.deleteMany({}),
      ExternalSignal.deleteMany({})
    ]);
    console.log('✅ All collections cleared');

    // ─── Build data ──────────────────────────────────────────────────────────
    console.log('\n🔧 Building seed data...');
    const data = buildSeedData();
    console.log(`   → ${data.suppliers.length} suppliers`);
    console.log(`   → ${data.merchants.length} merchants`);
    console.log(`   → ${data.products.length} products`);
    console.log(`   → ${data.inventory.length} inventory records`);
    console.log(`   → ${data.sales.length} sale transactions`);
    console.log(`   → ${data.purchases.length} purchase records`);
    console.log(`   → ${data.customers.length} customers`);

    // ─── Insert data ─────────────────────────────────────────────────────────
    console.log('\n📥 Inserting data...');

    await Supplier.insertMany(data.suppliers);
    console.log('   ✅ Suppliers');

    await Merchant.insertMany(data.merchants);
    console.log('   ✅ Merchants');

    await Product.insertMany(data.products);
    console.log('   ✅ Products');

    await Inventory.insertMany(data.inventory);
    console.log('   ✅ Inventory');

    // Sales in batches of 500 to avoid memory issues
    for (let i = 0; i < data.sales.length; i += 500) {
      await Sale.insertMany(data.sales.slice(i, i + 500));
    }
    console.log(`   ✅ Sales (${data.sales.length} records)`);

    for (let i = 0; i < data.purchases.length; i += 200) {
      await Purchase.insertMany(data.purchases.slice(i, i + 200));
    }
    console.log(`   ✅ Purchases (${data.purchases.length} records)`);

    await Customer.insertMany(data.customers);
    console.log('   ✅ Customers');

    // ─── Seed a demo Mesh Match ──────────────────────────────────────────────
    console.log('\n🕸  Seeding demo Mesh match (Gupta → Patel, Cooking Oil)...');
    const demoMatch = {
      matchId: 'mesh_demo_001',
      surplusMerchantId: 'merchant_002',
      surplusMerchantName: 'Gupta Provisions',
      shortageMerchantId: 'merchant_003',
      shortageMerchantName: 'Patel Kirana Corner',
      productId: 'merchant_002_p008',
      productName: 'Refined Cooking Oil',
      category: 'Oils & Ghee',
      surplusQty: 160,
      shortageQty: 50,
      proposedTransferQty: 50,
      distanceMeters: 680,
      surplusPurchasePrice: 155,
      shortageSupplierPrice: 168, // Patel's normal supplier is slightly pricier
      estimatedSavings: (168 - 155) * 50 - 50, // savings = price diff × qty - transport
      transportCostEstimate: 50,
      daysUntilShortageStockout: 2,
      surplusDaysOfStock: 42,
      status: 'PROPOSED',
      proposedAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h
    };
    await MeshMatch.create(demoMatch);
    console.log('   ✅ Demo Mesh match created (₹600 estimated savings)');

    // ─── Seed festival calendar signals ─────────────────────────────────────
    console.log('\n🎪 Seeding festival signals...');
    const festivals = [
      { signalId: 'fest_navratri_2026', type: 'FESTIVAL', commodity: null, location: 'North India',
        payload: { name: 'Navratri', startDate: '2026-10-02', endDate: '2026-10-11', impact: 'HIGH',
          categories: ['Grains & Staples', 'Dairy & Beverages', 'Spices & Condiments'],
          demandMultiplier: 1.4, note: 'Fasting season — high demand for kuttu atta, sabudana, fruits, dairy' },
        fetchedAt: new Date(), expiresAt: new Date('2026-10-15'), isActive: true },
      { signalId: 'fest_diwali_2026', type: 'FESTIVAL', commodity: null, location: 'All India',
        payload: { name: 'Diwali', startDate: '2026-10-20', endDate: '2026-10-22', impact: 'VERY HIGH',
          categories: ['Biscuits & Snacks', 'Confectionery', 'Oils & Ghee'],
          demandMultiplier: 1.8, note: 'Gift hamper season — dry fruits, sweets, snacks surge' },
        fetchedAt: new Date(), expiresAt: new Date('2026-10-25'), isActive: true },
      { signalId: 'fest_schoolreopening_2026', type: 'FESTIVAL', commodity: null, location: 'All India',
        payload: { name: 'School Reopening', startDate: '2026-06-01', endDate: '2026-06-30', impact: 'MEDIUM',
          categories: ['Noodles & Pasta', 'Biscuits & Snacks', 'Dairy & Beverages'],
          demandMultiplier: 1.3, note: 'Tiffin box season — biscuits, juice, noodles rise' },
        fetchedAt: new Date(), expiresAt: new Date('2026-07-01'), isActive: false }
    ];
    await ExternalSignal.insertMany(festivals);
    console.log('   ✅ Festival signals seeded');

    // ─── Geospatial index verification ──────────────────────────────────────
    console.log('\n🗺  Verifying geospatial indexes...');
    await Merchant.collection.createIndex({ location: '2dsphere' });
    console.log('   ✅ 2dsphere index on merchants.location confirmed');

    // ─── Summary ─────────────────────────────────────────────────────────────
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ SEED COMPLETE');
    console.log('');
    console.log('Demo Scenario Verification:');
    
    const oil = await Inventory.findOne({ merchantId: 'merchant_001', productId: { $regex: 'p008' } });
    if (oil) {
      console.log(`   🛢  Sharma Cooking Oil: ${oil.quantity} units, ${oil.daysToStockout} days left [${oil.velocityTier}]`);
    }
    
    const biscuit = await Inventory.findOne({ merchantId: 'merchant_001', productId: { $regex: 'p011' } });
    if (biscuit) {
      console.log(`   🍪 Sharma Parle-G: ${biscuit.quantity} units, ${biscuit.daysToStockout} days left [${biscuit.velocityTier}]`);
    }
    
    const guptaOil = await Inventory.findOne({ merchantId: 'merchant_002', productId: { $regex: 'p008' } });
    if (guptaOil) {
      console.log(`   🕸  Gupta Cooking Oil (MESH): ${guptaOil.quantity} units, ${guptaOil.daysToStockout} days left [${guptaOil.velocityTier}]`);
    }
    
    const patelOil = await Inventory.findOne({ merchantId: 'merchant_003', productId: { $regex: 'p008' } });
    if (patelOil) {
      console.log(`   🕸  Patel Cooking Oil (MESH): ${patelOil.quantity} units, ${patelOil.daysToStockout} days left [${patelOil.velocityTier}]`);
    }

    const meshMatch = await MeshMatch.findOne({ matchId: 'mesh_demo_001' });
    if (meshMatch) {
      console.log(`   ✨ Mesh Match: ${meshMatch.surplusMerchantName} → ${meshMatch.shortageMerchantName}, ₹${meshMatch.estimatedSavings} savings`);
    }

    const overdueCustomers = await Customer.countDocuments({ merchantId: 'merchant_001', isOverdue: true });
    console.log(`   📒 Sharma Overdue Customers: ${overdueCustomers}`);
    
    const totalDue = await Customer.aggregate([
      { $match: { merchantId: 'merchant_001' } },
      { $group: { _id: null, total: { $sum: '$currentDue' } } }
    ]);
    if (totalDue.length > 0) {
      console.log(`   💰 Sharma Total Khata Due: ₹${totalDue[0].total.toLocaleString('en-IN')}`);
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

seed();
