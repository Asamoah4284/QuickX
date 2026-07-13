const mongoose = require('mongoose');

const discussionRoomSchema = new mongoose.Schema(
  {
    tutorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: { type: String, trim: true, required: true },
    description: { type: String, trim: true, default: '' },
    kind: {
      type: String,
      enum: ['course', 'lesson', 'project', 'general', 'accountability'],
      default: 'general',
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      default: null,
    },
    archived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DiscussionRoom', discussionRoomSchema);
