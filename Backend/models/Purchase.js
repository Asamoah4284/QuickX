const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true
  },
  courseId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Course',
    required: true
  },
  date: { 
    type: Date, 
    default: Date.now 
  },
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['completed', 'pending', 'failed', 'refunded'],
    default: 'completed'
  },
  paymentMethod: {
    type: String,
    default: 'direct'
  },
  transactionId: {
    type: String
  }
});

// Create a compound index to prevent duplicate purchases
purchaseSchema.index({ userId: 1, courseId: 1 }, { unique: true });

module.exports = mongoose.model('Purchase', purchaseSchema); 