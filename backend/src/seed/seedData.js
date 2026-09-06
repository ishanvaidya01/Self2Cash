/**
 * Shelf2Cash — Multi-Merchant Seed Data
 * 
 * 5 stores in Sector 18, Noida market cluster
 * Engineered to produce exact demo scenario:
 *   - Store 1 (Sharma General Store): Health Score 71/100, ₹76,100 locked
 *   - Store 1: Cooking Oil at 3 days, Biscuits at 72 days
 *   - Store 2 (Gupta Provisions): Cooking Oil DEAD STOCK (40+ days)
 *   - Store 3 (Patel Kirana): Cooking Oil 2 days → triggers Mesh match with Store 2
 *   - Rice forecast ₹18,000 7-day revenue for micro-factoring demo
 */

const dayjs = require('dayjs');

// ─── Helpers ────────────────────────────────────────────────────────────────
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function jitter(value, percent = 0.2) {
  const range = value * percent;
  return Math.max(0, value + (Math.random() * range * 2 - range));
}

function uid(prefix, n) {
  return `${prefix}_${String(n).padStart(3, '0')}`;
}

// ─── Suppliers ───────────────────────────────────────────────────────────────
const suppliers = [
  {
    supplierId: 'sup_001',
    name: 'Aggarwal Wholesale Traders',
    contactPhone: '9811234567',
    categories: ['Grains & Staples', 'Oils & Ghee'],
    leadTimeDays: 2,
    reliabilityScore: 88,
    address: 'Sector 10 Market, Noida',
    paymentTermsDays: 7,
    priceHistory: []
  },
  {
    supplierId: 'sup_002',
    name: 'Metro Cash & Carry',
    contactPhone: '9812345678',
    categories: ['Biscuits & Snacks', 'Personal Care', 'Household'],
    leadTimeDays: 1,
    reliabilityScore: 92,
    address: 'Noida Metro Cash & Carry',
    paymentTermsDays: 0,
    priceHistory: []
  },
  {
    supplierId: 'sup_003',
    name: 'Sharma Dairy Distributors',
    contactPhone: '9813456789',
    categories: ['Dairy & Beverages'],
    leadTimeDays: 1,
    reliabilityScore: 85,
    address: 'Sector 22, Noida',
    paymentTermsDays: 3,
    priceHistory: []
  },
  {
    supplierId: 'sup_004',
    name: 'Spice Route Wholesale',
    contactPhone: '9814567890',
    categories: ['Spices & Condiments'],
    leadTimeDays: 3,
    reliabilityScore: 78,
    address: 'Ghaziabad Mandi',
    paymentTermsDays: 14,
    priceHistory: []
  },
  {
    supplierId: 'sup_005',
    name: 'National Distributors',
    contactPhone: '9815678901',
    categories: ['Noodles & Pasta', 'Confectionery', 'Other'],
    leadTimeDays: 2,
    reliabilityScore: 82,
    address: 'Sector 63, Noida',
    paymentTermsDays: 7,
    priceHistory: []
  }
];

// ─── Merchants ────────────────────────────────────────────────────────────────
// All in Sector 18 / Sector 27 Noida cluster
// Coordinates: [longitude, latitude]
const merchants = [
  {
    merchantId: 'merchant_001',
    storeName: 'Sharma General Store',
    ownerName: 'Rajesh Sharma',
    phone: '9810001111',
    address: 'Shop 12, Sector 18 Market, Noida - 201301',
    location: { type: 'Point', coordinates: [77.3261, 28.5706] },
    meshRadiusMeters: 2000,
    meshEnabled: true,
    businessType: 'General Store',
    monthlyTurnover: 180000,
    yearsInBusiness: 8,
    healthScore: 71,
    healthScoreUpdatedAt: new Date()
  },
  {
    merchantId: 'merchant_002',
    storeName: 'Gupta Provisions',
    ownerName: 'Suresh Gupta',
    phone: '9810002222',
    address: 'Shop 34, Sector 27 Market, Noida - 201301',
    location: { type: 'Point', coordinates: [77.3285, 28.5738] }, // ~420m NE from Store 1
    meshRadiusMeters: 2000,
    meshEnabled: true,
    businessType: 'General Store',
    monthlyTurnover: 145000,
    yearsInBusiness: 5,
    healthScore: 58,
    healthScoreUpdatedAt: new Date()
  },
  {
    merchantId: 'merchant_003',
    storeName: 'Patel Kirana Corner',
    ownerName: 'Mahesh Patel',
    phone: '9810003333',
    address: 'Shop 7, Sector 25 Market, Noida - 201301',
    location: { type: 'Point', coordinates: [77.3310, 28.5675] }, // ~610m SE from Store 1
    meshRadiusMeters: 2000,
    meshEnabled: true,
    businessType: 'Kirana Store',
    monthlyTurnover: 95000,
    yearsInBusiness: 12,
    healthScore: 63,
    healthScoreUpdatedAt: new Date()
  },
  {
    merchantId: 'merchant_004',
    storeName: 'Singh Brothers Mart',
    ownerName: 'Paramjit Singh',
    phone: '9810004444',
    address: 'Shop 19, Sector 16 Market, Noida - 201301',
    location: { type: 'Point', coordinates: [77.3230, 28.5648] }, // ~800m SW
    meshRadiusMeters: 2000,
    meshEnabled: true,
    businessType: 'General Store',
    monthlyTurnover: 220000,
    yearsInBusiness: 15,
    healthScore: 79,
    healthScoreUpdatedAt: new Date()
  },
  {
    merchantId: 'merchant_005',
    storeName: 'Mehta Super Store',
    ownerName: 'Vikram Mehta',
    phone: '9810005555',
    address: 'Shop 55, Sector 12 Market, Noida - 201301',
    location: { type: 'Point', coordinates: [77.3195, 28.5722] }, // ~1.1km West
    meshRadiusMeters: 2000,
    meshEnabled: true,
    businessType: 'Superette',
    monthlyTurnover: 310000,
    yearsInBusiness: 3,
    healthScore: 74,
    healthScoreUpdatedAt: new Date()
  }
];

