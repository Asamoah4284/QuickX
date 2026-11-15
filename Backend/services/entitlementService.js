const Entitlement = require('../models/Entitlement');
const { ALL_FEATURES, isFeature, LEGACY_PLAN_FEATURES } = require('../constants/features');
const { isOwner } = require('./ownerService');

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_REFS = 50;

/**
 * New expiry when `days` are bought: time is added on top of whatever is left,
 * or starts now if the entitlement has lapsed. (Pure — unit tested.)
 */
function extendedEndsAt(currentEndsAt, days, now = new Date()) {
    const current = currentEndsAt ? new Date(currentEndsAt) : null;
    const base = current && current > now ? current : now;
    return new Date(base.getTime() + Number(days) * DAY_MS);
}

/**
 * Decide what a grant does to an existing entitlement row. (Pure — unit tested.)
 * `until` sets an absolute expiry and never shortens; `days` extends.
 */
function planGrant(existing, { days, until, ref, now = new Date() }) {
    if (ref && existing?.appliedRefs?.includes(ref)) {
        return { apply: false, endsAt: existing.endsAt };
    }
    let endsAt;
    if (until) {
        const target = new Date(until);
        const current = existing?.endsAt ? new Date(existing.endsAt) : null;
        endsAt = current && current > target ? current : target;
    } else {
        endsAt = extendedEndsAt(existing?.endsAt, days, now);
    }
    return { apply: true, endsAt };
}

async function grantOne({ userId, feature, days, until, ref, productKey, source, paymentId }) {
    const now = new Date();
    for (let attempt = 0; attempt < 2; attempt += 1) {
        const existing = await Entitlement.findOne({ userId, feature });
        const plan = planGrant(existing, { days, until, ref, now });
        if (!plan.apply) return existing;

        if (existing) {
            const lapsed = !existing.endsAt || existing.endsAt <= now;
            existing.endsAt = plan.endsAt;
            if (lapsed) existing.startsAt = now;
            if (productKey) existing.productKey = productKey;
            if (source) existing.source = source;
            if (paymentId) existing.lastPaymentId = paymentId;
            if (ref) existing.appliedRefs = [...existing.appliedRefs, ref].slice(-MAX_REFS);
            return existing.save();
        }

        try {
            return await Entitlement.create({
                userId,
                feature,
                startsAt: now,
                endsAt: plan.endsAt,
                productKey: productKey || '',
                source: source || 'purchase',
                lastPaymentId: paymentId || null,
                appliedRefs: ref ? [ref] : [],
            });
        } catch (err) {
            // Two requests created the row at once — retry as an update.
            if (err?.code !== 11000) throw err;
        }
    }
    return Entitlement.findOne({ userId, feature });
}

/** Grant several features. Pass `days` to extend, or `until` for an absolute expiry. */
async function grantFeatures({ userId, features, days, until, ref, productKey, source, paymentId }) {
    if (!userId) throw new Error('userId is required');
    const list = [...new Set(features || [])].filter(isFeature);
    if (!list.length) throw new Error('No valid features to grant');
    if (!until && !(Number(days) > 0)) throw new Error('days must be a positive number');

    const rows = [];
    for (const feature of list) {
        rows.push(await grantOne({ userId, feature, days, until, ref, productKey, source, paymentId }));
    }
    return rows;
}

/** Called once a product payment is confirmed. Idempotent on the payment's transaction id. */
async function grantFromProductPayment(payment) {
    const Product = require('../models/Product');
    const product = await Product.findById(payment.itemId);
    if (!product) throw new Error('Product not found for payment');
    return grantFeatures({
        userId: payment.userId,
        features: product.grants,
        days: product.durationDays,
        ref: payment.transactionId,
        productKey: product.key,
        source: 'purchase',
        paymentId: payment._id,
    });
}

/** Old Basic / Premium / Diamond purchase → the features that tier included. */
async function grantFromLegacyPlan({ userId, planId, days, until, ref, paymentId }) {
    const features = LEGACY_PLAN_FEATURES[planId];
    if (!features) throw new Error(`Unknown legacy plan: ${planId}`);
    return grantFeatures({
        userId,
        features,
        days,
        until,
        ref,
        productKey: `legacy-${planId}`,
        source: until ? 'migration' : 'purchase',
        paymentId,
    });
}

async function getActiveEntitlements(userId) {
    if (!userId) return [];
    return Entitlement.find({ userId, endsAt: { $gt: new Date() } })
        .select('feature startsAt endsAt productKey')
        .lean();
}

/** Feature names the user can use right now. The owner has everything. */
async function getUserFeatures(userId) {
    if (!userId) return [];
    if (await isOwner(userId)) return [...ALL_FEATURES];
    const rows = await getActiveEntitlements(userId);
    return rows.map((r) => r.feature);
}

async function hasFeature(userId, feature) {
    if (!userId || !isFeature(feature)) return false;
    if (await isOwner(userId)) return true;
    const row = await Entitlement.exists({ userId, feature, endsAt: { $gt: new Date() } });
    return Boolean(row);
}

/** User ids that currently hold a feature (for notifications and member lists). */
async function listUserIdsWithFeature(feature) {
    return Entitlement.distinct('userId', { feature, endsAt: { $gt: new Date() } });
}

async function revokeFeature(userId, feature) {
    return Entitlement.updateOne({ userId, feature }, { $set: { endsAt: new Date() } });
}

/**
 * Carry subscribers from the old tier system over to entitlements with the same
 * expiry date. Safe to run repeatedly.
 */
async function migrateLegacySubscriptions({ dryRun = false, log = () => {} } = {}) {
    const TutorSubscription = require('../models/TutorSubscription');
    const { normalizePlanId } = require('../constants/creatorSubscriptionPlans');

    const subs = await TutorSubscription.find({ status: 'active', endsAt: { $gt: new Date() } }).lean();
    let migrated = 0;
    let skipped = 0;

    for (const sub of subs) {
        const planId = normalizePlanId(sub.planId);
        const features = LEGACY_PLAN_FEATURES[planId];
        if (!features) {
            skipped += 1;
            log(`skip   | sub ${sub._id} | unknown plan "${sub.planId}"`);
            continue;
        }
        const ref = `legacy-sub:${sub._id}`;
        const already = await Entitlement.exists({ userId: sub.studentId, appliedRefs: ref });
        if (already) continue;

        migrated += 1;
        log(`grant  | user ${sub.studentId} | ${planId} -> ${features.join(', ')} | until ${sub.endsAt.toISOString()}`);
        if (!dryRun) {
            await grantFromLegacyPlan({
                userId: sub.studentId,
                planId,
                until: sub.endsAt,
                ref,
                paymentId: sub.paymentId,
            });
        }
    }

    return { active: subs.length, migrated, skipped };
}

module.exports = {
    extendedEndsAt,
    planGrant,
    grantFeatures,
    grantFromProductPayment,
    grantFromLegacyPlan,
    getActiveEntitlements,
    getUserFeatures,
    hasFeature,
    listUserIdsWithFeature,
    revokeFeature,
    migrateLegacySubscriptions,
};
