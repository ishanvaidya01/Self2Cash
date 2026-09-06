/**
 * RecommendationService — BUY / DON'T BUY / RECOVER CASH
 * Every recommendation includes inline reasoning. Never a black box.
 */

const Inventory = require('../models/Inventory');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const ExternalSignal = require('../models/ExternalSignal');
const { getForecast } = require('./ForecastService');

const STOCKOUT_THRESHOLD_DAYS = 7;
const DEAD_STOCK_THRESHOLD_DAYS = 90;
const OVERSTOCK_THRESHOLD_DAYS = 60;

async function getRecommendations(merchantId) {
  const [inventoryItems, products, suppliers, signals] = await Promise.all([
    Inventory.find({ merchantId }),
    Product.find({ merchantId }),
    Supplier.find({}),
    ExternalSignal.find({ isActive: true, expiresAt: { $gt: new Date() } })
  ]);

  const productMap = new Map(products.map(p => [p.productId, p]));
  const supplierMap = new Map(suppliers.map(s => [s.supplierId, s]));

  const recommendations = [];
  const externalAlerts = [];

  // Build external signal alerts
  for (const signal of signals) {
    if (signal.type === 'MANDI_PRICE' && signal.payload?.priceChangePercent) {
      const change = signal.payload.priceChangePercent;
      const commodity = signal.payload.commodity || 'commodity';
      if (Math.abs(change) >= 5) {
        externalAlerts.push({
          type: 'MANDI_PRICE',
          priority: Math.abs(change) >= 10 ? 'HIGH' : 'MEDIUM',
          icon: change < 0 ? '📉' : '📈',
          title: `${commodity} wholesale ${change < 0 ? 'down' : 'up'} ${Math.abs(change)}%`,
          reasoning: change < 0
            ? `Wholesale price dropped. Consider buying now before retail prices adjust. Savings opportunity.`
            : `Wholesale price rising. Procure existing stock before your supplier raises prices.`,
          signal
        });
      }
    }
    if (signal.type === 'WEATHER_ALERT') {
      externalAlerts.push({
        type: 'WEATHER',
        priority: 'MEDIUM',
        icon: '🌦',
        title: `${signal.payload.description}`,
        reasoning: signal.payload.demandImpact,
        signal
      });
    }
    if (signal.type === 'FESTIVAL') {
      const daysUntil = Math.ceil((new Date(signal.payload.startDate) - new Date()) / (1000 * 60 * 60 * 24));
      if (daysUntil > 0 && daysUntil <= 30) {
        externalAlerts.push({
          type: 'FESTIVAL',
          priority: 'HIGH',
          icon: '🎪',
          title: `${signal.payload.name} in ${daysUntil} days`,
          reasoning: `Demand for ${signal.payload.categories.join(', ')} expected to rise ${Math.round((signal.payload.demandMultiplier - 1) * 100)}%. Stock up now.`,
          signal
        });
      }
    }
  }

  // Process each inventory item
  for (const inv of inventoryItems) {
    const product = productMap.get(inv.productId);
    if (!product) continue;
    const supplier = supplierMap.get(product.supplierId);

    // ── BUY recommendations ─────────────────────────────────────────────────
    if (inv.daysToStockout <= STOCKOUT_THRESHOLD_DAYS && inv.velocityTier !== 'DEAD') {
      const urgency = inv.daysToStockout < 3 ? 'CRITICAL' : 'HIGH';
      const reorderQty = product.reorderQuantity;
      const orderAmount = reorderQty * product.purchasePrice;
      const leadTime = supplier?.leadTimeDays || 2;
      const daysBuffer = reorderQty / Math.max(inv.avgDailySales, 0.1);

      // Check if any external signal amplifies this
      const signalBoost = signals.find(s =>
        s.type === 'FESTIVAL' && s.payload?.categories?.includes(product.category) &&
        new Date(s.payload.startDate) > new Date()
      );

      recommendations.push({
        type: 'BUY',
        urgency,
        priority: urgency === 'CRITICAL' ? 1 : 2,
        icon: '🔴',
        productId: product.productId,
        productName: product.name,
        category: product.category,
        action: `Buy ${reorderQty} units of ${product.name}`,
        amount: Math.round(orderAmount),
        quantity: reorderQty,
        reasoning: [
          `Only ${inv.daysToStockout} days of stock remaining at current sales pace of ${inv.avgDailySales} units/day.`,
          `Supplier lead time: ${leadTime} days — order must be placed ${urgency === 'CRITICAL' ? 'today' : 'within 2 days'}.`,
          `₹${Math.round(orderAmount).toLocaleString('en-IN')} gets you ${Math.round(daysBuffer)} days of supply.`,
          signalBoost ? `⚠ ${signalBoost.payload.name} upcoming — demand may rise ${Math.round((signalBoost.payload.demandMultiplier - 1) * 100)}%. Consider ordering extra.` : null
        ].filter(Boolean),
        supplierName: supplier?.name,
        leadTimeDays: leadTime,
        unitCost: product.purchasePrice
      });
    }

    // ── DON'T BUY recommendations ───────────────────────────────────────────
    if ((inv.velocityTier === 'DEAD' || inv.velocityTier === 'SLOW') &&
        inv.daysToStockout > OVERSTOCK_THRESHOLD_DAYS) {
      recommendations.push({
        type: 'DONT_BUY',
        urgency: 'MEDIUM',
        priority: 4,
        icon: '🛑',
        productId: product.productId,
        productName: product.name,
        category: product.category,
        action: `Do NOT reorder ${product.name}`,
        reasoning: [
          `${inv.daysToStockout >= 999 ? '90+' : inv.daysToStockout} days of stock remaining.`,
          `₹${Math.round(inv.quantity * product.purchasePrice).toLocaleString('en-IN')} capital already locked.`,
          `Average daily sales: ${inv.avgDailySales} units — below reorder trigger.`,
          inv.velocityTier === 'DEAD' ? `This SKU is a dead stock item. Prioritise clearing existing inventory.` : null
        ].filter(Boolean),
        daysOfStock: inv.daysToStockout >= 999 ? '90+' : inv.daysToStockout
      });
    }

    // ── RECOVER CASH recommendations ────────────────────────────────────────
    if (inv.velocityTier === 'DEAD' && inv.quantity > 0) {
      const capitalLocked = inv.quantity * product.purchasePrice;
      const recoveryOptions = [];

      if (capitalLocked > 2000) {
        recoveryOptions.push('Offer 10–15% bundle discount to move inventory faster');
        recoveryOptions.push('Check if nearby stores need this product via Kirana Mesh');
        if (product.perishable && inv.batchExpiryDate) {
          recoveryOptions.push(`⚠ Perishable: expires ${inv.batchExpiryDate.toLocaleDateString('en-IN')}. Immediate action needed.`);
        }
      }

      recommendations.push({
        type: 'RECOVER',
        urgency: capitalLocked > 10000 ? 'HIGH' : 'MEDIUM',
        priority: 3,
        icon: '💰',
        productId: product.productId,
        productName: product.name,
        category: product.category,
        action: `Recover ₹${Math.round(capitalLocked).toLocaleString('en-IN')} locked in ${product.name}`,
        amount: Math.round(capitalLocked),
        reasoning: [
          `${inv.quantity} units sitting for 90+ days at ${inv.avgDailySales} units/day.`,
          `₹${Math.round(capitalLocked).toLocaleString('en-IN')} tied up earning zero return.`,
          `At current pace, full clearance takes ${inv.avgDailySales > 0 ? Math.round(inv.quantity / inv.avgDailySales) : '999+'} more days.`
        ],
        recoveryOptions,
        meshAvailable: true // can be checked dynamically
      });
    }
  }

  // Sort by priority
  recommendations.sort((a, b) => (a.priority || 99) - (b.priority || 99));

  return {
    recommendations: recommendations.slice(0, 20), // cap at 20 for UI
    externalAlerts,
    summary: {
      buyCount: recommendations.filter(r => r.type === 'BUY').length,
      dontBuyCount: recommendations.filter(r => r.type === 'DONT_BUY').length,
      recoverCount: recommendations.filter(r => r.type === 'RECOVER').length,
      totalActionableAmount: recommendations
        .filter(r => r.type === 'BUY')
        .reduce((s, r) => s + (r.amount || 0), 0)
    },
    computedAt: new Date().toISOString()
  };
}

module.exports = { getRecommendations };
