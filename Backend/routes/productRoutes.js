const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const Product = require('../models/Product');
const Payment = require('../models/Payment');
const Entitlement = require('../models/Entitlement');
const User = require('../models/User');
const { ALL_FEATURES, PAID_FEATURES, FEATURES, isFeature } = require('../constants/features');
const { quoteProduct, findProduct, serializeProduct, PLAN_SORT } = require('../services/productService');
const { planGroup } = require('../models/Product');
const {
    getActiveEntitlements,
    grantFeatures,
    revokeFeature,
} = require('../services/entitlementService');
const { isOwner } = require('../services/ownerService');
const paystack = require('../services/paystackService');
const { fulfillCompletedPayment } = require('../services/purchaseCompletionService');

function fail(res, err, fallback = 'Server error') {
    const status = err?.status || 500;
    if (status >= 500) console.error(fallback, err);
    return res.status(status).json({ message: status >= 500 ? fallback : err.message });
}

function escapeRegex(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ── Public ───────────────────────────────────────────────────────────────────

router.get('/products', async (req, res) => {
    try {
        const products = await Product.find({ isActive: true, archived: { $ne: true } }).sort(PLAN_SORT);
        res.json({ products: products.map(serializeProduct), features: PAID_FEATURES });
    } catch (err) {
        fail(res, err);
    }
});

/** The mentor's public profile (the client needs his id for community URLs). */
router.get('/owner', async (req, res) => {
    try {
        const { getOwnerId } = require('../services/ownerService');
        const ownerId = await getOwnerId();
        if (!ownerId) return res.json({ owner: null });
        const owner = await User.findById(ownerId)
            .select('fullName profilePicture avatar creatorHeadline creatorBio')
            .lean();
        if (!owner) return res.json({ owner: null });
        res.json({
            owner: {
                id: String(owner._id),
                fullName: owner.fullName,
                profilePicture: owner.profilePicture || owner.avatar || '',
                headline: owner.creatorHeadline || '',
                bio: owner.creatorBio || '',
            },
        });
    } catch (err) {
        fail(res, err);
    }
});

/** Price the server will charge, with an optional coupon. */
router.get('/products/:key/quote', async (req, res) => {
    try {
        const quote = await quoteProduct(req.params.key, req.query.coupon);
        res.json({
            product: serializeProduct(quote.product),
            listPrice: quote.listPrice,
            discountPercent: quote.discountPercent,
            amount: quote.amount,
            couponCode: quote.couponCode,
        });
    } catch (err) {
        fail(res, err);
    }
});

// ── Member ───────────────────────────────────────────────────────────────────

router.get('/me/entitlements', auth, async (req, res) => {
    try {
        const owner = await isOwner(req.user._id);
        const rows = await getActiveEntitlements(req.user._id);
        res.json({
            isOwner: owner,
            features: owner ? ALL_FEATURES : rows.map((r) => r.feature),
            entitlements: rows.map((r) => ({
                feature: r.feature,
                startsAt: r.startsAt,
                endsAt: r.endsAt,
                productKey: r.productKey,
            })),
        });
    } catch (err) {
        fail(res, err);
    }
});

async function recordAndFulfil({ userId, quote, transactionId, paymentMethod }) {
    const payment = await Payment.create({
        userId,
        itemType: 'product',
        itemId: quote.product._id,
        productKey: quote.product.key,
        couponCode: quote.couponCode,
        originalAmount: quote.listPrice,
        finalAmount: quote.amount,
        transactionId,
        paymentMethod,
        status: 'completed',
    });
    const result = await fulfillCompletedPayment(payment);
    return { payment, entitlements: result.entitlements || [] };
}

function entitlementsPayload(rows) {
    return (rows || []).map((r) => ({ feature: r.feature, endsAt: r.endsAt }));
}

/**
 * Card / Paystack checkout. The browser sends only the Paystack reference; the
 * server confirms the payment and the amount with Paystack before granting.
 */
router.post('/products/:key/purchase/paystack', auth, async (req, res) => {
    try {
        const reference = String(req.body.reference || '').trim();
        if (!reference) return res.status(400).json({ message: 'Payment reference is required' });

        const existing = await Payment.findOne({ transactionId: reference });
        if (existing) {
            if (String(existing.userId) !== String(req.user._id) || existing.itemType !== 'product') {
                return res.status(409).json({ message: 'This payment reference has already been used' });
            }
            const result = await fulfillCompletedPayment(existing);
            return res.json({ success: true, alreadyRecorded: true, entitlements: entitlementsPayload(result.entitlements) });
        }

        const quote = await quoteProduct(req.params.key, req.body.couponCode);
        if (quote.amount < 0.01) {
            return res.status(400).json({ message: 'This coupon covers the full price. Use Redeem instead.', code: 'USE_REDEEM' });
        }

        const verified = await paystack.verifyPayment(reference, quote.amount);
        if (!verified.ok) {
            const status = verified.code === 'NOT_CONFIGURED' || verified.code === 'UNAVAILABLE' ? 503 : 402;
            return res.status(status).json({ message: verified.message, code: verified.code });
        }

        const { entitlements } = await recordAndFulfil({
            userId: req.user._id,
            quote,
            transactionId: reference,
            paymentMethod: 'paystack',
        });
        res.json({ success: true, entitlements: entitlementsPayload(entitlements) });
    } catch (err) {
        fail(res, err, 'Could not complete purchase');
    }
});

/**
 * Pay for a plan from the wallet balance. The balance is taken first (it can
 * never go negative) and returned in full if the plan cannot be switched on.
 */
router.post('/products/:key/purchase/wallet', auth, async (req, res) => {
    const walletService = require('../services/walletService');
    try {
        const quote = await quoteProduct(req.params.key, req.body.couponCode);
        if (quote.amount < 0.01) {
            return res.status(400).json({ message: 'This coupon covers the full price. Use Redeem instead.', code: 'USE_REDEEM' });
        }

        const transactionId = `qx_wallet_plan_${req.user._id}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const balance = await walletService.debitWallet(req.user._id, quote.amount, {
            type: 'payment',
            label: `${quote.product.name} plan`,
            reference: transactionId,
        });

        try {
            const { entitlements } = await recordAndFulfil({
                userId: req.user._id,
                quote,
                transactionId,
                paymentMethod: 'wallet',
            });
            return res.json({ success: true, balance, entitlements: entitlementsPayload(entitlements) });
        } catch (grantErr) {
            console.error('Wallet plan purchase failed after debit, refunding:', grantErr);
            await walletService.creditWallet(req.user._id, quote.amount, {
                type: 'refund',
                label: `Refund: ${quote.product.name} plan`,
                reference: transactionId,
            });
            return res.status(500).json({ message: 'Could not activate the plan. Your wallet was not charged.' });
        }
    } catch (err) {
        if (err.code === 'INSUFFICIENT_BALANCE') {
            return res.status(400).json({ message: err.message, code: err.code, balance: err.balance });
        }
        fail(res, err, 'Could not complete purchase');
    }
});

/** A 100% coupon leaves nothing to charge, grant without a payment provider. */
router.post('/products/:key/redeem', auth, async (req, res) => {
    try {
        const quote = await quoteProduct(req.params.key, req.body.couponCode);
        if (!quote.couponCode || quote.amount >= 0.01) {
            return res.status(400).json({ message: 'This product requires payment' });
        }
        const { entitlements } = await recordAndFulfil({
            userId: req.user._id,
            quote,
            transactionId: `qx_coupon_${quote.couponCode}_${req.user._id}_${Date.now()}`,
            paymentMethod: 'coupon',
        });
        res.json({ success: true, entitlements: entitlementsPayload(entitlements) });
    } catch (err) {
        fail(res, err, 'Could not redeem coupon');
    }
});

// ── Admin: pricing ───────────────────────────────────────────────────────────

router.get('/admin/products', adminAuth, async (req, res) => {
    try {
        // The community is free now, so its old plan is left out of the editor.
        const products = await Product.find({ grants: { $ne: [FEATURES.COMMUNITY] }, archived: { $ne: true } }).sort(PLAN_SORT);
        res.json({ products: products.map(serializeProduct), features: PAID_FEATURES });
    } catch (err) {
        fail(res, err);
    }
});

/** The other lengths of the same plan (same features), not counting removed ones. */
async function lengthsOf(product) {
    const all = await Product.find({ archived: { $ne: true } });
    const group = planGroup(product.grants);
    return all.filter((p) => planGroup(p.grants) === group);
}

function readPrice(value) {
    const price = Number(value);
    if (!Number.isFinite(price) || price < 0 || price > 1000000) {
        const err = new Error('Enter a price of 0 or more');
        err.status = 400;
        throw err;
    }
    return Math.round(price * 100) / 100;
}

function readDays(value) {
    const days = Number(value);
    if (!Number.isInteger(days) || days < 1 || days > 3650) {
        const err = new Error('Length must be between 1 and 3650 days');
        err.status = 400;
        throw err;
    }
    return days;
}

function sameLengthTaken(lengths, days, exceptId) {
    return lengths.some((p) => p.durationDays === days && String(p._id) !== String(exceptId));
}

/**
 * Edit a plan. Price, length, badge and On sale belong to this one length.
 * Name, tagline, "What's included" and the order are shared by every length of the plan.
 */
router.put('/admin/products/:key', adminAuth, async (req, res) => {
    try {
        const product = await findProduct(req.params.key, { includeInactive: true });
        if (!product || product.archived) return res.status(404).json({ message: 'Plan not found' });
        const lengths = await lengthsOf(product);

        const b = req.body || {};
        const shared = {};
        if (b.name !== undefined) {
            const name = String(b.name).trim();
            if (!name) return res.status(400).json({ message: 'The plan needs a name' });
            shared.name = name;
        }
        if (b.tagline !== undefined) shared.tagline = String(b.tagline).trim();
        if (b.highlights !== undefined) {
            if (!Array.isArray(b.highlights)) return res.status(400).json({ message: 'highlights must be a list' });
            shared.highlights = b.highlights.map((h) => String(h).trim()).filter(Boolean).slice(0, 10);
        }
        if (b.order !== undefined && Number.isFinite(Number(b.order))) shared.order = Number(b.order);

        if (b.badge !== undefined) product.badge = String(b.badge).trim();
        if (b.price !== undefined) product.price = readPrice(b.price);
        if (b.durationDays !== undefined) {
            const days = readDays(b.durationDays);
            if (sameLengthTaken(lengths, days, product._id)) {
                return res.status(400).json({ message: 'This plan already has that length. Change the other one instead.' });
            }
            product.durationDays = days;
        }
        if (b.isActive !== undefined) product.isActive = Boolean(b.isActive);

        Object.assign(product, shared);
        await product.save();
        if (Object.keys(shared).length) {
            const others = lengths.filter((p) => String(p._id) !== String(product._id)).map((p) => p._id);
            if (others.length) await Product.updateMany({ _id: { $in: others } }, { $set: shared });
        }
        res.json({ product: serializeProduct(product) });
    } catch (err) {
        if (err?.name === 'ValidationError') return res.status(400).json({ message: err.message });
        fail(res, err);
    }
});

/** Add another length to a plan, e.g. Signals for 3 months. It copies the plan's wording. */
router.post('/admin/products/:key/lengths', adminAuth, async (req, res) => {
    try {
        const base = await findProduct(req.params.key, { includeInactive: true });
        if (!base || base.archived) return res.status(404).json({ message: 'Plan not found' });
        const days = readDays(req.body?.durationDays);
        const price = readPrice(req.body?.price);
        const lengths = await lengthsOf(base);
        if (sameLengthTaken(lengths, days)) {
            return res.status(400).json({ message: 'This plan already has that length' });
        }
        if (lengths.length >= 12) return res.status(400).json({ message: 'A plan can have up to 12 lengths' });

        // A readable, unique key: signals-90d, then signals-90d-2 if that was used before.
        const stem = `${base.key.replace(/-\d+d(-\d+)?$/, '')}-${days}d`;
        let key = stem;
        for (let i = 2; await Product.exists({ key }); i += 1) key = `${stem}-${i}`;

        const product = await Product.create({
            key,
            name: base.name,
            tagline: base.tagline,
            highlights: base.highlights,
            grants: base.grants,
            currency: base.currency,
            order: base.order,
            price,
            durationDays: days,
            isActive: req.body?.isActive === undefined ? true : Boolean(req.body.isActive),
        });
        res.status(201).json({ product: serializeProduct(product) });
    } catch (err) {
        if (err?.name === 'ValidationError') return res.status(400).json({ message: err.message });
        fail(res, err);
    }
});

/**
 * Remove a length. It is hidden, not deleted, so payments already made for it still
 * work. The last length of a plan cannot be removed; turn off On sale instead.
 */
router.delete('/admin/products/:key', adminAuth, async (req, res) => {
    try {
        const product = await findProduct(req.params.key, { includeInactive: true });
        if (!product || product.archived) return res.status(404).json({ message: 'Plan not found' });
        const lengths = await lengthsOf(product);
        if (lengths.length <= 1) {
            return res.status(400).json({ message: 'This is the only length of the plan. Turn off On sale to stop selling it.' });
        }
        product.archived = true;
        product.isActive = false;
        await product.save();
        res.json({ ok: true });
    } catch (err) {
        fail(res, err);
    }
});

// ── Admin: members ───────────────────────────────────────────────────────────

/** Members and what they currently have access to. */
router.get('/admin/members', adminAuth, async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
        const search = String(req.query.search || '').trim().slice(0, 100);
        const feature = String(req.query.feature || '').trim();
        const now = new Date();

        const userQuery = {};
        if (search) {
            const rx = new RegExp(escapeRegex(search), 'i');
            userQuery.$or = [{ fullName: rx }, { email: rx }, { phone: rx }];
        }
        if (feature) {
            if (!isFeature(feature)) return res.status(400).json({ message: 'Unknown feature' });
            userQuery._id = { $in: await Entitlement.distinct('userId', { feature, endsAt: { $gt: now } }) };
        }

        const [total, users] = await Promise.all([
            User.countDocuments(userQuery),
            User.find(userQuery)
                .select('fullName email phone profilePicture createdAt')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
        ]);

        const rows = await Entitlement.find({
            userId: { $in: users.map((u) => u._id) },
            endsAt: { $gt: now },
        })
            .select('userId feature endsAt productKey source')
            .lean();
        const byUser = new Map();
        for (const r of rows) {
            const k = String(r.userId);
            if (!byUser.has(k)) byUser.set(k, []);
            byUser.get(k).push({ feature: r.feature, endsAt: r.endsAt, productKey: r.productKey, source: r.source });
        }

        res.json({
            page,
            limit,
            total,
            members: users.map((u) => ({
                id: String(u._id),
                fullName: u.fullName,
                email: u.email,
                phone: u.phone || '',
                profilePicture: u.profilePicture || '',
                joinedAt: u.createdAt,
                entitlements: byUser.get(String(u._id)) || [],
            })),
        });
    } catch (err) {
        fail(res, err);
    }
});

/** Active member count per feature (admin overview). */
router.get('/admin/members/summary', adminAuth, async (req, res) => {
    try {
        const now = new Date();
        const counts = await Entitlement.aggregate([
            { $match: { endsAt: { $gt: now } } },
            { $group: { _id: '$feature', count: { $sum: 1 } } },
        ]);
        const byFeature = Object.fromEntries(ALL_FEATURES.map((f) => [f, 0]));
        counts.forEach((c) => {
            byFeature[c._id] = c.count;
        });
        const activeMembers = (await Entitlement.distinct('userId', { endsAt: { $gt: now } })).length;
        res.json({ byFeature, activeMembers, totalUsers: await User.estimatedDocumentCount() });
    } catch (err) {
        fail(res, err);
    }
});

/** Manually give a member access (support fixes, gifts). */
router.post('/admin/members/:userId/entitlements', adminAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ message: 'Invalid user id' });
        const user = await User.findById(userId).select('_id');
        if (!user) return res.status(404).json({ message: 'User not found' });

        const features = Array.isArray(req.body.features) ? req.body.features : [req.body.feature];
        if (!features.length || !features.every(isFeature)) {
            return res.status(400).json({ message: 'Unknown feature' });
        }
        const days = Number(req.body.days);
        if (!Number.isInteger(days) || days < 1 || days > 3650) {
            return res.status(400).json({ message: 'days must be between 1 and 3650' });
        }

        const rows = await grantFeatures({ userId, features, days, source: 'admin', productKey: 'admin-grant' });
        res.json({ entitlements: entitlementsPayload(rows) });
    } catch (err) {
        fail(res, err);
    }
});

router.delete('/admin/members/:userId/entitlements/:feature', adminAuth, async (req, res) => {
    try {
        const { userId, feature } = req.params;
        if (!mongoose.Types.ObjectId.isValid(userId) || !isFeature(feature)) {
            return res.status(400).json({ message: 'Invalid request' });
        }
        await revokeFeature(userId, feature);
        res.json({ success: true });
    } catch (err) {
        fail(res, err);
    }
});

module.exports = router;
