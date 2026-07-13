const mongoose = require('mongoose');

const communityResourceSchema = new mongoose.Schema(
  {
    tutorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: { type: String, trim: true, required: true },
    description: { type: String, trim: true, default: '' },
    fileUrl: { type: String, trim: true, required: true },
    fileType: { type: String, trim: true, default: 'pdf' },
    kind: {
      type: String,
      enum: ['pdf', 'slides', 'worksheet', 'template', 'assignment', 'reading', 'other'],
      default: 'other',
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      default: null,
    },
    /** If set, this is a student assignment submission for a tutor resource */
    assignmentOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CommunityResource',
      default: null,
    },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

communityResourceSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('CommunityResource', communityResourceSchema);
