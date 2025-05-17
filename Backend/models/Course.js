const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['video', 'ebook', 'quiz', 'workshop'],
        required: true
    },
    duration: String,
    videoUrl: String,
    videoKey: String,
    videoPublicId: String,
    filePath: String,
    description: String,
    free: {
        type: Boolean,
        default: false
    },
    order: {
        type: Number,
        required: true
    }
});

const sectionSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: String,
    lessons: [lessonSchema],
    order: {
        type: Number,
        required: true
    }
});

const moduleSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: String,
    price: {
        type: Number,
        required: true,
        min: 0
    },
    level: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced'],
        required: true
    },
    sections: [sectionSchema],
    order: {
        type: Number,
        required: true
    },
    unlocked: {
        type: Boolean,
        default: false
    }
});

const enrolledStudentSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    enrolledAt: {
        type: Date,
        default: Date.now
    },
    progress: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    status: {
        type: String,
        enum: ['active', 'completed', 'dropped'],
        default: 'active'
    }
});

const courseSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    shortDescription: String,
    thumbnail: String,
    courseType: {
        type: String,
        enum: ['forex', 'crypto'],
        required: true,
        validate: {
            validator: function(v) {
                return v === 'forex' || v === 'crypto';
            },
            message: props => `${props.value} is not a valid course type. Must be 'forex' or 'crypto'`
        }
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    level: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced'],
        required: true
    },
    tags: [String],
    instructor: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'instructorModel',
        required: true
    },
    instructorModel: {
        type: String,
        enum: ['User', 'Admin'],
        required: true
    },
    modules: [moduleSchema],
    enrolledStudents: [enrolledStudentSchema],
    isPublished: {
        type: Boolean,
        default: false
    },
    startDate: Date,
    endDate: Date,
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt field before saving
courseSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Course', courseSchema);