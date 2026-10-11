const mongoose = require('mongoose');

const eventTicketSchema = new mongoose.Schema({
    eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    ticketNumber: {
        type: String,
        required: true,
        unique: true
    },
    attendeeName: {
        type: String,
        required: true
    },
    attendeeEmail: {
        type: String,
        required: true
    },
    attendeePhone: {
        type: String,
        default: ''
    },
    pricePaid: {
        type: Number,
        default: 0
    },
    isFree: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['confirmed', 'cancelled', 'checked_in'],
        default: 'confirmed'
    },
    paymentMethod: {
        type: String,
        default: 'free'
    },
    transactionId: {
        type: String,
        default: ''
    },
    paymentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Payment',
        default: null
    },
    notes: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

// Compound index to prevent duplicate tickets per user per event
eventTicketSchema.index({ eventId: 1, userId: 1 }, { unique: true });

const EventTicket = mongoose.model('EventTicket', eventTicketSchema);
module.exports = EventTicket;