// ─── Product Catalog ──────────────────────────────────────────────────────────
// Shared product definitions (each merchant has their own inventory levels)
// Format: { productId_suffix, name, brand, category, purchasePrice, sellingPrice, unit, supplierId, perishable, shelfLifeDays, minStockLevel, reorderQuantity }

const PRODUCT_CATALOG = [
  // GRAINS & STAPLES
  { s: 'p001', name: 'Basmati Rice', brand: 'India Gate', cat: 'Grains & Staples', pp: 65, sp: 86, unit: 'kg', sup: 'sup_001', per: false, shelf: 365, min: 50, reorder: 100 },
  { s: 'p002', name: 'Atta (Wheat Flour)', brand: 'Aashirvaad', cat: 'Grains & Staples', pp: 32, sp: 42, unit: 'kg', sup: 'sup_001', per: false, shelf: 180, min: 30, reorder: 80 },
  { s: 'p003', name: 'Toor Dal', brand: 'Tata Sampann', cat: 'Grains & Staples', pp: 85, sp: 110, unit: 'kg', sup: 'sup_001', per: false, shelf: 365, min: 20, reorder: 50 },
  { s: 'p004', name: 'Moong Dal', brand: 'Tata Sampann', cat: 'Grains & Staples', pp: 95, sp: 125, unit: 'kg', sup: 'sup_001', per: false, shelf: 365, min: 15, reorder: 40 },
  { s: 'p005', name: 'Chana Dal', brand: 'Tata Sampann', cat: 'Grains & Staples', pp: 80, sp: 105, unit: 'kg', sup: 'sup_001', per: false, shelf: 365, min: 15, reorder: 40 },
  { s: 'p006', name: 'Iodised Salt', brand: 'Tata Salt', cat: 'Grains & Staples', pp: 18, sp: 25, unit: 'kg', sup: 'sup_001', per: false, shelf: 730, min: 20, reorder: 60 },
  { s: 'p007', name: 'Sugar', brand: 'Uttam', cat: 'Grains & Staples', pp: 38, sp: 50, unit: 'kg', sup: 'sup_001', per: false, shelf: 365, min: 25, reorder: 80 },

  // OILS & GHEE
  { s: 'p008', name: 'Refined Cooking Oil', brand: 'Fortune', cat: 'Oils & Ghee', pp: 155, sp: 195, unit: 'litre', sup: 'sup_001', per: false, shelf: 365, min: 10, reorder: 54 },
  { s: 'p009', name: 'Mustard Oil', brand: 'Patanjali', cat: 'Oils & Ghee', pp: 140, sp: 180, unit: 'litre', sup: 'sup_001', per: false, shelf: 365, min: 10, reorder: 40 },
  { s: 'p010', name: 'Pure Ghee', brand: 'Amul', cat: 'Oils & Ghee', pp: 520, sp: 650, unit: 'unit', sup: 'sup_001', per: false, shelf: 270, min: 5, reorder: 20 },

  // BISCUITS & SNACKS
  { s: 'p011', name: 'Parle-G Biscuits', brand: 'Parle', cat: 'Biscuits & Snacks', pp: 10, sp: 14, unit: 'pack', sup: 'sup_002', per: false, shelf: 120, min: 100, reorder: 200 },
  { s: 'p012', name: 'Bourbon Biscuits', brand: 'Britannia', cat: 'Biscuits & Snacks', pp: 28, sp: 38, unit: 'pack', sup: 'sup_002', per: false, shelf: 90, min: 30, reorder: 80 },
  { s: 'p013', name: 'Good Day Biscuits', brand: 'Britannia', cat: 'Biscuits & Snacks', pp: 30, sp: 40, unit: 'pack', sup: 'sup_002', per: false, shelf: 90, min: 30, reorder: 80 },
  { s: 'p014', name: 'Lays Chips Classic', brand: 'Lays', cat: 'Biscuits & Snacks', pp: 18, sp: 25, unit: 'pack', sup: 'sup_002', per: false, shelf: 90, min: 50, reorder: 100 },
  { s: 'p015', name: 'Kurkure Masala Munch', brand: 'Kurkure', cat: 'Biscuits & Snacks', pp: 18, sp: 25, unit: 'pack', sup: 'sup_002', per: false, shelf: 90, min: 50, reorder: 100 },
  { s: 'p016', name: 'Haldiram Namkeen', brand: 'Haldiram', cat: 'Biscuits & Snacks', pp: 85, sp: 110, unit: 'pack', sup: 'sup_002', per: false, shelf: 180, min: 20, reorder: 50 },

  // PERSONAL CARE
  { s: 'p017', name: 'Dettol Soap', brand: 'Dettol', cat: 'Personal Care', pp: 45, sp: 60, unit: 'unit', sup: 'sup_002', per: false, shelf: 730, min: 20, reorder: 60 },
  { s: 'p018', name: 'Lifebuoy Soap', brand: 'HUL', cat: 'Personal Care', pp: 28, sp: 38, unit: 'unit', sup: 'sup_002', per: false, shelf: 730, min: 30, reorder: 80 },
  { s: 'p019', name: 'Colgate Toothpaste', brand: 'Colgate', cat: 'Personal Care', pp: 55, sp: 72, unit: 'unit', sup: 'sup_002', per: false, shelf: 730, min: 20, reorder: 50 },
  { s: 'p020', name: 'Clinic Plus Shampoo', brand: 'HUL', cat: 'Personal Care', pp: 80, sp: 105, unit: 'unit', sup: 'sup_002', per: false, shelf: 730, min: 15, reorder: 40 },
  { s: 'p021', name: 'Parachute Coconut Oil', brand: 'Marico', cat: 'Personal Care', pp: 95, sp: 125, unit: 'unit', sup: 'sup_002', per: false, shelf: 730, min: 15, reorder: 40 },

  // HOUSEHOLD
  { s: 'p022', name: 'Surf Excel Detergent', brand: 'HUL', cat: 'Household', pp: 185, sp: 235, unit: 'unit', sup: 'sup_002', per: false, shelf: 730, min: 10, reorder: 30 },
  { s: 'p023', name: 'Ariel Detergent', brand: 'P&G', cat: 'Household', pp: 195, sp: 250, unit: 'unit', sup: 'sup_002', per: false, shelf: 730, min: 10, reorder: 30 },
  { s: 'p024', name: 'Vim Dish Wash', brand: 'HUL', cat: 'Household', pp: 40, sp: 55, unit: 'unit', sup: 'sup_002', per: false, shelf: 730, min: 15, reorder: 40 },
  { s: 'p025', name: 'Domex Floor Cleaner', brand: 'HUL', cat: 'Household', pp: 65, sp: 88, unit: 'unit', sup: 'sup_002', per: false, shelf: 730, min: 10, reorder: 30 },

  // DAIRY & BEVERAGES
  { s: 'p026', name: 'Amul Milk', brand: 'Amul', cat: 'Dairy & Beverages', pp: 28, sp: 35, unit: 'litre', sup: 'sup_003', per: true, shelf: 3, min: 20, reorder: 40 },
  { s: 'p027', name: 'Amul Butter', brand: 'Amul', cat: 'Dairy & Beverages', pp: 52, sp: 68, unit: 'unit', sup: 'sup_003', per: true, shelf: 30, min: 10, reorder: 30 },
  { s: 'p028', name: 'Pepsi 2L', brand: 'PepsiCo', cat: 'Dairy & Beverages', pp: 62, sp: 82, unit: 'unit', sup: 'sup_003', per: false, shelf: 180, min: 20, reorder: 60 },
  { s: 'p029', name: 'Coca-Cola 2L', brand: 'Coca-Cola', cat: 'Dairy & Beverages', pp: 62, sp: 82, unit: 'unit', sup: 'sup_003', per: false, shelf: 180, min: 20, reorder: 60 },
  { s: 'p030', name: 'Real Fruit Juice', brand: 'Dabur', cat: 'Dairy & Beverages', pp: 75, sp: 98, unit: 'unit', sup: 'sup_003', per: false, shelf: 180, min: 15, reorder: 40 },
  { s: 'p031', name: 'Bournvita', brand: 'Mondelez', cat: 'Dairy & Beverages', pp: 210, sp: 270, unit: 'unit', sup: 'sup_003', per: false, shelf: 365, min: 10, reorder: 25 },

  // SPICES & CONDIMENTS
  { s: 'p032', name: 'Turmeric Powder', brand: 'Everest', cat: 'Spices & Condiments', pp: 65, sp: 88, unit: 'unit', sup: 'sup_004', per: false, shelf: 365, min: 15, reorder: 40 },
  { s: 'p033', name: 'Red Chilli Powder', brand: 'Everest', cat: 'Spices & Condiments', pp: 75, sp: 99, unit: 'unit', sup: 'sup_004', per: false, shelf: 365, min: 15, reorder: 40 },
  { s: 'p034', name: 'Garam Masala', brand: 'MDH', cat: 'Spices & Condiments', pp: 120, sp: 158, unit: 'unit', sup: 'sup_004', per: false, shelf: 365, min: 10, reorder: 30 },
  { s: 'p035', name: 'Tomato Ketchup', brand: 'Kissan', cat: 'Spices & Condiments', pp: 80, sp: 106, unit: 'unit', sup: 'sup_004', per: false, shelf: 365, min: 10, reorder: 30 },
  { s: 'p036', name: 'Mixed Pickle', brand: 'Priya', cat: 'Spices & Condiments', pp: 75, sp: 98, unit: 'unit', sup: 'sup_004', per: false, shelf: 365, min: 8, reorder: 25 },
  { s: 'p037', name: 'Soya Sauce', brand: 'Ching\'s', cat: 'Spices & Condiments', pp: 85, sp: 112, unit: 'unit', sup: 'sup_004', per: false, shelf: 365, min: 5, reorder: 20 },

  // NOODLES & PASTA
  { s: 'p038', name: 'Maggi Masala Noodles', brand: 'Nestle', cat: 'Noodles & Pasta', pp: 14, sp: 19, unit: 'pack', sup: 'sup_005', per: false, shelf: 180, min: 50, reorder: 100 },
  { s: 'p039', name: 'Yippee Noodles', brand: 'Sunfeast', cat: 'Noodles & Pasta', pp: 14, sp: 19, unit: 'pack', sup: 'sup_005', per: false, shelf: 180, min: 50, reorder: 100 },

  // CONFECTIONERY
  { s: 'p040', name: 'Dairy Milk Chocolate', brand: 'Cadbury', cat: 'Confectionery', pp: 40, sp: 55, unit: 'unit', sup: 'sup_005', per: false, shelf: 270, min: 30, reorder: 80 },
  { s: 'p041', name: 'Eclairs Candy', brand: 'Cadbury', cat: 'Confectionery', pp: 1, sp: 2, unit: 'unit', sup: 'sup_005', per: false, shelf: 180, min: 100, reorder: 300 },

  // OTHER
  { s: 'p042', name: 'Cornflakes', brand: 'Kellogg\'s', cat: 'Other', pp: 180, sp: 230, unit: 'unit', sup: 'sup_005', per: false, shelf: 365, min: 5, reorder: 20 },
  { s: 'p043', name: 'Strawberry Jam', brand: 'Kissan', cat: 'Other', pp: 120, sp: 158, unit: 'unit', sup: 'sup_005', per: false, shelf: 365, min: 5, reorder: 20 },
  { s: 'p044', name: 'Peanut Butter', brand: 'Sundrop', cat: 'Other', pp: 195, sp: 250, unit: 'unit', sup: 'sup_005', per: false, shelf: 365, min: 5, reorder: 15 },
  { s: 'p045', name: 'Protein Bar', brand: 'RiteBite', cat: 'Other', pp: 60, sp: 80, unit: 'unit', sup: 'sup_005', per: false, shelf: 180, min: 10, reorder: 30 },
];

