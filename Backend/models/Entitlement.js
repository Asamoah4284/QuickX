const mongoose = require('mongoose');
const { ALL_FEATURES } = require('../constants/features');

/** One row per (user, feature): the user has `feature` until `endsAt`. */
const entitlementSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        feature: { type: String, enum: ALL_FEATURES, required: true },
        startsAt: { type: Date, default: Date.now },
        endsAt: { type: Date, required: true, index: true },
        /** Product that last extended this entitlement. */
        productKey: { type: String, default: '' },
        source: { type: String, enum: ['purchase', 'migration', 'admin'], default: 'purchase' },
        lastPaymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },
        /** References already applied, so replaying a payment never extends twice. */
        appliedRefs: { type: [String], default: [] },
    },
    { timestamps: true }
);

entitlementSchema.index({ userId: 1, feature: 1 }, { unique: true });
entitlementSchema.index({ feature: 1, endsAt: 1 });

module.exports = mongoose.model('Entitlement', entitlementSchema);
