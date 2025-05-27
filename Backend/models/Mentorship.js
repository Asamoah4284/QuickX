const mongoose = require('mongoose');

const mentorshipSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  summary: {
    type: String,
    required: true
  },
  date: {
    type: String,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  isPremium: {
    type: Boolean,
    default: false
  },
  mentor: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    default: 'trading'
  },
  imageUrl: {
    type: String,
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Mentorship', mentorshipSchema); 