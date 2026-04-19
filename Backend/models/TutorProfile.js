const mongoose = require('mongoose');

const socialLinksSchema = new mongoose.Schema({
    website: { type: String, default: '' },
    youtube: { type: String, default: '' }
}, { _id: false });

const certificateSchema = new mongoose.Schema({
    title: { type: String, required: true },
    issuer: { type: String, default: '' },
    year: { type: String, default: '' },
    fileUrl: { type: String, default: '' }
}, { _id: false });

const payoutDetailsSchema = new mongoose.Schema({
    accountName: { type: String, default: '' },
    provider: { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    currency: { type: String, default: 'GHS' }
}, { _id: false });

const subscriptionPricingSchema = new mongoose.Schema({
    month1: { type: Number, default: 49, min: 0 },
    month2: { type: Number, default: 89, min: 0 },
    year1: { type: Number, default: 399, min: 0 }
}, { _id: false });

const tutorProfileSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
        index: true
    },
    headline: {
        type: String,
        trim: true,
        default: ''
    },
    bio: {
        type: String,
        trim: true,
        default: ''
    },
    expertise: [{
        type: String,
        trim: true
    }],
    experienceYears: {
        type: Number,
        default: 0,
        min: 0
    },
    languages: [{
        type: String,
        trim: true
    }],
    socialLinks: {
        type: socialLinksSchema,
        default: () => ({})
    },
    certificates: {
        type: [certificateSchema],
        default: []
    },
    verificationStatus: {
        type: String,
        enum: ['unverified', 'pending', 'verified'],
        default: 'unverified'
    },
    applicationStatus: {
        type: String,
        enum: ['draft', 'pending', 'approved', 'rejected', 'suspended'],
        default: 'draft'
    },
    teachingCategories: [{
        type: String,
        trim: true
    }],
    preferredCourseLanguage: {
        type: String,
        default: 'English'
    },
    teachesFreeCourses: {
        type: Boolean,
        default: true
    },
    teachesPaidCourses: {
        type: Boolean,
        default: true
    },
    offersMentorship: {
        type: Boolean,
        default: false
    },
    idDocumentUrl: {
        type: String,
        default: ''
    },
    reviewNotes: {
        type: String,
        default: ''
    },
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        default: null
    },
    reviewedAt: {
        type: Date,
        default: null
    },
    payoutDetails: {
        type: payoutDetailsSchema,
        default: () => ({})
    },
    subscriptionPricing: {
        type: subscriptionPricingSchema,
        default: () => ({})
    },
    avatar: {
        type: String,
        default: ''
    },
    profilePicture: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

tutorProfileSchema.index({ applicationStatus: 1, updatedAt: -1 });

module.exports = mongoose.model('TutorProfile', tutorProfileSchema);
