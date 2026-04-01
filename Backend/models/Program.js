const mongoose = require('mongoose');

const programSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    /** Aligns with Course.courseType — unlocks user-authored courses in this track */
    courseType: {
        type: String,
        enum: ['forex', 'crypto', 'webdev'],
        required: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    currency: {
        type: String,
        default: 'GHS'
    },
    billingPeriod: {
        type: String,
        enum: ['one_time', 'subscription'],
        default: 'one_time'
    },
    /** Paystack plan code or external id for subscriptions (optional) */
    externalPlanId: String,
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

programSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Program', programSchema);
