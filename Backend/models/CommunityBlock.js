const mongoose = require('mongoose');

const communityBlockSchema = new mongoose.Schema(
  {
    tutorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reason: { type: String, trim: true, default: '' },
    muted: { type: Boolean, default: false },
    blocked: { type: Boolean, default: true },
  },
  { timestamps: true }
);

communityBlockSchema.index({ tutorId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('CommunityBlock', communityBlockSchema);
