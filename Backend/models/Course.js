const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['video', 'text', 'pdf', 'resource', 'quiz', 'assignment', 'ebook', 'workshop'],
        required: true
    },
    lessonType: {
        type: String,
        enum: ['video', 'text', 'pdf', 'resource', 'quiz', 'assignment', 'ebook', 'workshop'],
        default: function() {
            return this.type;
        }
    },
    duration: {
        type: String,
        default: ''
    },
    videoUrl: String,
    videoKey: String,
    videoPublicId: String,
    filePath: String,
    pdfUrl: String,
    textContent: String,
    resourceUrl: String,
    resources: [{
        title: { type: String, default: '' },
        url: { type: String, default: '' },
        type: { type: String, default: 'link' },
        thumbnail: { type: String, default: '' }
    }],
    description: String,
    free: {
        type: Boolean,
        default: false
    },
    isPreview: {
        type: Boolean,
        default: false
    },
    isLocked: {
        type: Boolean,
        default: true
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

const additionalMaterialSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['file', 'worksheet', 'link', 'reference'],
        default: 'file'
    },
    url: {
        type: String,
        default: ''
    },
    thumbnail: {
        type: String,
        default: ''
    }
}, { _id: true });

const reviewMetadataSchema = new mongoose.Schema({
    submittedAt: Date,
    reviewedAt: Date,
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        default: null
    },
    notes: {
        type: String,
        default: ''
    }
}, { _id: false });

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
    subtitle: {
        type: String,
        default: ''
    },
    subcategory: {
        type: String,
        default: ''
    },
    language: {
        type: String,
        default: 'English'
    },
    thumbnail: String,
    promoVideo: {
        type: String,
        default: ''
    },
    courseType: {
        type: String,
        enum: ['forex', 'crypto', 'webdev'],
        required: true
    },
    /** Marketplace category label (optional; filters) */
    category: {
        type: String,
        trim: true,
        default: ''
    },
    /** User who authored the course (user-generated); admin-created may omit */
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    /** Origin of the listing */
    source: {
        type: String,
        enum: ['admin', 'user'],
        default: 'admin'
    },
    /** Review workflow for user-authored courses */
    listingStatus: {
        type: String,
        enum: ['draft', 'pending_review', 'under_review', 'published', 'rejected', 'archived'],
        default: 'published'
    },
    rejectionReason: {
        type: String,
        default: ''
    },
    learningOutcomes: [{
        type: String
    }],
    requirements: [{
        type: String
    }],
    targetAudience: [{
        type: String
    }],
    skillsGained: [{
        type: String
    }],
    pricingType: {
        type: String,
        enum: ['free', 'paid'],
        default: 'paid'
    },
    totalStudents: {
        type: Number,
        default: 0,
        min: 0
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    currency: {
        type: String,
        default: 'GHS'
    },
    discountPrice: {
        type: Number,
        default: null
    },
    certificateEnabled: {
        type: Boolean,
        default: false
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
    additionalMaterials: {
        type: [additionalMaterialSchema],
        default: []
    },
    enrolledStudents: [enrolledStudentSchema],
    isPublished: {
        type: Boolean,
        default: false
    },
    totalLessons: {
        type: Number,
        default: 0
    },
    totalDuration: {
        type: Number,
        default: 0
    },
    totalEnrollments: {
        type: Number,
        default: 0
    },
    averageRating: {
        type: Number,
        default: 0
    },
    totalRevenue: {
        type: Number,
        default: 0
    },
    reviewMetadata: {
        type: reviewMetadataSchema,
        default: () => ({})
    },
    startDate: Date,
    endDate: Date,
    publishedAt: Date,
    archivedAt: Date,
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
    let totalLessons = 0;
    let totalDuration = 0;

    for (const module of this.modules || []) {
        for (const section of module.sections || []) {
            totalLessons += (section.lessons || []).length;
            for (const lesson of section.lessons || []) {
                const parsed = Number(lesson.duration);
                if (!Number.isNaN(parsed) && parsed > 0) {
                    totalDuration += parsed;
                }
            }
        }
    }

    this.totalLessons = totalLessons;
    this.totalDuration = totalDuration;
    this.totalEnrollments = this.totalStudents;
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Course', courseSchema);