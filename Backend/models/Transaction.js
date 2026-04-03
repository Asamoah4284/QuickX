const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    tutorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    platformCommission: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    tutorEarning: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded'],
        default: 'completed'
    },
    paymentReference: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Transaction', transactionSchema);
