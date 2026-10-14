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
    creatorAutoApproval: {
        type: Boolean,
        default: false
    },
    defaultCurrency: {
        type: String,
        enum: ['USD', 'GHS'],
        default: 'USD'
    },
    exchangeRateUsdToGhs: {
        type: Number,
        default: 15.5,
        min: 0.1
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('PlatformSetting', platformSettingSchema);
