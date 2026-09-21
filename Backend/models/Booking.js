const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    userId: {
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
    tutorName: { type: String, default: '' },
    serviceId: { type: String, default: '' },
    serviceName: { type: String, default: '' },
    date: { type: String, required: true },
    time: { type: String, required: true },
    durationMins: { type: Number, default: 60 },
    price: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['upcoming', 'cancelled', 'completed'],
      default: 'upcoming',
    },
    walletTransactionRef: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Booking', bookingSchema);
