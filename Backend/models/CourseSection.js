const mongoose = require('mongoose');

const courseSectionSchema = new mongoose.Schema({
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    order: {
        type: Number,
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('CourseSection', courseSectionSchema);
