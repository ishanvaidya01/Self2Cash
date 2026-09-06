const router = require('express').Router();
const { getMatchesForMerchant, getClusterDemandSignal } = require('../services/MeshMatchingService');
const { runMatchScan } = require('../services/MeshMatchingService');
const MeshMatch = require('../models/MeshMatch');
const Merchant = require('../models/Merchant');

// GET /api/mesh/matches/:merchantId
router.get('/matches/:merchantId', async (req, res) => {
  try {
    const matches = await getMatchesForMerchant(req.params.merchantId);
    res.json({ matches, count: matches.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/mesh/demand-signal/:category?merchantId=
router.get('/demand-signal/:category', async (req, res) => {
  try {
    const merchantId = req.query.merchantId || process.env.DEMO_MERCHANT_ID;
    const merchant = await Merchant.findOne({ merchantId });
    if (!merchant) return res.status(404).json({ error: 'Merchant not found' });

    const signal = await getClusterDemandSignal(
      decodeURIComponent(req.params.category),
      merchant.location.coordinates,
      merchant.meshRadiusMeters
    );

    res.json(signal || { signal: 'INSUFFICIENT_DATA', message: 'Not enough cluster data yet' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/mesh/propose-swap
router.post('/propose-swap', async (req, res) => {
  try {
    const { matchId, action, merchantId } = req.body; // action: 'ACCEPT' | 'DECLINE'
    const match = await MeshMatch.findOne({ matchId });
    if (!match) return res.status(404).json({ error: 'Match not found' });

    if (action === 'ACCEPT') {
      match.status = 'ACCEPTED';
    } else if (action === 'DECLINE') {
      match.status = 'DECLINED';
    }
    match.respondedAt = new Date();
    await match.save();

    // Broadcast update
    const broadcaster = require('../websocket/meshBroadcaster');
    broadcaster.emitToMerchant(match.surplusMerchantId, { type: 'mesh:match_updated', match: match.toObject() });
    broadcaster.emitToMerchant(match.shortageMerchantId, { type: 'mesh:match_updated', match: match.toObject() });

    res.json({ success: true, match });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/mesh/merchants?merchantId= — get all nearby merchants
router.get('/merchants', async (req, res) => {
  try {
    const merchantId = req.query.merchantId || process.env.DEMO_MERCHANT_ID;
    const merchant = await Merchant.findOne({ merchantId });
    if (!merchant) return res.status(404).json({ error: 'Merchant not found' });

    const nearby = await Merchant.find({
      merchantId: { $ne: merchantId },
      meshEnabled: true,
      location: {
        $nearSphere: {
          $geometry: merchant.location,
          $maxDistance: merchant.meshRadiusMeters
        }
      }
    });

    res.json({ merchants: nearby, referenceStore: merchant });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/mesh/scan — trigger immediate scan
router.post('/scan', async (req, res) => {
  try {
    const count = await runMatchScan();
    res.json({ success: true, newMatches: count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
