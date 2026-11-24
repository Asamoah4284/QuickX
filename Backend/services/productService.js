const mongoose = require('mongoose');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const Payment = require('../models/Payment');

function round2(n) {
    return Math.round(Number(n) * 100) / 100;
}

/** Amount to charge after a percentage coupon. (Pure, unit tested.) */
function priceAfterDiscount(listPrice, discountPercent) {
    const pct = Math.min(100, Math.max(0, Number(discountPercent) || 0));
    return round2(Number(listPrice) * (1 - pct / 100));
}

async function findProduct(keyOrId, { includeInactive = false } = {}) {
    const raw = String(keyOrId || '').trim();
    if (!raw) return null;
    const query = mongoose.Types.ObjectId.isValid(raw) ? { _id: raw } : { key: raw.toLowerCase() };
    if (!includeInactive) {
        query.isActive = true;
        query.archived = { $ne: true };
    }
    return Product.findOne(query);
}

async function findUsableCoupon(code) {
    const normalized = String(code || '').trim().toUpperCase();
    if (!normalized) return null;
    const coupon = await Coupon.findOne({ code: normalized, isActive: true });
    if (!coupon) return null;
    if (new Date(coupon.validUntil) < new Date()) return null;
    if (coupon.uses >= coupon.maxUses) return null;
    return coupon;
}

/** The price the server will charge for a product. The client never decides this. */
async function quoteProduct(keyOrId, couponCode) {
    const product = await findProduct(keyOrId);
    if (!product) {
        const err = new Error('Product not found');
        err.status = 404;
        throw err;
    }
    let coupon = null;
    if (couponCode) {
        coupon = await findUsableCoupon(couponCode);
        if (!coupon) {
            const err = new Error('This coupon is invalid or has expired');
            err.status = 400;
            throw err;
        }
    }
    const listPrice = round2(product.price);
    const discountPercent = coupon ? Number(coupon.discount) : 0;
    return {
        product,
        listPrice,
        discountPercent,
        amount: priceAfterDiscount(listPrice, discountPercent),
        couponCode: coupon ? coupon.code : '',
    };
}

/** Count a coupon use exactly once per payment. */
async function consumeCouponForPayment(payment) {
    if (!payment?.couponCode) return;
    const claimed = await Payment.updateOne(
        { _id: payment._id, couponApplied: { $ne: true } },
        { $set: { couponApplied: true } }
    );
    if (!claimed.modifiedCount) return;
    const coupon = await Coupon.findOneAndUpdate(
        { code: payment.couponCode },
        { $inc: { uses: 1 } },
        { new: true }
    );
    if (coupon && coupon.uses >= coupon.maxUses && coupon.isActive) {
        coupon.isActive = false;
        await coupon.save();
    }
}

function serializeProduct(p) {
    return {
        id: String(p._id),
        key: p.key,
        name: p.name,
        tagline: p.tagline,
        highlights: p.highlights || [],
        price: p.price,
        currency: p.currency || 'GHS',
        durationDays: p.durationDays,
        grants: p.grants,
        badge: p.badge || '',
        isActive: p.isActive,
        order: p.order,
        group: Product.planGroup(p.grants),
    };
}

/** Sort order for plan lists: the admin's order, then shortest length first. */
const PLAN_SORT = { order: 1, durationDays: 1, price: 1 };

module.exports = {
    PLAN_SORT,
    round2,
    priceAfterDiscount,
    findProduct,
    quoteProduct,
    consumeCouponForPayment,
    serializeProduct,
};
