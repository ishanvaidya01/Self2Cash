const router = require('express').Router();
const Inventory = require('../models/Inventory');
const Product = require('../models/Product');
const { computeHealthScore } = require('../services/FinancialHealthService');

/**
 * POST /api/simulate
 * What-if simulator: given purchase amount + scenario params,
 * project cash flow, stockout risk, and liquidity status
 */
router.post('/', async (req, res) => {
  try {
    const merchantId = req.body.merchantId || process.env.DEMO_MERCHANT_ID;
    const {
      purchaseAmount = 50000,
      demandShiftPercent = 0,    // -50 to +100
      supplierDelayDays = 0,     // 0 to 14
      festivalMultiplier = 1.0,  // 1.0 to 2.0
      cashReserve = 20000        // starting cash
    } = req.body;

    const [inventoryItems, products] = await Promise.all([
      Inventory.find({ merchantId }),
      Product.find({ merchantId })
    ]);

    const productMap = new Map(products.map(p => [p.productId, p]));

    // ── Apply demand shift ─────────────────────────────────────────────────
    const adjustedVelocities = inventoryItems.map(inv => ({
      ...inv.toObject(),
      adjustedDailySales: inv.avgDailySales * (1 + demandShiftPercent / 100) * festivalMultiplier
    }));

    // ── Project 30-day cash flow ───────────────────────────────────────────
    const projectedRevenue30d = adjustedVelocities.reduce((sum, inv) => {
      const product = productMap.get(inv.productId);
      return sum + (product ? inv.adjustedDailySales * 30 * product.sellingPrice : 0);
    }, 0);

    const currentCapital = inventoryItems.reduce((sum, inv) => {
      const product = productMap.get(inv.productId);
      return sum + (product ? inv.quantity * product.purchasePrice : 0);
    }, 0);

    // Total outgoing = purchase amount + operating costs proxy (5% of revenue)
    const operatingCosts = projectedRevenue30d * 0.05;
    const totalOutgoing = purchaseAmount + operatingCosts;
    const projectedCashBalance = cashReserve + projectedRevenue30d - totalOutgoing;

    // ── Stockout risk after delay ─────────────────────────────────────────
    const stockoutRisksAfterDelay = adjustedVelocities.filter(inv => {
      const daysLeft = inv.adjustedDailySales > 0
        ? inv.quantity / inv.adjustedDailySales
        : 999;
      return daysLeft <= (7 + supplierDelayDays) && inv.velocityTier !== 'DEAD';
    });

    // ── Purchase budget headroom ──────────────────────────────────────────
    const safeMaxPurchase = projectedRevenue30d * 0.35; // rule of thumb: don't commit more than 35% projected revenue
    const isOverstretched = purchaseAmount > safeMaxPurchase;

    // ── Capital locked change ─────────────────────────────────────────────
    const newCapitalLocked = currentCapital + purchaseAmount;
    const capitalLockRatio = newCapitalLocked / Math.max(projectedRevenue30d, 1);

    // ── Risk assessment ────────────────────────────────────────────────────
    let riskLevel, riskColor, riskMessage;
    if (projectedCashBalance < 0 || capitalLockRatio > 0.8) {
      riskLevel = 'LIQUIDITY_RISK';
      riskColor = 'red';
      riskMessage = projectedCashBalance < 0
        ? `Projected cash deficit of ₹${Math.abs(Math.round(projectedCashBalance)).toLocaleString('en-IN')} in 30 days.`
        : `Capital lock ratio ${Math.round(capitalLockRatio * 100)}% — most of your money would be tied up in inventory.`;
    } else if (capitalLockRatio > 0.5 || stockoutRisksAfterDelay.length > 3) {
      riskLevel = 'MODERATE';
      riskColor = 'amber';
      riskMessage = `Moderate pressure. Watch ${stockoutRisksAfterDelay.length} items that may stock out during supplier delay.`;
    } else {
      riskLevel = 'HEALTHY';
      riskColor = 'green';
      riskMessage = `Healthy liquidity maintained. ₹${Math.round(projectedCashBalance).toLocaleString('en-IN')} projected cash balance after 30 days.`;
    }

    // ── Generate 30-day chart data ─────────────────────────────────────────
    const chartData = [];
    let runningCash = cashReserve - purchaseAmount; // immediate outflow on purchase
    const dailyRevenue = projectedRevenue30d / 30;
    const dailyOps = operatingCosts / 30;

    for (let d = 0; d <= 30; d++) {
      chartData.push({
        day: d,
        cashBalance: Math.round(runningCash),
        revenue: d === 0 ? 0 : Math.round(dailyRevenue * (1 + Math.sin(d / 7) * 0.1)),
        threshold: 5000 // minimum cash buffer line
      });
      runningCash += dailyRevenue - dailyOps;
    }

    res.json({
      input: { purchaseAmount, demandShiftPercent, supplierDelayDays, festivalMultiplier, cashReserve },
      projectedRevenue30d: Math.round(projectedRevenue30d),
      projectedCashBalance: Math.round(projectedCashBalance),
      capitalLockRatio: Math.round(capitalLockRatio * 100),
      safeMaxPurchase: Math.round(safeMaxPurchase),
      riskLevel,
      riskColor,
      riskMessage,
      stockoutRisksAfterDelay: stockoutRisksAfterDelay.length,
      chartData,
      reasoning: [
        `Projected 30-day revenue at ${demandShiftPercent >= 0 ? '+' : ''}${demandShiftPercent}% demand shift: ₹${Math.round(projectedRevenue30d).toLocaleString('en-IN')}`,
        `Purchase of ₹${purchaseAmount.toLocaleString('en-IN')} locks ${Math.round(capitalLockRatio * 100)}% of monthly revenue as inventory`,
        supplierDelayDays > 0 ? `${supplierDelayDays}-day supplier delay creates ${stockoutRisksAfterDelay.length} additional stockout risks` : null,
        festivalMultiplier > 1 ? `Festival demand multiplier ${festivalMultiplier}× applied — revenue upside factored in` : null,
        `Safe max purchase recommendation: ₹${Math.round(safeMaxPurchase).toLocaleString('en-IN')}`
      ].filter(Boolean)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
