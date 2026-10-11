const mongoose = require('mongoose');

const tradeUpdateSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },
    notes: {
        type: String,
        default: '',
        trim: true,
    },
    entryPrice: {
        type: String,
        default: '',
    },
    stopLoss: {
        type: String,
        default: '',
    },
    takeProfit: {
        type: String,
        default: '',
    },
    imageUrl: {
        type: String,
        default: '',
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const tradingPieSchema = new mongoose.Schema({
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    tutorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true,
        default: null,
    },
    title: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        default: '',
        trim: true,
    },
    market: {
        type: String,
        enum: ['crypto', 'forex', 'commodities', 'stocks', 'indices'],
        default: 'crypto',
    },
    pair: {
        type: String,
        required: true,
        trim: true,
    },
    targetAmount: {
        type: Number,
        required: true,
        min: 1,
    },
    raisedAmount: {
        type: Number,
        default: 0,
        min: 0,
    },
    minDeposit: {
        type: Number,
        default: 10,
        min: 1,
    },
    maxDeposit: {
        type: Number,
        default: 5000,
        min: 1,
    },
    targetRoiPercent: {
        type: Number,
        default: 20, // e.g. expected 20% profit
    },
    maxLossPercent: {
        type: Number,
        default: 10, // stop-loss threshold 10%
    },
    ownerFeePercent: {
        type: Number,
        default: 15, // 15% performance fee on net profits if winning
    },
    riskLevel: {
        type: String,
        enum: ['Low', 'Moderate', 'High', 'Aggressive'],
        default: 'Moderate',
    },
    status: {
        type: String,
        enum: ['funding', 'trading', 'settled', 'cancelled'],
        default: 'funding',
        index: true,
    },
    fundingDeadline: {
        type: Date,
        default: null,
    },
    tradingStartedAt: {
        type: Date,
        default: null,
    },
    settledAt: {
        type: Date,
        default: null,
    },
    outcome: {
        type: String,
        enum: ['win', 'loss', 'even', null],
        default: null,
    },
    finalPnlPercent: {
        type: Number,
        default: null, // positive for win, negative for loss
    },
    grossPnlAmount: {
        type: Number,
        default: 0,
    },
    ownerFeeEarned: {
        type: Number,
        default: 0,
    },
    totalDistributedAmount: {
        type: Number,
        default: 0,
    },
    settlementProof: {
        type: String,
        default: '',
    },
    settlementNotes: {
        type: String,
        default: '',
    },
    tradeUpdates: [tradeUpdateSchema],
    participantCount: {
        type: Number,
        default: 0,
    },
}, {
    timestamps: true,
});

module.exports = mongoose.model('TradingPie', tradingPieSchema);
