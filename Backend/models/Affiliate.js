const mongoose = require('mongoose');

const affiliateSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    referralCode: {
        type: String,
        required: true,
        unique: true
    },
    referredUsers: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        status: {
            type: String,
            enum: ['pending', 'completed'],
            default: 'pending'
        },
        commission: {
            type: Number,
            default: 0
        },
        purchaseAmount: {
            type: Number,
            default: 0
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    totalEarnings: {
        type: Number,
        default: 0
    },
    availableBalance: {
        type: Number,
        default: 0
    },
    tier: {
        type: String,
        enum: ['bronze', 'silver', 'gold', 'platinum'],
        default: 'bronze'
    },
    paymentDetails: {
        momoNumber: String,
        momoProvider: {
            type: String,
            enum: ['MTN', 'Vodafone', 'AirtelTigo']
        },
        cryptoAddress: String,
        cryptoType: {
            type: String,
            enum: ['BTC', 'USDT', 'ETH']
        }
    }
}, {
    timestamps: true
});

const Affiliate = mongoose.model('Affiliate', affiliateSchema);
module.exports = Affiliate;