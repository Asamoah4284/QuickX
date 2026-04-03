const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true,
        index: true
    },
    progressPercent: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    completedLessonIds: [{
        type: String
    }],
    enrolledAt: {
        type: Date,
        default: Date.now
    },
    completedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

enrollmentSchema.index({ studentId: 1, courseId: 1 }, { unique: true });

module.exports = mongoose.model('Enrollment', enrollmentSchema);
