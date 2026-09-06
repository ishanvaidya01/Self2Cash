/**
 * MicroFactoringService — Per-SKU instant advance quotes
 * Formula: advance = projected_7d_revenue × 0.85 × confidence
 *          fee_rate = 2% + (1 - confidence) × 2% [range: 2–4%]
 */

const { getForecast } = require('./ForecastService');
const { getCashConversionClock } = require('./WorkingCapitalService');
const FactoringQuote = require('../models/FactoringQuote');
const Inventory = require('../models/Inventory');
const Product = require('../models/Product');

const BASE_FEE_RATE = 0.02; // 2%
const MAX_FEE_RATE = 0.04;  // 4%
const ADVANCE_RATIO = 0.85;  // 85% of projected revenue
const MIN_ADVANCE = 1000;    // ₹1,000 minimum

async function generateQuote(merchantId, productId) {
  const [forecast, clock, inv, product] = await Promise.all([
    getForecast(merchantId, productId),
    getCashConversionClock(merchantId, productId),
    Inventory.findOne({ merchantId, productId }),
    Product.findOne({ productId, merchantId })
  ]);

  if (!forecast || !inv || !product) {
    return { error: 'Product not found or insufficient sales history' };
  }

  const { projectedRevenue7d, confidence, daysToStockout, forecast7d, modelUsed } = forecast;

  // Reject if dead stock (can't factor something that won't sell)
  if (inv.velocityTier === 'DEAD' || projectedRevenue7d < MIN_ADVANCE) {
    return {
      eligible: false,
      reason: inv.velocityTier === 'DEAD'
        ? 'Dead stock cannot be factored. Inventory must show active sales velocity.'
        : `Projected 7-day revenue (₹${projectedRevenue7d}) below minimum threshold.`,
      productId,
      productName: product.name
    };
  }

  // Dynamic fee based on confidence
  const feeRate = Math.min(MAX_FEE_RATE, BASE_FEE_RATE + (1 - confidence) * 0.02);
  const advanceAmount = Math.round(projectedRevenue7d * ADVANCE_RATIO * confidence);
  const feeAmount = Math.round(advanceAmount * feeRate);
  const repaymentAmount = advanceAmount + feeAmount;

  // Check for existing active quote
  const existingQuote = await FactoringQuote.findOne({
    merchantId, productId,
    status: { $in: ['QUOTED', 'ACCEPTED'] },
    expiresAt: { $gt: new Date() }
  });

  if (existingQuote) {
    return {
      eligible: true,
      quote: existingQuote.toObject(),
      existingQuote: true
    };
  }

  // Create new quote
  const quote = await FactoringQuote.create({
    quoteId: `fq_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    merchantId,
    productId,
    productName: product.name,
    projectedUnits7d: forecast7d.reduce((s, u) => s + u, 0),
    projectedRevenue7d,
    forecastConfidence: confidence,
    daysToStockout,
    advanceAmount,
    feeRate: Math.round(feeRate * 10000) / 100, // store as percent
    feeAmount,
    repaymentAmount,
    avgCashConversionDays: clock?.daysToRecoverCapital || daysToStockout,
    repaymentMechanism: 'Auto-deducted as sales post to your ledger',
    status: 'QUOTED',
    quotedAt: new Date(),
    expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000) // valid 48h
  });

  return {
    eligible: true,
    quote: {
      ...quote.toObject(),
      explanation: {
        projectedRevenue7d,
        confidence,
        advanceRatio: ADVANCE_RATIO,
        formula: `₹${projectedRevenue7d.toLocaleString('en-IN')} × ${ADVANCE_RATIO} × ${confidence.toFixed(2)} confidence = ₹${advanceAmount.toLocaleString('en-IN')}`,
        feeExplanation: `Base 2% + ${Math.round((feeRate - 0.02) * 100)}% confidence adjustment = ${(feeRate * 100).toFixed(1)}% total`,
        modelUsed,
        cashConversionDays: clock?.daysToRecoverCapital
      }
    }
  };
}

async function acceptQuote(quoteId, merchantId) {
  const quote = await FactoringQuote.findOne({ quoteId, merchantId });
  if (!quote || quote.status !== 'QUOTED') {
    return { success: false, error: 'Quote not found or already processed' };
  }
  if (new Date() > quote.expiresAt) {
    return { success: false, error: 'Quote has expired. Please generate a new quote.' };
  }
  quote.status = 'ACCEPTED';
  quote.acceptedAt = new Date();
  await quote.save();
  return { success: true, quote: quote.toObject() };
}

async function getQuotesForMerchant(merchantId) {
  return FactoringQuote.find({ merchantId }).sort({ quotedAt: -1 }).limit(20);
}

module.exports = { generateQuote, acceptQuote, getQuotesForMerchant };
