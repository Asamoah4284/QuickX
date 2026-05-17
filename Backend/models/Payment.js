const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    /** Set for purchases completed without a logged-in account. */
    guestEmail: {
        type: String,
        default: ''
    },
    itemType: {
        type: String,
        required: true,
        enum: ['course', 'book', 'book_cart', 'book_offer', 'program', 'creator_subscription']
    },
    /** Set when itemType is creator_subscription (plan id: 1m, 2m, 3m, 1y). */
    subscriptionPlanId: {
        type: String,
        default: '',
    },
    itemId: {
        type: mongoose.Schema.Types.ObjectId,
        required: function () {
            return !['book_cart', 'book_offer'].includes(this.itemType);
        },
        default: null
    },
    /** For book_offer purchases — subdocument id on BookOfferGroup.options. */
    offerOptionId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
    },
    /** For book cart / bundle purchases (multiple ebook items). */
    cartItemIds: {
        type: [mongoose.Schema.Types.ObjectId],
        default: []
    },
    originalAmount: {
        type: Number,
        required: true
    },
    finalAmount: {
        type: Number,
        required: true
    },
    commissionAmount: {
        type: Number,
        default: 0
    },
    referringUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    referralCode: {
        type: String,
        default: ''
    },
    transactionId: {
        type: String,
        required: true
    },
    paymentMethod: {
        type: String,
        required: true
    },
    momoNumber: String,
    shippingAddress: {
        fullName: String,
        phone: String,
        email: String
    },
    status: {
        type: String,
        required: true,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Payment = mongoose.model('Payment', paymentSchema);
module.exports = Payment;