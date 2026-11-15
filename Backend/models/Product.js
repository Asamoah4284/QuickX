const mongoose = require('mongoose');
const { ALL_FEATURES, FEATURES } = require('../constants/features');

/** Something a member can buy: one feature, or a bundle of features, for a period of time. */
const productSchema = new mongoose.Schema(
    {
        key: { type: String, required: true, unique: true, lowercase: true, trim: true },
        name: { type: String, required: true, trim: true },
        tagline: { type: String, trim: true, default: '' },
        /** Bullet points shown on the pricing card. */
        highlights: { type: [String], default: [] },
        price: { type: Number, required: true, min: 0 },
        currency: { type: String, default: 'GHS' },
        durationDays: { type: Number, required: true, min: 1 },
        grants: {
            type: [{ type: String, enum: ALL_FEATURES }],
            validate: [(v) => Array.isArray(v) && v.length > 0, 'A product must grant at least one feature'],
        },
        badge: { type: String, trim: true, default: '' },
        isActive: { type: Boolean, default: true },
        order: { type: Number, default: 0 },
    },
    { timestamps: true }
);

/**
 * Starting catalogue. Prices and durations are placeholders — set the real ones
 * in Admin → Pricing. Existing rows are never overwritten by this list.
 */
const DEFAULT_PRODUCTS = [
    {
        key: 'courses',
        name: 'Courses',
        tagline: 'Every video lesson, watch online or offline',
        highlights: ['All course videos', 'Download and watch offline', 'New lessons as they are released'],
        price: 99,
        durationDays: 90,
        grants: [FEATURES.COURSES],
        order: 1,
    },
    {
        key: 'signals',
        name: 'Signals',
        tagline: 'Live trade ideas with entry, stop loss and targets',
        highlights: ['Live signals as they are posted', 'Push notification for every signal', 'Full signal history and results'],
        price: 99,
        durationDays: 30,
        grants: [FEATURES.SIGNALS],
        order: 2,
    },
    {
        key: 'community',
        name: 'Community',
        tagline: 'Trade alongside other members',
        highlights: ['Members feed and discussion rooms', 'Ask questions and get answers', 'Post your trades for feedback'],
        price: 49,
        durationDays: 30,
        grants: [FEATURES.COMMUNITY],
        order: 3,
    },
    {
        key: 'mentorship',
        name: 'Mentorship',
        tagline: '1-on-1 guidance from Maxwell',
        highlights: ['Book 1-on-1 sessions', 'Direct messages', 'Personal trade reviews'],
        price: 499,
        durationDays: 30,
        grants: [FEATURES.MENTORSHIP],
        order: 4,
    },
    {
        key: 'all-access',
        name: 'All-Access',
        tagline: 'Everything in one plan, for less',
        highlights: ['Courses', 'Signals', 'Community', 'Mentorship'],
        price: 599,
        durationDays: 30,
        grants: [...ALL_FEATURES],
        badge: 'Best value',
        order: 0,
    },
];

productSchema.statics.ensureDefaults = async function ensureDefaults() {
    let created = 0;
    for (const p of DEFAULT_PRODUCTS) {
        const res = await this.updateOne({ key: p.key }, { $setOnInsert: p }, { upsert: true });
        if (res.upsertedCount) created += 1;
    }
    return created;
};

module.exports = mongoose.model('Product', productSchema);
module.exports.DEFAULT_PRODUCTS = DEFAULT_PRODUCTS;
