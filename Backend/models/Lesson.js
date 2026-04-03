const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
    sectionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CourseSection',
        default: null
    },
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    lessonType: {
        type: String,
        enum: ['video', 'text', 'pdf', 'resource', 'quiz', 'assignment'],
        default: 'video'
    },
    videoUrl: {
        type: String,
        default: ''
    },
    textContent: {
        type: String,
        default: ''
    },
    pdfUrl: {
        type: String,
        default: ''
    },
    resources: [{
        title: String,
        url: String,
        type: String
    }],
    duration: {
        type: String,
        default: ''
    },
    isPreview: {
        type: Boolean,
        default: false
    },
    order: {
        type: Number,
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Lesson', lessonSchema);
