const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true
    },
    discount: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },
    validUntil: {
        type: Date,
        required: true
    },
    maxUses: {
        type: Number,
        required: true,
        min: 1
    },
    uses: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Add index for faster queries
couponSchema.index({ code: 1 });
couponSchema.index({ validUntil: 1 });
couponSchema.index({ isActive: 1 });

module.exports = mongoose.model('Coupon', couponSchema); 