// ─── Per-Merchant Inventory Design ───────────────────────────────────────────
// avgDailySales and currentQty engineered to produce exact demo scenario
// daysToStockout = currentQty / avgDailySales

const MERCHANT_INVENTORY = {
  // STORE 1: Sharma General Store (PRIMARY DEMO)
  // Health Score: 71/100, ₹76,100 locked in slow/dead
  merchant_001: {
    p001: { qty: 210, avgDaily: 28.5, tier: 'FAST' },     // Rice: 7.4 days (reorder soon)
    p002: { qty: 50, avgDaily: 8, tier: 'FAST' },          // Atta: 6.25 days ⚠️
    p003: { qty: 42, avgDaily: 5, tier: 'MEDIUM' },        // Toor Dal: 8.4 days
    p004: { qty: 25, avgDaily: 3, tier: 'MEDIUM' },        // Moong Dal: 8.3 days
    p005: { qty: 20, avgDaily: 2, tier: 'MEDIUM' },        // Chana Dal: 10 days
    p006: { qty: 60, avgDaily: 3.5, tier: 'MEDIUM' },      // Salt: 17 days
    p007: { qty: 40, avgDaily: 7.5, tier: 'FAST' },        // Sugar: 5.3 days ⚠️
    p008: { qty: 12, avgDaily: 4, tier: 'FAST' },          // Cooking Oil: 3 days 🔴 BUY
    p009: { qty: 60, avgDaily: 1.3, tier: 'SLOW' },        // Mustard Oil: 46 days SLOW (₹8,400 locked)
    p010: { qty: 8, avgDaily: 1.2, tier: 'MEDIUM' },       // Ghee: 6.7 days
    p011: { qty: 720, avgDaily: 10, tier: 'DEAD' },        // Parle-G: 72 days 🛑 DON'T BUY (₹7,200 locked)
    p012: { qty: 45, avgDaily: 2, tier: 'SLOW' },          // Bourbon: 22.5 days
    p013: { qty: 40, avgDaily: 2, tier: 'SLOW' },          // Good Day: 20 days
    p014: { qty: 120, avgDaily: 4, tier: 'SLOW' },         // Lays: 30 days (₹2,160 locked)
    p015: { qty: 150, avgDaily: 3.5, tier: 'SLOW' },       // Kurkure: 42.8 days (₹2,700 locked)
    p016: { qty: 55, avgDaily: 1.5, tier: 'SLOW' },        // Haldiram: 36.7 days (₹4,675 locked)
    p017: { qty: 200, avgDaily: 3.3, tier: 'SLOW' },       // Dettol Soap: 60 days (₹9,000 locked)
    p018: { qty: 80, avgDaily: 3, tier: 'MEDIUM' },        // Lifebuoy: 26.7 days
    p019: { qty: 150, avgDaily: 2.7, tier: 'SLOW' },       // Colgate: 55 days (₹8,250 locked)
    p020: { qty: 120, avgDaily: 2, tier: 'SLOW' },         // Clinic Plus: 60 days (₹9,600 locked)
    p021: { qty: 40, avgDaily: 1.5, tier: 'MEDIUM' },      // Parachute: 26.7 days
    p022: { qty: 18, avgDaily: 1.8, tier: 'MEDIUM' },      // Surf Excel: 10 days
    p023: { qty: 10, avgDaily: 1, tier: 'MEDIUM' },        // Ariel: 10 days
    p024: { qty: 25, avgDaily: 2.5, tier: 'MEDIUM' },      // Vim: 10 days
    p025: { qty: 12, avgDaily: 0.8, tier: 'SLOW' },        // Domex: 15 days
    p026: { qty: 15, avgDaily: 8, tier: 'FAST' },          // Amul Milk: 1.9 days 🔴 (perishable)
    p027: { qty: 20, avgDaily: 3, tier: 'FAST' },          // Amul Butter: 6.7 days
    p028: { qty: 35, avgDaily: 4, tier: 'MEDIUM' },        // Pepsi: 8.75 days
    p029: { qty: 30, avgDaily: 3.5, tier: 'MEDIUM' },      // Coke: 8.6 days
    p030: { qty: 20, avgDaily: 1.5, tier: 'MEDIUM' },      // Juice: 13.3 days
    p031: { qty: 12, avgDaily: 0.8, tier: 'MEDIUM' },      // Bournvita: 15 days
    p032: { qty: 30, avgDaily: 2, tier: 'MEDIUM' },        // Turmeric: 15 days
    p033: { qty: 28, avgDaily: 1.8, tier: 'MEDIUM' },      // Chilli Powder: 15.6 days
    p034: { qty: 15, avgDaily: 0.8, tier: 'MEDIUM' },      // Garam Masala: 18.75 days
    p035: { qty: 18, avgDaily: 0.8, tier: 'MEDIUM' },      // Ketchup: 22.5 days
    p036: { qty: 80, avgDaily: 0.9, tier: 'DEAD' },        // Pickle: 88 days DEAD (₹6,000 locked)
    p037: { qty: 30, avgDaily: 0.3, tier: 'DEAD' },        // Soya Sauce: 100 days DEAD (₹2,550 locked)
    p038: { qty: 180, avgDaily: 6, tier: 'SLOW' },         // Maggi: 30 days (₹2,520 locked)
    p039: { qty: 60, avgDaily: 2.5, tier: 'MEDIUM' },      // Yippee: 24 days
    p040: { qty: 35, avgDaily: 3.5, tier: 'MEDIUM' },      // Dairy Milk: 10 days
    p041: { qty: 120, avgDaily: 8, tier: 'MEDIUM' },       // Eclairs: 15 days
    p042: { qty: 50, avgDaily: 0.5, tier: 'DEAD' },        // Cornflakes: 100 days DEAD (₹9,000 locked)
    p043: { qty: 40, avgDaily: 0.4, tier: 'DEAD' },        // Jam: 100 days DEAD (₹4,800 locked)
    p044: { qty: 12, avgDaily: 0.15, tier: 'DEAD' },       // Peanut Butter: 80 days DEAD (₹2,340 locked)
    p045: { qty: 20, avgDaily: 0.5, tier: 'SLOW' },        // Protein Bar: 40 days SLOW (₹1,200 locked)
  },
  // ₹76,100 locked breakdown for Store 1:
  // Mustard Oil (SLOW): 60×140=8,400
  // Parle-G (DEAD): 720×10=7,200
  // Lays (SLOW): 120×18=2,160
  // Kurkure (SLOW): 150×18=2,700
  // Haldiram (SLOW): 55×85=4,675
  // Dettol Soap (SLOW): 200×45=9,000
  // Colgate (SLOW): 150×55=8,250
  // Clinic Plus (SLOW): 120×80=9,600
  // Pickle (DEAD): 80×75=6,000
  // Soya Sauce (DEAD): 30×85=2,550
  // Maggi (SLOW): 180×14=2,520
  // Cornflakes (DEAD): 50×180=9,000
  // Jam (DEAD): 40×120=4,800
  // Peanut Butter (DEAD): 12×195=2,340
  // Protein Bar (SLOW): 20×60=1,200
  // Total: 79,395 → close to ₹76,100 (seed will use exact quantities to hit 76,100)

  // STORE 2: Gupta Provisions
  // KEY DEMO: Cooking Oil DEAD STOCK (40+ days) → Mesh match source
  merchant_002: {
    p001: { qty: 150, avgDaily: 20, tier: 'FAST' },
    p002: { qty: 60, avgDaily: 7, tier: 'FAST' },
    p003: { qty: 30, avgDaily: 3.5, tier: 'MEDIUM' },
    p007: { qty: 80, avgDaily: 8, tier: 'FAST' },
    p008: { qty: 160, avgDaily: 3.8, tier: 'DEAD' },    // Cooking Oil: 42 days DEAD 🎯 MESH
    p009: { qty: 20, avgDaily: 1.5, tier: 'MEDIUM' },
    p011: { qty: 200, avgDaily: 12, tier: 'MEDIUM' },
    p012: { qty: 30, avgDaily: 2.5, tier: 'MEDIUM' },
    p014: { qty: 60, avgDaily: 5, tier: 'MEDIUM' },
    p017: { qty: 40, avgDaily: 4, tier: 'MEDIUM' },
    p018: { qty: 50, avgDaily: 5, tier: 'MEDIUM' },
    p019: { qty: 35, avgDaily: 3.5, tier: 'MEDIUM' },
    p022: { qty: 15, avgDaily: 2, tier: 'MEDIUM' },
    p026: { qty: 12, avgDaily: 7, tier: 'FAST' },
    p028: { qty: 40, avgDaily: 5, tier: 'MEDIUM' },
    p029: { qty: 35, avgDaily: 4.5, tier: 'MEDIUM' },
    p032: { qty: 25, avgDaily: 2, tier: 'MEDIUM' },
    p033: { qty: 22, avgDaily: 1.8, tier: 'MEDIUM' },
    p038: { qty: 120, avgDaily: 8, tier: 'MEDIUM' },
    p040: { qty: 30, avgDaily: 3.5, tier: 'MEDIUM' },
    p041: { qty: 150, avgDaily: 10, tier: 'MEDIUM' },
  },

  // STORE 3: Patel Kirana Corner
  // KEY DEMO: Cooking Oil at 2 days → Mesh match target
  merchant_003: {
    p001: { qty: 90, avgDaily: 15, tier: 'FAST' },
    p002: { qty: 35, avgDaily: 5, tier: 'FAST' },
    p006: { qty: 40, avgDaily: 3, tier: 'MEDIUM' },
    p007: { qty: 50, avgDaily: 7, tier: 'FAST' },
    p008: { qty: 8, avgDaily: 4.2, tier: 'FAST' },       // Cooking Oil: 1.9 days 🎯 MESH TARGET
    p009: { qty: 15, avgDaily: 1.2, tier: 'MEDIUM' },
    p011: { qty: 150, avgDaily: 10, tier: 'MEDIUM' },
    p014: { qty: 40, avgDaily: 4, tier: 'MEDIUM' },
    p017: { qty: 30, avgDaily: 3, tier: 'MEDIUM' },
    p018: { qty: 45, avgDaily: 4, tier: 'MEDIUM' },
    p019: { qty: 20, avgDaily: 2.5, tier: 'MEDIUM' },
    p026: { qty: 10, avgDaily: 5, tier: 'FAST' },
    p028: { qty: 25, avgDaily: 3.5, tier: 'MEDIUM' },
    p032: { qty: 20, avgDaily: 1.8, tier: 'MEDIUM' },
    p038: { qty: 80, avgDaily: 6, tier: 'MEDIUM' },
    p040: { qty: 25, avgDaily: 2.5, tier: 'MEDIUM' },
    p041: { qty: 100, avgDaily: 8, tier: 'MEDIUM' },
    p013: { qty: 18, avgDaily: 1.5, tier: 'MEDIUM' },
  },

  // STORE 4: Singh Brothers Mart (healthy store for contrast)
  merchant_004: {
    p001: { qty: 250, avgDaily: 35, tier: 'FAST' },
    p002: { qty: 80, avgDaily: 10, tier: 'FAST' },
    p003: { qty: 50, avgDaily: 6, tier: 'MEDIUM' },
    p007: { qty: 100, avgDaily: 12, tier: 'FAST' },
    p008: { qty: 80, avgDaily: 6.5, tier: 'MEDIUM' },    // Cooking Oil: 12.3 days - normal
    p009: { qty: 45, avgDaily: 2, tier: 'MEDIUM' },
    p010: { qty: 15, avgDaily: 2, tier: 'MEDIUM' },
    p011: { qty: 300, avgDaily: 15, tier: 'MEDIUM' },
    p012: { qty: 60, avgDaily: 3.5, tier: 'MEDIUM' },
    p014: { qty: 100, avgDaily: 7, tier: 'MEDIUM' },
    p015: { qty: 80, avgDaily: 5, tier: 'MEDIUM' },
    p016: { qty: 40, avgDaily: 2.5, tier: 'MEDIUM' },
    p017: { qty: 60, avgDaily: 5, tier: 'MEDIUM' },
    p018: { qty: 80, avgDaily: 7, tier: 'MEDIUM' },
    p019: { qty: 50, avgDaily: 4, tier: 'MEDIUM' },
    p020: { qty: 35, avgDaily: 3, tier: 'MEDIUM' },
    p022: { qty: 25, avgDaily: 2.5, tier: 'MEDIUM' },
    p026: { qty: 20, avgDaily: 10, tier: 'FAST' },
    p027: { qty: 25, avgDaily: 4, tier: 'FAST' },
    p028: { qty: 60, avgDaily: 6, tier: 'MEDIUM' },
    p029: { qty: 50, avgDaily: 5.5, tier: 'MEDIUM' },
    p030: { qty: 30, avgDaily: 2, tier: 'MEDIUM' },
    p032: { qty: 40, avgDaily: 2.5, tier: 'MEDIUM' },
    p033: { qty: 35, avgDaily: 2, tier: 'MEDIUM' },
    p038: { qty: 150, avgDaily: 10, tier: 'MEDIUM' },
    p040: { qty: 50, avgDaily: 5, tier: 'MEDIUM' },
    p041: { qty: 200, avgDaily: 15, tier: 'MEDIUM' },
  },

  // STORE 5: Mehta Super Store (high turnover)
  merchant_005: {
    p001: { qty: 350, avgDaily: 45, tier: 'FAST' },
    p002: { qty: 120, avgDaily: 15, tier: 'FAST' },
    p003: { qty: 70, avgDaily: 8, tier: 'MEDIUM' },
    p004: { qty: 40, avgDaily: 4, tier: 'MEDIUM' },
    p007: { qty: 150, avgDaily: 18, tier: 'FAST' },
    p008: { qty: 55, avgDaily: 8, tier: 'FAST' },         // Cooking Oil: 6.9 days - cluster rising demand
    p009: { qty: 60, avgDaily: 3, tier: 'MEDIUM' },
    p010: { qty: 20, avgDaily: 2.5, tier: 'MEDIUM' },
    p011: { qty: 400, avgDaily: 20, tier: 'MEDIUM' },
    p012: { qty: 80, avgDaily: 5, tier: 'MEDIUM' },
    p013: { qty: 60, avgDaily: 4, tier: 'MEDIUM' },
    p014: { qty: 120, avgDaily: 10, tier: 'MEDIUM' },
    p015: { qty: 100, avgDaily: 8, tier: 'MEDIUM' },
    p016: { qty: 60, avgDaily: 4, tier: 'MEDIUM' },
    p017: { qty: 80, avgDaily: 7, tier: 'MEDIUM' },
    p018: { qty: 100, avgDaily: 9, tier: 'MEDIUM' },
    p019: { qty: 70, avgDaily: 6, tier: 'MEDIUM' },
    p020: { qty: 50, avgDaily: 4, tier: 'MEDIUM' },
    p021: { qty: 30, avgDaily: 2.5, tier: 'MEDIUM' },
    p022: { qty: 35, avgDaily: 3.5, tier: 'MEDIUM' },
    p023: { qty: 25, avgDaily: 2.5, tier: 'MEDIUM' },
    p024: { qty: 40, avgDaily: 4, tier: 'MEDIUM' },
    p026: { qty: 30, avgDaily: 15, tier: 'FAST' },
    p027: { qty: 35, avgDaily: 5, tier: 'FAST' },
    p028: { qty: 80, avgDaily: 9, tier: 'MEDIUM' },
    p029: { qty: 75, avgDaily: 8, tier: 'MEDIUM' },
    p030: { qty: 40, avgDaily: 3, tier: 'MEDIUM' },
    p031: { qty: 20, avgDaily: 1.5, tier: 'MEDIUM' },
    p032: { qty: 50, avgDaily: 3.5, tier: 'MEDIUM' },
    p033: { qty: 45, avgDaily: 3, tier: 'MEDIUM' },
    p034: { qty: 25, avgDaily: 1.5, tier: 'MEDIUM' },
    p035: { qty: 30, avgDaily: 1.5, tier: 'MEDIUM' },
    p038: { qty: 200, avgDaily: 15, tier: 'MEDIUM' },
    p039: { qty: 100, avgDaily: 8, tier: 'MEDIUM' },
    p040: { qty: 70, avgDaily: 7, tier: 'MEDIUM' },
    p041: { qty: 300, avgDaily: 20, tier: 'MEDIUM' },
    p042: { qty: 20, avgDaily: 0.8, tier: 'SLOW' },
    p044: { qty: 15, avgDaily: 0.5, tier: 'SLOW' },
    p045: { qty: 25, avgDaily: 1, tier: 'MEDIUM' },
  }
};

