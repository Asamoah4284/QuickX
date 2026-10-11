const mongoose = require('mongoose');

const tradingPieDepositSchema = new mongoose.Schema({
    pieId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TradingPie',
        required: true,
        index: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    amount: {
        type: Number,
        required: true,
        min: 1,
    },
    slicePercentage: {
        type: Number,
        default: 0,
    },
    status: {
        type: String,
        enum: ['active', 'settled', 'refunded'],
        default: 'active',
        index: true,
    },
    payoutAmount: {
        type: Number,
        default: 0,
    },
    pnlAmount: {
        type: Number,
        default: 0,
    },
    settlementTransactionRef: {
        type: String,
        default: '',
    },
}, {
    timestamps: true,
});

module.exports = mongoose.model('TradingPieDeposit', tradingPieDepositSchema);
