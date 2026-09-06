const router = require('express').Router();
const Merchant = require('../models/Merchant');

router.get('/', async (req, res) => {
  try {
    const merchants = await Merchant.find({}).select('-passwordHash');
    res.json({ merchants });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:merchantId', async (req, res) => {
  try {
    const merchant = await Merchant.findOne({ merchantId: req.params.merchantId }).select('-passwordHash');
    if (!merchant) return res.status(404).json({ error: 'Merchant not found' });
    res.json(merchant);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
