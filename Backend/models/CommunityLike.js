const mongoose = require('mongoose');

const communityLikeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CommunityPost',
      default: null,
    },
    commentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CommunityComment',
      default: null,
    },
  },
  { timestamps: true }
);

communityLikeSchema.index(
  { userId: 1, postId: 1 },
  { unique: true, partialFilterExpression: { postId: { $type: 'objectId' } } }
);
communityLikeSchema.index(
  { userId: 1, commentId: 1 },
  { unique: true, partialFilterExpression: { commentId: { $type: 'objectId' } } }
);

module.exports = mongoose.model('CommunityLike', communityLikeSchema);
