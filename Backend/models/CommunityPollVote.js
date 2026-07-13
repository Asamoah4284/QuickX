const mongoose = require('mongoose');

const communityPollVoteSchema = new mongoose.Schema(
  {
    pollId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CommunityPoll',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    optionIndex: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

communityPollVoteSchema.index({ pollId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('CommunityPollVote', communityPollVoteSchema);
