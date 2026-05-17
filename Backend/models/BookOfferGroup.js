const mongoose = require('mongoose');

/** Inline copy of each book in this plan — title + PDF URL for easy reads in Compass. */
const planBookSchema = new mongoose.Schema(
    {
        bookId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Book',
            required: true,
        },
        title: { type: String, trim: true, default: '' },
        fileUrl: { type: String, trim: true, default: '' },
    },
    { _id: false }
);

const offerOptionSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: ['single', 'bundle'],
            required: true,
        },
        bookIds: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Book',
        }],
        planBooks: [planBookSchema],
        label: { type: String, trim: true, default: '' },
        headline: { type: String, trim: true, default: '' },
        cardTitle: { type: String, trim: true, default: '' },
        thumbnail: { type: String, trim: true, default: '' },
        price: { type: Number, required: true, min: 0 },
        compareAtPrice: { type: Number, min: 0, default: null },
        badge: { type: String, trim: true, default: '' },
        footnote: { type: String, trim: true, default: '' },
        features: [{ type: String, trim: true }],
        highlighted: { type: Boolean, default: false },
        sortOrder: { type: Number, default: 0 },
    },
    { timestamps: false }
);

const bookOfferGroupSchema = new mongoose.Schema(
    {
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        heading: {
            type: String,
            trim: true,
            default: 'PICK YOUR PLAN & START TODAY',
        },
        subheading: {
            type: String,
            trim: true,
            default: '',
        },
        options: [offerOptionSchema],
        /** Main listing book — only this one appears on the marketplace. */
        storefrontBookId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Book',
            default: null,
        },
        listingStatus: {
            type: String,
            enum: ['draft', 'published'],
            default: 'draft',
        },
    },
    { timestamps: true }
);

bookOfferGroupSchema.index({ createdBy: 1 });

const BookOfferGroup = mongoose.model('BookOfferGroup', bookOfferGroupSchema);
module.exports = BookOfferGroup;
