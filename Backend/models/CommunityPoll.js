const mongoose = require('mongoose');

const communityPollSchema = new mongoose.Schema(
  {
    tutorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    question: { type: String, trim: true, required: true },
    options: [
      {
        text: { type: String, trim: true, required: true },
        voteCount: { type: Number, default: 0 },
      },
    ],
    closed: { type: Boolean, default: false },
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CommunityPost',
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CommunityPoll', communityPollSchema);
