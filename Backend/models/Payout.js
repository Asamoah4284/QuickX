const mongoose = require('mongoose');

const payoutSchema = new mongoose.Schema({
    tutorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'paid', 'rejected'],
        default: 'pending'
    },
    requestedAt: {
        type: Date,
        default: Date.now
    },
    paidAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Payout', payoutSchema);
