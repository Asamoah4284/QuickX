const mongoose = require('mongoose');

const communityCommentSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CommunityPost',
      required: true,
      index: true,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CommunityComment',
      default: null,
    },
    body: { type: String, trim: true, required: true },
    mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    likeCount: { type: Number, default: 0 },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

communityCommentSchema.index({ postId: 1, createdAt: 1 });
communityCommentSchema.index({ body: 'text' });

module.exports = mongoose.model('CommunityComment', communityCommentSchema);
