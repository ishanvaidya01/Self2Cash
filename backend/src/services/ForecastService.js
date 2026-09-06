/**
 * ForecastService — Bridge to Python ML microservice
 * Falls back to in-process WMA if ML service is unreachable
 */

const axios = require('axios');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const ExternalSignal = require('../models/ExternalSignal');

const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// Fetch 90 days of sales history for a product
async function getSalesHistory(merchantId, productId, days = 90) {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const sales = await Sale.aggregate([
    { $match: { merchantId, productId, timestamp: { $gte: cutoff }, isReturned: false } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
        units: { $sum: '$quantity' }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // Fill in zero-sales days
  const history = [];
  for (let d = days; d >= 0; d--) {
    const date = new Date(Date.now() - d * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];
    const found = sales.find(s => s._id === dateStr);
    history.push({ date: dateStr, units: found ? found.units : 0 });
  }
  return history;
}

// In-process Weighted Moving Average fallback
function wmaForecast(history, windowDays = 14) {
  const recent = history.slice(-windowDays);
  if (recent.length === 0) return { dailyForecast: 0, confidence: 0.3 };

  // Weights: linearly increasing (most recent = highest weight)
  const weights = recent.map((_, i) => i + 1);
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const weightedAvg = recent.reduce((sum, day, i) => sum + day.units * weights[i], 0) / weightSum;

  // Confidence: based on coefficient of variation (lower CV = higher confidence)
  const mean = recent.reduce((s, d) => s + d.units, 0) / recent.length;
  const variance = recent.reduce((s, d) => s + Math.pow(d.units - mean, 2), 0) / recent.length;
  const cv = mean > 0 ? Math.sqrt(variance) / mean : 1;
  const confidence = Math.max(0.3, Math.min(0.95, 1 - cv * 0.5));

  return {
    dailyForecast: Math.round(weightedAvg * 10) / 10,
    confidence: Math.round(confidence * 100) / 100,
    model: 'WMA_FALLBACK'
  };
}

async function getForecast(merchantId, productId) {
  const [product, history, signals] = await Promise.all([
    Product.findOne({ productId, merchantId }),
    getSalesHistory(merchantId, productId, 90),
    ExternalSignal.find({ isActive: true, expiresAt: { $gt: new Date() } })
  ]);

  if (!product) return null;

  // Active festival/weather multipliers
  const multipliers = [];
  for (const signal of signals) {
    if (signal.type === 'FESTIVAL' && signal.payload?.categories?.includes(product.category)) {
      multipliers.push({ source: signal.payload.name, factor: signal.payload.demandMultiplier });
    }
    if (signal.type === 'WEATHER_ALERT') {
      const weatherMultipliers = {
        'heat_wave': { categories: ['Dairy & Beverages'], factor: 1.4 },
        'heavy_rain': { categories: ['Biscuits & Snacks', 'Noodles & Pasta'], factor: 1.25 }
      };
      const wm = weatherMultipliers[signal.payload?.condition];
      if (wm?.categories.includes(product.category)) {
        multipliers.push({ source: `Weather: ${signal.payload.condition}`, factor: wm.factor });
      }
    }
  }

  const externalMultiplier = multipliers.reduce((m, x) => m * x.factor, 1.0);

  try {
    // Try ML microservice first
    const response = await axios.post(`${ML_URL}/forecast`, {
      salesHistory: history,
      productMeta: {
        category: product.category,
        perishable: product.perishable,
        sellingPrice: product.sellingPrice
      },
      externalMultiplier
    }, { timeout: 3000 });

    const mlResult = response.data;
    return buildForecastResult(mlResult, product, history, multipliers, externalMultiplier);
  } catch (err) {
    // Fallback to in-process WMA
    console.warn(`[Forecast] ML service unavailable for ${productId}, using WMA fallback`);
    const wma = wmaForecast(history, 14);
    const adjustedForecast = wma.dailyForecast * externalMultiplier;
    return buildForecastResult({
      daily_forecast: adjustedForecast,
      forecast_7d: Array.from({ length: 7 }, () => Math.round(adjustedForecast * (0.9 + Math.random() * 0.2))),
      days_to_stockout: product.perishable ? 3 : Math.round(999 / Math.max(adjustedForecast, 0.01)),
      confidence: wma.confidence,
      model_used: wma.model
    }, product, history, multipliers, externalMultiplier);
  }
}

function buildForecastResult(mlResult, product, history, multipliers, externalMultiplier) {
  const { daily_forecast, forecast_7d, days_to_stockout, confidence, model_used } = mlResult;
  const projectedRevenue7d = (forecast_7d || []).reduce((s, u) => s + u * product.sellingPrice, 0);

  return {
    productId: product.productId,
    productName: product.name,
    category: product.category,
    dailyForecast: Math.round(daily_forecast * 10) / 10,
    forecast7d: forecast_7d || [],
    daysToStockout: Math.round(days_to_stockout),
    confidence,
    modelUsed: model_used,
    projectedRevenue7d: Math.round(projectedRevenue7d),
    projectedRevenue30d: Math.round(daily_forecast * 30 * product.sellingPrice),
    externalMultiplier,
    multipliers,
    historySummary: {
      avgDaily7d: Math.round(history.slice(-7).reduce((s, d) => s + d.units, 0) / 7 * 10) / 10,
      avgDaily30d: Math.round(history.slice(-30).reduce((s, d) => s + d.units, 0) / 30 * 10) / 10,
      trend: detectTrend(history.slice(-14))
    },
    computedAt: new Date().toISOString()
  };
}

function detectTrend(recentHistory) {
  if (recentHistory.length < 7) return 'INSUFFICIENT_DATA';
  const firstHalf = recentHistory.slice(0, 7).reduce((s, d) => s + d.units, 0) / 7;
  const secondHalf = recentHistory.slice(7).reduce((s, d) => s + d.units, 0) / Math.max(recentHistory.slice(7).length, 1);
  const change = firstHalf > 0 ? (secondHalf - firstHalf) / firstHalf : 0;
  if (change > 0.1) return 'RISING';
  if (change < -0.1) return 'FALLING';
  return 'STABLE';
}

module.exports = { getForecast, getSalesHistory, wmaForecast };
