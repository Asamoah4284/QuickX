const mongoose = require('mongoose');

const liveSessionSchema = new mongoose.Schema(
  {
    tutorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: { type: String, trim: true, required: true },
    description: { type: String, trim: true, default: '' },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, default: null },
    joinUrl: { type: String, trim: true, required: true },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      default: null,
    },
    reminderSentAt: { type: Date, default: null },
    cancelled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

liveSessionSchema.index({ tutorId: 1, startsAt: 1 });

module.exports = mongoose.model('LiveSession', liveSessionSchema);
