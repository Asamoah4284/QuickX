const mongoose = require('mongoose');

const gamificationEventSchema = new mongoose.Schema(
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
    type: {
      type: String,
      enum: [
        'post_created',
        'comment_created',
        'answer_created',
        'best_answer',
        'like_received',
        'daily_streak',
        'resource_upload',
        'poll_vote',
      ],
      required: true,
    },
    xp: { type: Number, default: 0 },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

gamificationEventSchema.index({ tutorId: 1, userId: 1, createdAt: -1 });

module.exports = mongoose.model('GamificationEvent', gamificationEventSchema);
