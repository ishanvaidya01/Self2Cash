const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const VisionVerification = require('../models/VisionVerification');
const Inventory = require('../models/Inventory');
const Product = require('../models/Product');
const broadcaster = require('../websocket/meshBroadcaster');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// POST /api/vision/verify-shelf
// Body: { merchantId, productId, cvCount, confidence, digitalCount } + optional image
router.post('/verify-shelf', upload.single('image'), async (req, res) => {
  try {
    const {
      merchantId = process.env.DEMO_MERCHANT_ID,
      productId,
      cvCount,
      confidence = 0.85,
      digitalCount: providedDigitalCount
    } = req.body;

    const [inv, product] = await Promise.all([
      Inventory.findOne({ merchantId, productId }),
      Product.findOne({ productId, merchantId })
    ]);

    if (!inv || !product) {
      return res.status(404).json({ error: 'Product or inventory not found' });
    }

    const digitalCount = providedDigitalCount !== undefined ? parseInt(providedDigitalCount) : inv.quantity;
    const cvCountInt = parseInt(cvCount);
    const mismatch = digitalCount - cvCountInt;
    const mismatchPercent = Math.round(Math.abs(mismatch) / Math.max(digitalCount, 1) * 1000) / 10;
    const financialImpact = Math.abs(mismatch) * product.purchasePrice;

    // Classify discrepancy cause
    let discrepancyCause = 'UNKNOWN';
    if (mismatch > 0) {
      discrepancyCause = mismatchPercent > 15 ? 'SHRINKAGE' : 'COUNTING_ERROR';
    } else if (mismatch < 0) {
      discrepancyCause = 'UNBILLED_SALE';
    }

    // Save verification
    const verification = await VisionVerification.create({
      verifyId: uuidv4(),
      merchantId,
      productId,
      productName: product.name,
      digitalCount,
      cvCount: cvCountInt,
      mismatch,
      mismatchPercent,
      financialImpact,
      confidence: parseFloat(confidence),
      timestamp: new Date(),
      imageRef: req.file ? `vision_${Date.now()}.jpg` : null,
      status: 'PENDING_REVIEW',
      discrepancyCause
    });

    // Update inventory mismatch counter
    await Inventory.updateOne(
      { merchantId, productId },
      { $inc: { visionMismatchCount: Math.abs(mismatch) > 0 ? 1 : 0 }, lastVisionVerifiedAt: new Date() }
    );

    const result = {
      verifyId: verification.verifyId,
      productName: product.name,
      category: product.category,
      digitalCount,
      cvCount: cvCountInt,
      mismatch,
      mismatchPercent,
      financialImpact,
      confidence: parseFloat(confidence),
      discrepancyCause,
      financialFraming: mismatch === 0
        ? 'Inventory matches physical count. No discrepancy.'
        : `${Math.abs(mismatch)} unit discrepancy = ₹${Math.round(financialImpact).toLocaleString('en-IN')} ${mismatch > 0 ? 'shrinkage/damage risk' : 'unbilled sales risk'}`,
      timestamp: new Date().toISOString()
    };

    // Broadcast via WebSocket (Office Kit relay to laptop dashboard)
    broadcaster.emitVisionResult({
      ...result,
      merchantId,
      merchantName: `Demo Store` // would come from merchant doc in production
    });

    res.json({ success: true, verification: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/vision/history?merchantId=
router.get('/history', async (req, res) => {
  try {
    const merchantId = req.query.merchantId || process.env.DEMO_MERCHANT_ID;
    const verifications = await VisionVerification.find({ merchantId }).sort({ timestamp: -1 }).limit(20);
    res.json({ verifications });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
