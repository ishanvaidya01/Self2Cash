/**
 * WorkingCapitalService — Capital leak detection + Cash Conversion Clock
 * 
 * Core outputs:
 *   - Capital breakdown by velocity tier (FAST/MEDIUM/SLOW/DEAD)
 *   - Per-SKU Cash Conversion Clock (days from purchase to cash)
 *   - Top capital-locked SKUs with "why" reasoning
 */

const Inventory = require('../models/Inventory');
const Product = require('../models/Product');
const Sale = require('../models/Sale');

// Days-of-stock classification thresholds
const TIER_THRESHOLDS = {
  FAST: 30,    // < 30 days = FAST
  MEDIUM: 60,  // 30–60 days = MEDIUM
  SLOW: 90,    // 60–90 days = SLOW
  DEAD: Infinity // 90+ days = DEAD
};

async function getWorkingCapitalBreakdown(merchantId) {
  const [inventoryItems, products] = await Promise.all([
    Inventory.find({ merchantId }),
    Product.find({ merchantId })
  ]);

  const productMap = new Map(products.map(p => [p.productId, p]));

  const breakdown = {
    FAST: { capital: 0, products: [], count: 0 },
    MEDIUM: { capital: 0, products: [], count: 0 },
    SLOW: { capital: 0, products: [], count: 0 },
    DEAD: { capital: 0, products: [], count: 0 }
  };

  let totalCapital = 0;

  for (const inv of inventoryItems) {
    const product = productMap.get(inv.productId);
    if (!product) continue;

    const capital = inv.quantity * product.purchasePrice;
    totalCapital += capital;

    const tier = inv.velocityTier || classifyTier(inv.daysToStockout);
    if (breakdown[tier]) {
      breakdown[tier].capital += capital;
      breakdown[tier].count++;
      breakdown[tier].products.push({
        productId: inv.productId,
        name: product.name,
        brand: product.brand,
        category: product.category,
        quantity: inv.quantity,
        purchasePrice: product.purchasePrice,
        sellingPrice: product.sellingPrice,
        capitalLocked: capital,
        daysToStockout: inv.daysToStockout,
        avgDailySales: inv.avgDailySales,
        marginPercent: Math.round((product.sellingPrice - product.purchasePrice) / product.purchasePrice * 100),
        tier
      });
    }
  }

  // Sort each tier by capital locked (highest first)
  for (const tier of Object.keys(breakdown)) {
    breakdown[tier].products.sort((a, b) => b.capitalLocked - a.capitalLocked);
  }

  // Category-wise breakdown for chart
  const categoryBreakdown = {};
  for (const product of products) {
    const inv = inventoryItems.find(i => i.productId === product.productId);
    if (!inv) continue;
    const cat = product.category;
    const capital = inv.quantity * product.purchasePrice;
    const tier = inv.velocityTier || 'UNKNOWN';
    if (!categoryBreakdown[cat]) categoryBreakdown[cat] = { FAST: 0, MEDIUM: 0, SLOW: 0, DEAD: 0, total: 0 };
    categoryBreakdown[cat][tier] = (categoryBreakdown[cat][tier] || 0) + capital;
    categoryBreakdown[cat].total += capital;
  }

  return {
    totalCapital: Math.round(totalCapital),
    breakdown: {
      FAST: { ...breakdown.FAST, capital: Math.round(breakdown.FAST.capital), percent: Math.round(breakdown.FAST.capital / totalCapital * 100) },
      MEDIUM: { ...breakdown.MEDIUM, capital: Math.round(breakdown.MEDIUM.capital), percent: Math.round(breakdown.MEDIUM.capital / totalCapital * 100) },
      SLOW: { ...breakdown.SLOW, capital: Math.round(breakdown.SLOW.capital), percent: Math.round(breakdown.SLOW.capital / totalCapital * 100) },
      DEAD: { ...breakdown.DEAD, capital: Math.round(breakdown.DEAD.capital), percent: Math.round(breakdown.DEAD.capital / totalCapital * 100) }
    },
    lockedCapital: Math.round(breakdown.SLOW.capital + breakdown.DEAD.capital),
    categoryBreakdown,
    computedAt: new Date().toISOString()
  };
}