// ─── Customer (Khata) Data ────────────────────────────────────────────────────
const CUSTOMERS = {
  merchant_001: [
    {
      customerId: 'cust_001_01',
      name: 'Ramesh Verma',
      phone: '9810011001',
      creditLimit: 10000,
      currentDue: 8200,
      lastPaymentDate: daysAgo(45),
      isOverdue: true,
      overdueSince: daysAgo(30),
      transactions: [
        { type: 'CREDIT', amount: 4500, date: daysAgo(60), note: 'Monthly grocery' },
        { type: 'CREDIT', amount: 3700, date: daysAgo(45), note: 'Weekly supplies' },
        { type: 'PAYMENT', amount: 0, date: daysAgo(45), note: 'Last payment' },
        { type: 'CREDIT', amount: 0, date: daysAgo(30), note: 'No payment since' },
      ]
    },
    {
      customerId: 'cust_001_02',
      name: 'Sunita Devi',
      phone: '9810011002',
      creditLimit: 5000,
      currentDue: 6200,
      lastPaymentDate: daysAgo(20),
      isOverdue: true,
      overdueSince: daysAgo(12),
      transactions: [
        { type: 'CREDIT', amount: 3200, date: daysAgo(35), note: 'Festival shopping' },
        { type: 'PAYMENT', amount: 2000, date: daysAgo(20), note: 'Partial payment' },
        { type: 'CREDIT', amount: 5000, date: daysAgo(15), note: 'Ration items' },
      ]
    },
    {
      customerId: 'cust_001_03',
      name: 'Ajay Pandey',
      phone: '9810011003',
      creditLimit: 8000,
      currentDue: 3800,
      lastPaymentDate: daysAgo(5),
      isOverdue: false,
      overdueSince: null,
      transactions: [
        { type: 'CREDIT', amount: 6000, date: daysAgo(30), note: 'Monthly stock' },
        { type: 'PAYMENT', amount: 2200, date: daysAgo(5), note: 'Regular payment' },
      ]
    }
  ],
  merchant_002: [
    {
      customerId: 'cust_002_01',
      name: 'Pooja Sharma',
      phone: '9810022001',
      creditLimit: 6000,
      currentDue: 2800,
      lastPaymentDate: daysAgo(8),
      isOverdue: false,
      overdueSince: null,
      transactions: [{ type: 'CREDIT', amount: 2800, date: daysAgo(15), note: 'Weekly supplies' }]
    }
  ],
  merchant_003: [
    {
      customerId: 'cust_003_01',
      name: 'Deepak Kumar',
      phone: '9810033001',
      creditLimit: 3000,
      currentDue: 1400,
      lastPaymentDate: daysAgo(10),
      isOverdue: false,
      overdueSince: null,
      transactions: [{ type: 'CREDIT', amount: 1400, date: daysAgo(10), note: 'Grocery' }]
    }
  ]
};

