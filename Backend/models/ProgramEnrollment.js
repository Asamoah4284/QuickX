const mongoose = require('mongoose');

const programEnrollmentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    programId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Program',
        required: true,
        index: true
    },
    status: {
        type: String,
        enum: ['active', 'expired', 'cancelled'],
        default: 'active'
    },
    startsAt: {
        type: Date,
        default: Date.now
    },
    endsAt: {
        type: Date,
        default: null
    },
    /** Idempotent completion of payment (same transaction must not double-enroll) */
    transactionId: {
        type: String,
        required: true,
        unique: true
    },
    paymentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Payment'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

programEnrollmentSchema.index({ userId: 1, programId: 1 });

module.exports = mongoose.model('ProgramEnrollment', programEnrollmentSchema);
