const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    author: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    whatYoullLearn: [{
        type: String,
        trim: true
    }],
    afterReadingOutcomes: [{
        type: String,
        trim: true
    }],
    testimonials: [{
        tagline: { type: String, trim: true, default: '' },
        quote: { type: String, trim: true, required: true },
        name: { type: String, trim: true, default: '' },
        role: { type: String, trim: true, default: '' },
    }],
    type: {
        type: String,
        enum: ['ebook', 'hardcopy'],
        required: true
    },
    category: {
        type: String,
        enum: ['forex', 'crypto', 'general'],
        default: 'general'
    },
    price: {
        type: Number,
        required: true
    },
    fileUrl: {
        type: String,
        // Ebook PDF required except instructor drafts (PDFs live on plan rows)
        required: function() {
            if (this.type !== 'ebook') return false;
            if (this.source === 'instructor' && this.listingStatus === 'draft') {
                return false;
            }
            return true;
        },
    },
    stock: {
        type: Number,
        // Required only for hardcopy books
        required: function() {
            return this.type === 'hardcopy';
        },
        default: function() {
            return this.type === 'ebook' ? null : 0;
        }
    },
    thumbnail: String,
    isbn: String,
    deliveryFee: {
        type: Number,
        default: function() {
            return this.type === 'hardcopy' ? 0 : null;
        }
    },
    watermarkTemplate: String,
    published: {
        type: Date,
        default: Date.now
    },
    // Instructor workflow fields
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    source: {
        type: String,
        enum: ['admin', 'instructor'],
        default: 'admin'
    },
    listingStatus: {
        type: String,
        enum: ['draft', 'pending_review', 'published', 'rejected'],
        default: 'draft'
    },
    rejectionReason: {
        type: String,
        default: ''
    },
    /** Shared purchase plans (singles + bundles) shown on the store page. */
    offerGroupId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BookOfferGroup',
        default: null,
    },
    /** PDF-only row for a plan (Book 2, etc.) — hidden from marketplace grid. */
    isPlanDeliverable: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true
});

/** Legacy value stored on some books — normalize before enum validation. */
bookSchema.pre('validate', function normalizeListingStatus(next) {
    if (this.listingStatus === 'approved') {
        this.listingStatus = 'published';
    }
    next();
});

const Book = mongoose.model('Book', bookSchema);
module.exports = Book;