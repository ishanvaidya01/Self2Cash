/**
 * FinancialHealthService — Composite 0–100 score with explainable sub-scores
 * 
 * Sub-scores (25% each):
 *   1. Stockout Risk — penalises products < 7 days stock
 *   2. Dead Stock Ratio — capital locked in SLOW/DEAD vs total capital deployed
 *   3. Cash Buffer — daily sales velocity vs daily operating cost proxy
 *   4. Collection Efficiency — khata overdue ratio
 */

const Inventory = require('../models/Inventory');
const Sale = require('../models/Sale');
const Customer = require('../models/Customer');
const Product = require('../models/Product');

async function computeHealthScore(merchantId) {
  const [inventoryItems, products, customers] = await Promise.all([
    Inventory.find({ merchantId }),
    Product.find({ merchantId }),
    Customer.find({ merchantId })
  ]);

  const productMap = new Map(products.map(p => [p.productId, p]));

  // ── Sub-score 1: Stockout Risk ─────────────────────────────────────────────
  // Each critical stockout (< 3 days) = heavy penalty, warning (3–7 days) = moderate
  let criticalStockouts = 0;
  let warningStockouts = 0;
  let totalActiveProducts = 0;

  for (const inv of inventoryItems) {
    if (inv.velocityTier === 'DEAD') continue; // dead stock doesn't create stockout risk
    totalActiveProducts++;
    if (inv.daysToStockout < 3) criticalStockouts++;
    else if (inv.daysToStockout < 7) warningStockouts++;
  }

  const stockoutPenalty = (criticalStockouts * 15 + warningStockouts * 7) /
    Math.max(totalActiveProducts, 1) * 100;
  const stockoutScore = Math.max(0, Math.min(100, 100 - stockoutPenalty));

  // ── Sub-score 2: Dead Stock Ratio ─────────────────────────────────────────
  let totalCapital = 0;
  let lockedCapital = 0;

  for (const inv of inventoryItems) {
    const product = productMap.get(inv.productId);
    if (!product) continue;
    const capital = inv.quantity * product.purchasePrice;
    totalCapital += capital;
    if (inv.velocityTier === 'DEAD' || inv.velocityTier === 'SLOW') {
      lockedCapital += capital;
    }
  }

  const deadStockRatio = totalCapital > 0 ? lockedCapital / totalCapital : 0;
  // 0% locked = 100, 50%+ locked = 0
  const deadStockScore = Math.max(0, Math.min(100, (1 - deadStockRatio * 2) * 100));

  // ── Sub-score 3: Cash Buffer ───────────────────────────────────────────────
  // Compare 7-day average daily sales to working capital deployed
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentSales = await Sale.aggregate([
    { $match: { merchantId, timestamp: { $gte: sevenDaysAgo }, isReturned: false } },
    { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' }, txnCount: { $sum: 1 } } }
  ]);

  const weeklyRevenue = recentSales[0]?.totalRevenue || 0;
  const dailyRevenuePace = weeklyRevenue / 7;

  // Days of capital = totalCapital / dailyRevenuePace (lower is better—faster conversion)
  const capitalConversionDays = dailyRevenuePace > 0 ? totalCapital / dailyRevenuePace : 999;
  // 0–15 days = 100, 60+ days = 0 (linear scale)
  const cashBufferScore = Math.max(0, Math.min(100, (1 - (capitalConversionDays - 15) / 45) * 100));

  // ── Sub-score 4: Collection Efficiency ────────────────────────────────────
  const totalDue = customers.reduce((s, c) => s + c.currentDue, 0);
  const overdueDue = customers.filter(c => c.isOverdue).reduce((s, c) => s + c.currentDue, 0);
  const overdueRatio = totalDue > 0 ? overdueDue / totalDue : 0;
  // 0% overdue = 100, 60%+ overdue = 0
  const collectionScore = Math.max(0, Math.min(100, (1 - overdueRatio * 1.67) * 100));

  // ── Composite ──────────────────────────────────────────────────────────────
  const composite = Math.round(
    (stockoutScore * 0.25) +
    (deadStockScore * 0.25) +
    (cashBufferScore * 0.25) +
    (collectionScore * 0.25)
  );

  // ── Grade ──────────────────────────────────────────────────────────────────
  let grade, color;
  if (composite >= 80) { grade = 'HEALTHY'; color = 'green'; }
  else if (composite >= 60) { grade = 'AMBER'; color = 'amber'; }
  else { grade = 'AT RISK'; color = 'red'; }

  // ── 6 Key Numbers ──────────────────────────────────────────────────────────
  const inventoryValue = inventoryItems.reduce((s, inv) => {
    const p = productMap.get(inv.productId);
    return s + (p ? inv.quantity * p.purchasePrice : 0);
  }, 0);

  const stockoutRiskCount = inventoryItems.filter(i =>
    i.daysToStockout < 7 && i.velocityTier !== 'DEAD'
  ).length;

  // Recommended purchase budget = capital in fast-moving items that need reorder
  const reorderBudget = inventoryItems
    .filter(i => i.daysToStockout < 7 && i.velocityTier !== 'DEAD')
    .reduce((s, inv) => {
      const p = productMap.get(inv.productId);
      return s + (p ? p.reorderQuantity * p.purchasePrice : 0);
    }, 0);

  return {
    score: composite,
    grade,
    color,
    subScores: {
      stockoutRisk: { score: Math.round(stockoutScore), weight: 0.25, label: 'Stockout Risk',
        detail: `${criticalStockouts} critical, ${warningStockouts} warning stockouts` },
      deadStock: { score: Math.round(deadStockScore), weight: 0.25, label: 'Dead Stock Ratio',
        detail: `₹${Math.round(lockedCapital).toLocaleString('en-IN')} of ₹${Math.round(totalCapital).toLocaleString('en-IN')} locked` },
      cashBuffer: { score: Math.round(cashBufferScore), weight: 0.25, label: 'Cash Conversion',
        detail: `${Math.round(capitalConversionDays)} days to convert capital to cash` },
      collection: { score: Math.round(collectionScore), weight: 0.25, label: 'Collection Efficiency',
        detail: `₹${overdueDue.toLocaleString('en-IN')} of ₹${totalDue.toLocaleString('en-IN')} overdue` }
    },
    keyNumbers: {
      inventoryValue: Math.round(inventoryValue),
      capitalLocked: Math.round(lockedCapital),
      weeklySales: Math.round(weeklyRevenue),
      stockoutRiskCount,
      recommendedPurchaseBudget: Math.round(reorderBudget),
      totalKhataReceivable: Math.round(totalDue)
    },
    computedAt: new Date().toISOString()
  };
}

module.exports = { computeHealthScore };