// Per-SKU Cash Conversion Clock
async function getCashConversionClock(merchantId, productId) {
  const [inv, product] = await Promise.all([
    Inventory.findOne({ merchantId, productId }),
    Product.findOne({ productId, merchantId })
  ]);

  if (!inv || !product) return null;

  // Days from purchase to sale (using avg daily sales)
  const daysToSell = inv.avgDailySales > 0 ? inv.quantity / inv.avgDailySales : 999;

  // Historical: how long has this batch been sitting?
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentSales = await Sale.aggregate([
    { $match: { merchantId, productId, timestamp: { $gte: thirtyDaysAgo }, isReturned: false } },
    { $group: { _id: null, units: { $sum: '$quantity' }, revenue: { $sum: '$totalAmount' } } }
  ]);

  const monthlyUnits = recentSales[0]?.units || 0;
  const monthlyRevenue = recentSales[0]?.revenue || 0;
  const avgDailyActual = monthlyUnits / 30;

  // Capital invested → projected days to recover
  const capitalInvested = inv.quantity * product.purchasePrice;
  const dailyCashGeneration = avgDailyActual * product.sellingPrice;
  const daysToRecoverCapital = dailyCashGeneration > 0 ? capitalInvested / dailyCashGeneration : 999;

  return {
    productId,
    productName: product.name,
    category: product.category,
    currentStock: inv.quantity,
    capitalInvested: Math.round(capitalInvested),
    avgDailySalesLast30d: Math.round(avgDailyActual * 10) / 10,
    projectedDaysToSellCurrent: Math.round(daysToSell * 10) / 10,
    daysToRecoverCapital: Math.round(daysToRecoverCapital * 10) / 10,
    monthlyRevenuePace: Math.round(monthlyRevenue),
    velocityTier: inv.velocityTier,
    purchasePrice: product.purchasePrice,
    sellingPrice: product.sellingPrice,
    marginPercent: Math.round((product.sellingPrice - product.purchasePrice) / product.purchasePrice * 100)
  };
}

function classifyTier(daysToStockout) {
  if (daysToStockout < TIER_THRESHOLDS.FAST) return 'FAST';
  if (daysToStockout < TIER_THRESHOLDS.MEDIUM) return 'MEDIUM';
  if (daysToStockout < TIER_THRESHOLDS.SLOW) return 'SLOW';
  return 'DEAD';
}

// Update computed fields on Inventory collection (called after each sale/purchase)
async function refreshInventoryMetrics(merchantId) {
  const inventoryItems = await Inventory.find({ merchantId });
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  for (const inv of inventoryItems) {
    const salesAgg = await Sale.aggregate([
      { $match: { merchantId, productId: inv.productId, timestamp: { $gte: thirtyDaysAgo }, isReturned: false } },
      { $group: { _id: null, units: { $sum: '$quantity' } } }
    ]);
    const monthlyUnits = salesAgg[0]?.units || 0;
    const avgDailySales = Math.round((monthlyUnits / 30) * 10) / 10;
    const daysToStockout = avgDailySales > 0 ? Math.round(inv.quantity / avgDailySales * 10) / 10 : 999;
    const velocityTier = classifyTier(daysToStockout);
    const product = await require('../models/Product').findOne({ productId: inv.productId });
    const capitalLocked = product ? inv.quantity * product.purchasePrice : 0;

    await Inventory.updateOne({ _id: inv._id }, {
      avgDailySales,
      daysToStockout,
      velocityTier,
      capitalLocked,
      lastUpdated: new Date()
    });
  }
}

module.exports = { getWorkingCapitalBreakdown, getCashConversionClock, refreshInventoryMetrics, classifyTier };
