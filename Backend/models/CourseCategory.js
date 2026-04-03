const mongoose = require('mongoose');

const courseCategorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    subcategories: [{
        name: { type: String, trim: true },
        slug: { type: String, trim: true }
    }],
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('CourseCategory', courseCategorySchema);
