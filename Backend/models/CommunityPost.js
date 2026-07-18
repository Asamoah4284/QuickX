const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema(
  {
    url: { type: String, trim: true, required: true },
    type: {
      type: String,
      enum: ['image', 'video', 'document', 'link'],
      default: 'image',
    },
    name: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const communityPostSchema = new mongoose.Schema(
  {
    tutorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['post', 'announcement'],
      default: 'post',
      index: true,
    },
    body: { type: String, trim: true, default: '' },
    media: [mediaSchema],
    mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DiscussionRoom',
      default: null,
      index: true,
    },
    pollId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CommunityPoll',
      default: null,
    },
    pinned: { type: Boolean, default: false },
    featured: { type: Boolean, default: false },
    likeCount: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

communityPostSchema.index({ tutorId: 1, createdAt: -1 });
communityPostSchema.index({ tutorId: 1, type: 1, pinned: -1 });
communityPostSchema.index({ body: 'text' });

module.exports = mongoose.model('CommunityPost', communityPostSchema);