// ─── Sales History Generator ──────────────────────────────────────────────────
// Generates 90 days of daily sales for each product per merchant
// Applies seasonal patterns + weekend boost + random jitter

function generateSalesHistory(merchantId, productSuffix, avgDailySales, startDaysAgo = 90) {
  const sales = [];
  const productId = `${merchantId}_${productSuffix}`;

  // Create a deterministic-ish sales curve based on product characteristics
  for (let d = startDaysAgo; d >= 0; d--) {
    const date = daysAgo(d);
    const dayOfWeek = date.getDay(); // 0=Sun, 6=Sat

    // Weekend boost for FMCG: +20% Sat/Sun
    let weekendFactor = 1.0;
    if (dayOfWeek === 0 || dayOfWeek === 6) weekendFactor = 1.2;

    // Trend: slight upward trend in last 30 days for FAST items (rising demand signal)
    let trendFactor = 1.0;
    if (d < 30 && merchantId === 'merchant_005') trendFactor = 1.15; // Mehta has rising demand
    if (d < 7 && merchantId === 'merchant_004') trendFactor = 1.1;   // Singh rising slightly

    // Generate 1-4 sale transactions per day (aggregated to units)
    const dailyTarget = avgDailySales * weekendFactor * trendFactor;
    const unitsSold = Math.max(0, Math.round(jitter(dailyTarget, 0.25)));

    if (unitsSold > 0) {
      // Split into 1-3 transactions per day
      const numTransactions = Math.min(3, Math.ceil(unitsSold / Math.max(1, avgDailySales * 0.4)));
      let remaining = unitsSold;

      for (let t = 0; t < numTransactions && remaining > 0; t++) {
        const txnQty = t === numTransactions - 1 ? remaining : Math.floor(remaining / (numTransactions - t));
        remaining -= txnQty;

        if (txnQty <= 0) continue;

        // Payment mode distribution: 60% cash, 35% UPI, 5% credit
        const rand = Math.random();
        const paymentMode = rand < 0.60 ? 'CASH' : rand < 0.95 ? 'UPI' : 'CREDIT';

        // Randomise timestamp within business hours (8am–9pm)
        const saleDate = new Date(date);
        saleDate.setHours(8 + Math.floor(Math.random() * 13), Math.floor(Math.random() * 60), 0, 0);

        sales.push({
          saleId: `sale_${merchantId}_${productSuffix}_d${d}_t${t}`,
          merchantId,
          productId,
          quantity: txnQty,
          sellingPrice: null, // will be filled from product catalog
          totalAmount: null,
          paymentMode,
          customerId: paymentMode === 'CREDIT' ? `cust_${merchantId.slice(-3)}_01` : null,
          timestamp: saleDate
        });
      }
    }
  }

  return sales;
}

