const mongoose = require('mongoose');

const tutorSubscriptionSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tutorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    planId: {
      type: String,
      enum: ['1m', '2m', '3m', '1y'],
      required: true,
    },
    startsAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endsAt: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled'],
      default: 'active',
      index: true,
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      default: null,
    },
    transactionId: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
);

tutorSubscriptionSchema.index({ studentId: 1, tutorId: 1 });
tutorSubscriptionSchema.index({ transactionId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('TutorSubscription', tutorSubscriptionSchema);
