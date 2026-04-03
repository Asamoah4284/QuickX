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
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('PlatformSetting', platformSettingSchema);
