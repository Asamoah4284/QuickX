const mongoose = require('mongoose');

const speakerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    title: { type: String, default: '' },
    bio: { type: String, default: '' },
    avatar: { type: String, default: '' }
}, { _id: true });

const eventSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Event title is required'],
        trim: true,
        maxlength: 200
    },
    description: {
        type: String,
        required: [true, 'Event description is required']
    },
    shortDescription: {
        type: String,
        trim: true,
        maxlength: 300
    },
    category: {
        type: String,
        required: true,
        enum: ['Masterclass', 'Workshop', 'Webinar', 'Meetup', 'Conference', 'Trading', 'Tech', 'General'],
        default: 'General'
    },
    eventType: {
        type: String,
        enum: ['online', 'in-person', 'hybrid'],
        default: 'online'
    },
    venue: {
        type: String,
        default: 'Virtual (Zoom / Google Meet)'
    },
    location: {
        type: String,
        default: ''
    },
    meetingLink: {
        type: String,
        default: ''
    },
    startDate: {
        type: Date,
        required: [true, 'Event start date is required']
    },
    endDate: {
        type: Date
    },
    time: {
        type: String,
        required: [true, 'Event time is required'],
        default: '2:00 PM GMT'
    },
    coverImage: {
        type: String,
        default: ''
    },
    organizer: {
        name: { type: String, default: 'QuickX Learning' },
        email: { type: String, default: 'events@quickxlearn.com' },
        phone: { type: String, default: '' },
        avatar: { type: String, default: '' }
    },
    isFree: {
        type: Boolean,
        default: false
    },
    price: {
        type: Number,
        default: 0,
        min: 0
    },
    currency: {
        type: String,
        default: 'GHS'
    },
    capacity: {
        type: Number,
        default: 150,
        min: 0
    },
    ticketsSold: {
        type: Number,
        default: 0,
        min: 0
    },
    status: {
        type: String,
        enum: ['draft', 'published', 'cancelled', 'completed'],
        default: 'published'
    },
    tags: [{
        type: String,
        trim: true
    }],
    speakers: [speakerSchema],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    adminCreatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        default: null
    }
}, {
    timestamps: true
});

// Virtual for remaining spots
eventSchema.virtual('spotsRemaining').get(function() {
    if (!this.capacity || this.capacity <= 0) return 999999;
    return Math.max(0, this.capacity - (this.ticketsSold || 0));
});

eventSchema.set('toJSON', { virtuals: true });
eventSchema.set('toObject', { virtuals: true });

const Event = mongoose.model('Event', eventSchema);
module.exports = Event;
