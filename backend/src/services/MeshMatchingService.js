/**
 * MeshMatchingService — Geospatial surplus-shortage matching
 * Uses MongoDB $nearSphere for merchant proximity queries
 */

const Merchant = require('../models/Merchant');
const Inventory = require('../models/Inventory');
const Product = require('../models/Product');
const MeshMatch = require('../models/MeshMatch');
const Supplier = require('../models/Supplier');
const broadcaster = require('../websocket/meshBroadcaster');

const SURPLUS_DAYS_THRESHOLD = 30;    // > 30 days of stock = potential surplus
const SHORTAGE_DAYS_THRESHOLD = 7;    // < 7 days of stock = shortage

async function runMatchScan() {
  const merchants = await Merchant.find({ meshEnabled: true });
  let newMatchesCount = 0;

  for (const merchant of merchants) {
    // Find nearby merchants within this merchant's radius
    const nearbyMerchants = await Merchant.find({
      merchantId: { $ne: merchant.merchantId },
      meshEnabled: true,
      location: {
        $nearSphere: {
          $geometry: merchant.location,
          $maxDistance: merchant.meshRadiusMeters
        }
      }
    });

    if (nearbyMerchants.length === 0) continue;

    // Get surplus products for this merchant (> SURPLUS_DAYS_THRESHOLD)
    const surplusItems = await Inventory.find({
      merchantId: merchant.merchantId,
      daysToStockout: { $gte: SURPLUS_DAYS_THRESHOLD },
      quantity: { $gt: 0 },
      velocityTier: { $in: ['SLOW', 'DEAD'] }
    });

    if (surplusItems.length === 0) continue;

    // Get products for this merchant
    const surplusProductIds = surplusItems.map(i => i.productId);
    const surplusProducts = await Product.find({ productId: { $in: surplusProductIds } });
    const surplusProductMap = new Map(surplusProducts.map(p => [p.productId, p]));
    const suppliers = await Supplier.find({});
    const supplierMap = new Map(suppliers.map(s => [s.supplierId, s]));

    // Check each nearby merchant for shortages matching our surplus
    for (const nearbyMerchant of nearbyMerchants) {
      // Compute distance
      const distMeters = haversineDistance(
        merchant.location.coordinates,
        nearbyMerchant.location.coordinates
      );

      // Get shortage products at nearby merchant
      const shortageItems = await Inventory.find({
        merchantId: nearbyMerchant.merchantId,
        daysToStockout: { $lte: SHORTAGE_DAYS_THRESHOLD },
        velocityTier: { $nin: ['DEAD'] } // only shortage on active items
      });

      if (shortageItems.length === 0) continue;

      // Get product names for nearby merchant's shortage items
      const shortageProductIds = shortageItems.map(i => i.productId);
      const shortageProducts = await Product.find({ productId: { $in: shortageProductIds } });
      const shortageProductMap = new Map(shortageProducts.map(p => [p.productId, p]));

      // Match by product name + category (since productIds differ per merchant)
      for (const shortageInv of shortageItems) {
        const shortageProduct = shortageProductMap.get(shortageInv.productId);
        if (!shortageProduct) continue;

        // Find matching surplus by name + category
        const matchingSurplus = surplusItems.find(si => {
          const sp = surplusProductMap.get(si.productId);
          return sp &&
            sp.name === shortageProduct.name &&
            sp.category === shortageProduct.category;
        });

        if (!matchingSurplus) continue;

        const surplusProduct = surplusProductMap.get(matchingSurplus.productId);
        const supplier = supplierMap.get(shortageProduct.supplierId);
        const normalSupplierPrice = supplier?.priceHistory?.length > 0
          ? supplier.priceHistory.slice(-1)[0].price
          : shortageProduct.purchasePrice * 1.08; // assume 8% markup over purchase

        // Check if match already exists (non-expired)
        const existingMatch = await MeshMatch.findOne({
          surplusMerchantId: merchant.merchantId,
          shortageMerchantId: nearbyMerchant.merchantId,
          productId: matchingSurplus.productId,
          status: { $in: ['PROPOSED', 'ACCEPTED'] },
          expiresAt: { $gt: new Date() }
        });

        if (existingMatch) continue;

        // Calculate proposed transfer quantity
        const transferQty = Math.min(
          Math.floor(matchingSurplus.quantity * 0.5), // don't take more than half of surplus
          shortageInv.avgDailySales * 14 // 2 weeks worth for shortage merchant
        );

        if (transferQty <= 0) continue;

        // Savings = (normal supplier price - surplus purchase price) × qty - transport
        const transportCost = Math.min(distMeters * 0.05, 200); // ₹50–200 based on distance
        const savings = (normalSupplierPrice - surplusProduct.purchasePrice) * transferQty - transportCost;

        if (savings <= 0) continue; // no financial benefit

        // Create match
        const match = await MeshMatch.create({
          matchId: `mesh_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          surplusMerchantId: merchant.merchantId,
          surplusMerchantName: merchant.storeName,
          shortageMerchantId: nearbyMerchant.merchantId,
          shortageMerchantName: nearbyMerchant.storeName,
          productId: matchingSurplus.productId,
          productName: surplusProduct.name,
          category: surplusProduct.category,
          surplusQty: matchingSurplus.quantity,
          shortageQty: Math.ceil(shortageInv.avgDailySales * 7),
          proposedTransferQty: transferQty,
          distanceMeters: Math.round(distMeters),
          surplusPurchasePrice: surplusProduct.purchasePrice,
          shortageSupplierPrice: normalSupplierPrice,
          estimatedSavings: Math.round(savings),
          transportCostEstimate: Math.round(transportCost),
          daysUntilShortageStockout: shortageInv.daysToStockout,
          surplusDaysOfStock: matchingSurplus.daysToStockout,
          status: 'PROPOSED',
          proposedAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        });

        // Broadcast to both merchants
        broadcaster.emitMeshMatch(match);
        newMatchesCount++;
        console.log(`[Mesh] Match created: ${merchant.storeName} → ${nearbyMerchant.storeName} (${surplusProduct.name}, ₹${match.estimatedSavings} savings)`);
      }
    }
  }

  if (newMatchesCount > 0) {
    console.log(`[Mesh] Scan complete: ${newMatchesCount} new matches`);
  }

  return newMatchesCount;
}

// Cluster demand signal: rising velocity across merchants in a category
async function getClusterDemandSignal(category, referenceLocation, radiusMeters = 2000) {
  // Find all merchants in radius
  const nearbyMerchants = await Merchant.find({
    meshEnabled: true,
    location: {
      $nearSphere: {
        $geometry: { type: 'Point', coordinates: referenceLocation },
        $maxDistance: radiusMeters
      }
    }
  });

  const merchantIds = nearbyMerchants.map(m => m.merchantId);
  if (merchantIds.length < 2) return null;

  // Get products in this category for all nearby merchants
  const products = await Product.find({ merchantId: { $in: merchantIds }, category });
  const productIds = products.map(p => p.productId);

  if (productIds.length === 0) return null;

  // Compare last 3 days vs 14-day baseline
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const Sale = require('../models/Sale');

  const [recent, baseline] = await Promise.all([
    Sale.aggregate([
      { $match: { productId: { $in: productIds }, timestamp: { $gte: threeDaysAgo }, isReturned: false } },
      { $group: { _id: null, units: { $sum: '$quantity' } } }
    ]),
    Sale.aggregate([
      { $match: { productId: { $in: productIds }, timestamp: { $gte: fourteenDaysAgo, $lt: threeDaysAgo }, isReturned: false } },
      { $group: { _id: null, units: { $sum: '$quantity' } } }
    ])
  ]);

  const recentDailyVelocity = (recent[0]?.units || 0) / 3;
  const baselineDailyVelocity = (baseline[0]?.units || 0) / 11;

  if (baselineDailyVelocity === 0) return null;

  const velocityRatio = recentDailyVelocity / baselineDailyVelocity;
  const isRising = velocityRatio > 1.15; // 15% above baseline = rising signal

  return {
    category,
    merchantsInCluster: merchantIds.length,
    recentDailyVelocity: Math.round(recentDailyVelocity * 10) / 10,
    baselineDailyVelocity: Math.round(baselineDailyVelocity * 10) / 10,
    velocityRatio: Math.round(velocityRatio * 100) / 100,
    signal: isRising ? 'RISING' : velocityRatio < 0.85 ? 'FALLING' : 'STABLE',
    changePercent: Math.round((velocityRatio - 1) * 100),
    description: isRising
      ? `${category} demand rising ${Math.round((velocityRatio - 1) * 100)}% above normal across ${merchantIds.length} nearby stores in the last 3 days.`
      : `${category} demand stable across the cluster.`,
    computedAt: new Date().toISOString()
  };
}

async function getMatchesForMerchant(merchantId) {
  const matches = await MeshMatch.find({
    $or: [{ surplusMerchantId: merchantId }, { shortageMerchantId: merchantId }],
    status: { $in: ['PROPOSED', 'ACCEPTED'] },
    expiresAt: { $gt: new Date() }
  }).sort({ proposedAt: -1 });

  return matches.map(m => ({
    ...m.toObject(),
    role: m.surplusMerchantId === merchantId ? 'SURPLUS' : 'SHORTAGE'
  }));
}

// Haversine formula to compute distance in metres between two [lng, lat] pairs
function haversineDistance([lng1, lat1], [lng2, lat2]) {
  const R = 6371000;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

module.exports = { runMatchScan, getClusterDemandSignal, getMatchesForMerchant };