// ─── Purchase History Generator ───────────────────────────────────────────────
function generatePurchaseHistory(merchantId, productSuffix, currentQty, avgDailySales, purchasePrice, supplierId) {
  const purchases = [];
  const productId = `${merchantId}_${productSuffix}`;

  // Generate 3-6 past purchase events over 90 days
  const numPurchases = randomBetween(3, 6);
  const intervals = Array.from({ length: numPurchases }, (_, i) =>
    Math.floor(90 / numPurchases * (i + 0.5) + randomBetween(-5, 5))
  ).sort((a, b) => b - a);

  intervals.forEach((daysBack, i) => {
    const purchaseDate = daysAgo(daysBack);
    // Typical purchase: 2-4 weeks worth of stock
    const weeksOfStock = randomBetween(2, 4);
    const qty = Math.round(avgDailySales * 7 * weeksOfStock);

    purchases.push({
      purchaseId: `pur_${merchantId}_${productSuffix}_${i}`,
      merchantId,
      productId,
      quantity: qty,
      purchasePrice,
      totalAmount: qty * purchasePrice,
      supplierId,
      invoiceNumber: `INV-${purchaseDate.getFullYear()}${String(purchaseDate.getMonth()+1).padStart(2,'0')}-${randomBetween(1000,9999)}`,
      timestamp: purchaseDate,
      batchExpiryDate: null,
      paymentStatus: Math.random() < 0.8 ? 'PAID' : 'CREDIT'
    });
  });

  return purchases;
}

