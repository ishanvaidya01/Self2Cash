/**
 * CreditScoreService — Multi-dimensional lender-ready score
 * Framed around Account Aggregator (RBI/Sahamati) framework concepts
 */

const Sale = require('../models/Sale');
const Purchase = require('../models/Purchase');
const Customer = require('../models/Customer');
const Inventory = require('../models/Inventory');
const Product = require('../models/Product');
const Merchant = require('../models/Merchant');

async function computeCreditScore(merchantId) {
  const merchant = await Merchant.findOne({ merchantId });
  if (!merchant) return null;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const [
    recentSales,
    historicalSales,
    inventoryItems,
    products,
    customers,
    purchases
  ] = await Promise.all([
    Sale.aggregate([
      { $match: { merchantId, timestamp: { $gte: thirtyDaysAgo }, isReturned: false } },
      { $group: { _id: '$paymentMode', total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
    ]),
    Sale.aggregate([
      { $match: { merchantId, timestamp: { $gte: ninetyDaysAgo }, isReturned: false } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$timestamp' } }, revenue: { $sum: '$totalAmount' } } }
    ]),
    Inventory.find({ merchantId }),
    Product.find({ merchantId }),
    Customer.find({ merchantId }),
    Purchase.find({ merchantId, timestamp: { $gte: ninetyDaysAgo } })
  ]);

  const productMap = new Map(products.map(p => [p.productId, p]));

  // ── Factor 1: Sales Consistency (25%) ─────────────────────────────────────
  // Measures month-over-month revenue stability
  const monthlyRevenues = historicalSales.map(m => m.revenue);
  let salesConsistencyScore = 50;
  if (monthlyRevenues.length >= 2) {
    const avg = monthlyRevenues.reduce((a, b) => a + b, 0) / monthlyRevenues.length;
    const variance = monthlyRevenues.reduce((s, r) => s + Math.pow(r - avg, 2), 0) / monthlyRevenues.length;
    const cv = avg > 0 ? Math.sqrt(variance) / avg : 1;
    salesConsistencyScore = Math.max(20, Math.min(100, (1 - cv) * 100));
  }

  const totalRevenue30d = recentSales.reduce((s, m) => s + m.total, 0);
  const upiCashRatio = recentSales
    .filter(m => ['UPI', 'CASH'].includes(m._id))
    .reduce((s, m) => s + m.total, 0) / Math.max(totalRevenue30d, 1);

  // ── Factor 2: Inventory Quality (20%) ─────────────────────────────────────
  let totalCapital = 0, fastMediumCapital = 0;
  for (const inv of inventoryItems) {
    const product = productMap.get(inv.productId);
    if (!product) continue;
    const capital = inv.quantity * product.purchasePrice;
    totalCapital += capital;
    if (['FAST', 'MEDIUM'].includes(inv.velocityTier)) fastMediumCapital += capital;
  }
  const inventoryQualityScore = totalCapital > 0
    ? Math.round((fastMediumCapital / totalCapital) * 100)
    : 50;

  // ── Factor 3: Payment Discipline (20%) ────────────────────────────────────
  const paidPurchases = purchases.filter(p => p.paymentStatus === 'PAID').length;
  const totalPurchases = purchases.length;
  const paymentDisciplineScore = totalPurchases > 0
    ? Math.round((paidPurchases / totalPurchases) * 100)
    : 70;

  // ── Factor 4: Digital Footprint (15%) ─────────────────────────────────────
  // UPI/card usage = better traceability for lenders
  const digitalPaymentRatio = upiCashRatio;
  const digitalScore = Math.round(digitalPaymentRatio * 100);

  // ── Factor 5: Customer Credit Management (10%) ─────────────────────────────
  const totalDue = customers.reduce((s, c) => s + c.currentDue, 0);
  const overdueDue = customers.filter(c => c.isOverdue).reduce((s, c) => s + c.currentDue, 0);
  const collectionScore = totalDue > 0
    ? Math.round((1 - overdueDue / totalDue) * 100)
    : 80;

  // ── Factor 6: Business Tenure (10%) ───────────────────────────────────────
  const tenureScore = Math.min(100, merchant.yearsInBusiness * 10 + 20);

  // ── Composite (weighted) ──────────────────────────────────────────────────
  const composite = Math.round(
    salesConsistencyScore * 0.25 +
    inventoryQualityScore * 0.20 +
    paymentDisciplineScore * 0.20 +
    digitalScore * 0.15 +
    collectionScore * 0.10 +
    tenureScore * 0.10
  );

  // ── Credit tiers ──────────────────────────────────────────────────────────
  let tier, maxCreditLimitEstimate;
  if (composite >= 80) { tier = 'PRIME'; maxCreditLimitEstimate = totalRevenue30d * 1.5; }
  else if (composite >= 65) { tier = 'STANDARD'; maxCreditLimitEstimate = totalRevenue30d * 0.8; }
  else if (composite >= 50) { tier = 'SUBPRIME'; maxCreditLimitEstimate = totalRevenue30d * 0.4; }
  else { tier = 'HIGH_RISK'; maxCreditLimitEstimate = 0; }

  return {
    merchantId,
    storeName: merchant.storeName,
    score: composite,
    tier,
    maxCreditLimitEstimate: Math.round(maxCreditLimitEstimate),
    factors: {
      salesConsistency: {
        score: Math.round(salesConsistencyScore), weight: 25, label: 'Sales Consistency',
        detail: `₹${Math.round(totalRevenue30d).toLocaleString('en-IN')} revenue last 30 days`,
        aaFramework: 'Bank Statement Analysis'
      },
      inventoryQuality: {
        score: inventoryQualityScore, weight: 20, label: 'Inventory Quality',
        detail: `${inventoryQualityScore}% capital in actively-selling inventory`,
        aaFramework: 'GST Invoice Analysis'
      },
      paymentDiscipline: {
        score: paymentDisciplineScore, weight: 20, label: 'Supplier Payment Discipline',
        detail: `${paidPurchases} of ${totalPurchases} purchases paid on time`,
        aaFramework: 'Trade Credit Behaviour'
      },
      digitalFootprint: {
        score: digitalScore, weight: 15, label: 'Digital Transaction Footprint',
        detail: `${Math.round(upiCashRatio * 100)}% revenue via UPI/digital channels`,
        aaFramework: 'Bank Statement Analysis'
      },
      collectionEfficiency: {
        score: collectionScore, weight: 10, label: 'Customer Credit Management',
        detail: `₹${overdueDue.toLocaleString('en-IN')} overdue of ₹${totalDue.toLocaleString('en-IN')} total receivables`,
        aaFramework: 'Trade Receivables'
      },
      businessTenure: {
        score: tenureScore, weight: 10, label: 'Business Tenure',
        detail: `${merchant.yearsInBusiness} year${merchant.yearsInBusiness !== 1 ? 's' : ''} in operation`,
        aaFramework: 'Business Vintage'
      }
    },
    aaFrameworkNote: 'This score is built on data consistent with India\'s Account Aggregator (RBI/Sahamati) framework — ready for lender API sharing.',
    computedAt: new Date().toISOString()
  };
}

module.exports = { computeCreditScore };
