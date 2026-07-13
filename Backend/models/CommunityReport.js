const mongoose = require('mongoose');

const communityReportSchema = new mongoose.Schema(
  {
    tutorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    entityType: {
      type: String,
      enum: ['post', 'comment', 'question', 'answer', 'message', 'resource'],
      required: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    reason: { type: String, trim: true, required: true },
    status: {
      type: String,
      enum: ['open', 'resolved', 'dismissed'],
      default: 'open',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CommunityReport', communityReportSchema);
