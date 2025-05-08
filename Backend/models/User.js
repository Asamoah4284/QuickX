const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        minlength: 8,
        match: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/, // at least 1 lowercase, 1 uppercase, 1 number, 1 special character
        validate: {
          validator: function (value) {
            return value.length >= 8;
          },
          message: 'Password must be at least 8 characters long.'
      
    },
    fullName: {
        type: String,
        required: true
    },
    profilePicture: {
        type: String,
        default: ''
    },
    purchasedCourses: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course'
    }],
    purchasedBooks: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Book'
    }],
    subscriptionStatus: {
        type: String,
        enum: ['active', 'expired', 'none'],
        default: 'none'
    },
    subscriptionExpiry: {
        type: Date
    },
    referralCode: {
        type: String,
        unique: true
    },
    referralEarnings: {
        type: Number,
        default: 0
    }
}
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

// Generate referral code
userSchema.pre('save', function(next) {
    if (!this.referralCode) {
        this.referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    }
    next();
});

const User = mongoose.model('User', userSchema);
module.exports = User; 