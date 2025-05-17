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
        // validate: {
        //     validator: function(value) {
        //         // Check for minimum length
        //         if (value.length < 8) {
        //             return false;
        //         }
        //         // Check for at least one uppercase letter
        //         if (!/[A-Z]/.test(value)) {
        //             return false;
        //         }
        //         // Check for at least one lowercase letter
        //         if (!/[a-z]/.test(value)) {
        //             return false;
        //         }
        //         // Check for at least one number
        //         if (!/\d/.test(value)) {
        //             return false;
        //         }
        //         // Check for at least one special character
        //         if (!/[\W_]/.test(value)) {
        //             return false;
        //         }
        //         return true;
        //     },
        //     message: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.'
        // }
    },
    fullName: {
        type: String,
        required: true
    },
    // profilePicture: {
    //     type: String,
    //     default: ''
    // },
    // purchasedCourses: [{
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: 'Course'
    // }],
    // purchasedBooks: [{
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: 'Book'
    // }],
    // subscriptionStatus: {
    //     type: String,
    //     enum: ['active', 'expired', 'none'],
    //     default: 'none'
    // },
    // subscriptionExpiry: {
    //     type: Date
    // },
    referralCode: {
        type: String,
        // unique: true
    },
    referralEarnings: {
        type: Number,
        default: 0
    }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    try {
        this.password = await bcrypt.hash(this.password, 12);
        next();
    } catch (error) {
        next(error);
    }
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