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
    }
}, {
    timestamps: true
});

const Book = mongoose.model('Book', bookSchema);
module.exports = Book;