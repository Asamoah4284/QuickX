const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        required: true,
        enum: ['GHS', 'USD', 'BTC', 'USDT', 'ETH']
    },
    type: {
        type: String,
        required: true,
        enum: ['momo', 'crypto']
    },
    status: {
        type: String,
        required: true,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending'
    },
    paymentMethod: {
        type: String,
        required: true,
        enum: ['MTN', 'Vodafone', 'AirtelTigo', 'BTC', 'USDT', 'ETH']
    },
    transactionId: String,
    itemType: {
        type: String,
        required: true,
        enum: ['course', 'book']
    },
    itemId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'itemType'
    },
    momoNumber: String,
    cryptoAddress: String,
    shippingAddress: {
        fullName: String,
        address: String,
        city: String,
        region: String,
        phone: String
    }
}, {
    timestamps: true
});

const Payment = mongoose.model('Payment', paymentSchema);
module.exports = Payment;