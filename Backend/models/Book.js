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
        // Required only for ebooks
        required: function() {
            return this.type === 'ebook';
        }
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
    }
}, {
    timestamps: true
});

const Book = mongoose.model('Book', bookSchema);
module.exports = Book;