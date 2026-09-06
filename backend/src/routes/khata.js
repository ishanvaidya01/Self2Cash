const router = require('express').Router();
const Customer = require('../models/Customer');
const axios = require('axios');

// GET /api/khata/:customerId?merchantId=
router.get('/:customerId', async (req, res) => {
  try {
    const merchantId = req.query.merchantId || process.env.DEMO_MERCHANT_ID;
    const customer = await Customer.findOne({ customerId: req.params.customerId, merchantId });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/khata?merchantId= (list all customers)
router.get('/', async (req, res) => {
  try {
    const merchantId = req.query.merchantId || process.env.DEMO_MERCHANT_ID;
    const customers = await Customer.find({ merchantId }).sort({ isOverdue: -1, currentDue: -1 });
    const totalDue = customers.reduce((s, c) => s + c.currentDue, 0);
    const overdueDue = customers.filter(c => c.isOverdue).reduce((s, c) => s + c.currentDue, 0);
    res.json({ customers, summary: { totalDue, overdueDue, overdueCount: customers.filter(c => c.isOverdue).length } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/khata/reminder — WhatsApp reminder
router.post('/reminder', async (req, res) => {
  try {
    const { customerId, merchantId = process.env.DEMO_MERCHANT_ID } = req.body;
    const customer = await Customer.findOne({ customerId, merchantId });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const token = process.env.WHATSAPP_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_ID;
    const isSandbox = !token || token === 'your_whatsapp_token_here';

    const message = {
      messaging_product: 'whatsapp',
      to: customer.phone,
      type: 'text',
      text: {
        body: `Namaskar ${customer.name}ji! 🙏\n\nYour account at our store has an outstanding balance of ₹${customer.currentDue.toLocaleString('en-IN')}.\n\nKindly clear the amount at your earliest convenience.\n\nThank you!`
      }
    };

    if (isSandbox) {
      // Sandbox mode — log the payload
      console.log('[WhatsApp Sandbox] Reminder payload:', JSON.stringify(message, null, 2));
      await Customer.updateOne({ customerId }, { whatsappReminderSentAt: new Date() });
      return res.json({
        success: true,
        sandboxMode: true,
        message: 'WhatsApp API not configured — reminder logged in sandbox mode',
        payload: message,
        sentTo: customer.phone,
        customerName: customer.name,
        amount: customer.currentDue
      });
    }

    // Real WhatsApp API call
    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${phoneId}/messages`,
      message,
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );

    await Customer.updateOne({ customerId }, { whatsappReminderSentAt: new Date() });
    res.json({ success: true, waResponse: response.data, sentTo: customer.phone });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/khata/transaction — add credit or payment
router.post('/transaction', async (req, res) => {
  try {
    const { customerId, merchantId = process.env.DEMO_MERCHANT_ID, type, amount, note } = req.body;
    const customer = await Customer.findOne({ customerId, merchantId });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const delta = type === 'CREDIT' ? amount : -amount;
    customer.currentDue = Math.max(0, customer.currentDue + delta);
    customer.transactions.push({ type, amount, date: new Date(), note: note || '' });
    if (type === 'PAYMENT') customer.lastPaymentDate = new Date();

    // Re-evaluate overdue
    const daysSincePayment = customer.lastPaymentDate
      ? (Date.now() - customer.lastPaymentDate) / (1000 * 60 * 60 * 24)
      : 999;
    customer.isOverdue = customer.currentDue > 0 && daysSincePayment > 30;
    if (customer.isOverdue && !customer.overdueSince) customer.overdueSince = new Date();
    if (!customer.isOverdue) customer.overdueSince = null;

    await customer.save();
    res.json({ success: true, customer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
