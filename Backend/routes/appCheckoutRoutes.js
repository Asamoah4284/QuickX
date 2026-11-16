const express = require('express');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Event = require('../models/Event');
const EventTicket = require('../models/EventTicket');
const TradingPie = require('../models/TradingPie');
const paystack = require('../services/paystackService');
const { quoteProduct } = require('../services/productService');
const { validatePurchaseIntent } = require('../services/purchaseCompletionService');
const { sliceProblem } = require('../controllers/ptradingController');
const { newReference, payerEmail, resolveCheckout } = require('../services/appCheckoutService');

const router = express.Router();
const isId = (id) => mongoose.Types.ObjectId.isValid(id);

const deps = {
    quoteProduct,
    validatePurchaseIntent,
    sliceProblem,
    findEvent: (id) => (isId(id) ? Event.findById(id).lean() : null),
    findPie: (id) => (isId(id) ? TradingPie.findById(id).lean() : null),
    hasTicket: (eventId, userId) => EventTicket.exists({ eventId, userId, status: 'confirmed' }),
};

/**
 * POST /api/payments/paystack/initialize
 * Opens a Paystack checkout page for the phone app. Body: { purpose, ...details }.
 * After paying, the app confirms with the usual endpoint for that purpose, using the reference.
 */
router.post('/initialize', auth, async (req, res) => {
    try {
        const purpose = String(req.body?.purpose || '');
        const checkout = await resolveCheckout({ purpose, body: req.body, user: req.user }, deps);
        const reference = newReference(purpose);
        const site = String(process.env.FRONTEND_URL || 'https://quickxlearn.com').replace(/\/$/, '');

        const started = await paystack.initializePayment({
            email: payerEmail(req.user),
            amount: checkout.amount,
            reference,
            metadata: { ...checkout.metadata, source: 'app', user_id: String(req.user._id) },
            callbackUrl: `${site}/payment/done`,
        });
        if (!started.ok) {
            const status = started.code === 'NOT_CONFIGURED' || started.code === 'UNAVAILABLE' ? 503 : 400;
            return res.status(status).json({ message: started.message, code: started.code });
        }
        res.json({ url: started.url, reference: started.reference, amount: checkout.amount, label: checkout.label });
    } catch (error) {
        if (!error.status) console.error('app checkout initialize:', error);
        res.status(error.status || 400).json({ message: error.message || 'Could not start the payment' });
    }
});

module.exports = router;