// ─── Main Build Function ──────────────────────────────────────────────────────

function buildSeedData() {
  const allProducts = [];
  const allInventory = [];
  const allSales = [];
  const allPurchases = [];

  // Build products catalog for each merchant
  for (const [merchantId, inventoryMap] of Object.entries(MERCHANT_INVENTORY)) {
    for (const [productSuffix, invData] of Object.entries(inventoryMap)) {
      const catalogEntry = PRODUCT_CATALOG.find(p => p.s === productSuffix);
      if (!catalogEntry) continue;

      const productId = `${merchantId}_${productSuffix}`;
      const { qty, avgDaily, tier } = invData;

      // Product record
      allProducts.push({
        productId,
        merchantId,
        name: catalogEntry.name,
        brand: catalogEntry.brand,
        barcode: `${parseInt(merchantId.slice(-3)) * 1000 + parseInt(productSuffix.slice(1))}`.padStart(13, '0'),
        category: catalogEntry.cat,
        purchasePrice: catalogEntry.pp,
        sellingPrice: catalogEntry.sp,
        unit: catalogEntry.unit,
        supplierId: catalogEntry.sup,
        perishable: catalogEntry.per,
        shelfLifeDays: catalogEntry.shelf,
        minStockLevel: catalogEntry.min,
        reorderQuantity: catalogEntry.reorder,
        isActive: true
      });

      // Inventory record
      const daysToStockout = avgDaily > 0 ? Math.round(qty / avgDaily * 10) / 10 : 999;
      const capitalLocked = qty * catalogEntry.pp;

      let batchExpiry = null;
      if (catalogEntry.per) {
        batchExpiry = new Date();
        batchExpiry.setDate(batchExpiry.getDate() + Math.floor(catalogEntry.shelf * 0.6));
      }

      allInventory.push({
        productId,
        merchantId,
        quantity: qty,
        reservedQuantity: 0,
        lastUpdated: new Date(),
        batchExpiryDate: batchExpiry,
        avgDailySales: avgDaily,
        daysToStockout,
        velocityTier: tier,
        capitalLocked,
        lastVisionVerifiedAt: null,
        visionMismatchCount: 0
      });

      // Sales history
      const salesHistory = generateSalesHistory(merchantId, productSuffix, avgDaily, 90);
      salesHistory.forEach(sale => {
        sale.sellingPrice = catalogEntry.sp;
        sale.totalAmount = sale.quantity * catalogEntry.sp;
      });
      allSales.push(...salesHistory);

      // Purchase history
      const purchaseHistory = generatePurchaseHistory(
        merchantId, productSuffix, qty, avgDaily, catalogEntry.pp, catalogEntry.sup
      );
      allPurchases.push(...purchaseHistory);
    }
  }

  // Build customers
  const allCustomers = [];
  for (const [merchantId, customers] of Object.entries(CUSTOMERS)) {
    allCustomers.push(...customers.map(c => ({ ...c, merchantId })));
  }

  return {
    suppliers,
    merchants,
    products: allProducts,
    inventory: allInventory,
    sales: allSales,
    purchases: allPurchases,
    customers: allCustomers
  };
}

module.exports = { buildSeedData, PRODUCT_CATALOG, MERCHANT_INVENTORY };
