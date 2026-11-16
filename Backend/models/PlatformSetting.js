const mongoose = require('mongoose');

const platformSettingSchema = new mongoose.Schema({
    commissionRate: {
        type: Number,
        min: 0,
        max: 100,
        default: 15
    },
    courseAutoApproval: {
        type: Boolean,
        default: false
    },
    /** The single mentor's User id (courses, community and bookings belong to this account). */
    ownerUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    creatorAutoApproval: {
        type: Boolean,
        default: false
    },
    defaultCurrency: {
        type: String,
        enum: ['USD', 'GHS'],
        default: 'GHS'
    },
    exchangeRateUsdToGhs: {
        type: Number,
        default: 15.5,
        min: 0.1
    },
    /** The two sample events have been added once. They are never added again after this. */
    sampleEventsSeeded: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('PlatformSetting', platformSettingSchema);
