const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema(
  {
    url: { type: String, trim: true, required: true },
    type: { type: String, trim: true, default: 'file' },
    name: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const communityQuestionSchema = new mongoose.Schema(
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
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      default: null,
    },
    topic: { type: String, trim: true, default: '' },
    title: { type: String, trim: true, required: true },
    body: { type: String, trim: true, required: true },
    attachments: [attachmentSchema],
    status: {
      type: String,
      enum: ['open', 'answered'],
      default: 'open',
      index: true,
    },
    pinned: { type: Boolean, default: false },
    bestAnswerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CommunityAnswer',
      default: null,
    },
    answerCount: { type: Number, default: 0 },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

communityQuestionSchema.index({ tutorId: 1, createdAt: -1 });
communityQuestionSchema.index({ title: 'text', body: 'text', topic: 'text' });

module.exports = mongoose.model('CommunityQuestion', communityQuestionSchema);
