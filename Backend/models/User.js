const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const withdrawalRequestSchema = new mongoose.Schema({
    amount: {
        type: Number,
        required: true
    },
    momoNumber: {
        type: String,
        required: true
    },
    network: {
        type: String,
        required: true,
        enum: ['MTN', 'Vodafone', 'AirtelTigo']
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending'
    },
    requestedAt: {
        type: Date,
        default: Date.now
    },
    processedAt: Date,
    remarks: String
});

const momoDetailsSchema = new mongoose.Schema({
    momoNumber: {
        type: String,
        required: true,
        match: [/^0\d{9}$/, 'Please enter a valid 10-digit phone number starting with 0']
    },
    network: {
        type: String,
        required: true,
        enum: ['MTN', 'Vodafone', 'AirtelTigo']
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
});

const socialLinksSchema = new mongoose.Schema({
    website: String,
    youtube: String
}, { _id: false });

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
        validate: {
            validator: function(value) {
                // Check for minimum length
                if (value.length < 8) {
                    return false;
                }
                // Check for at least one uppercase letter
                if (!/[A-Z]/.test(value)) {
                    return false;
                }
                // Check for at least one lowercase letter
                if (!/[a-z]/.test(value)) {
                    return false;
                }
                // Check for at least one number
                if (!/\d/.test(value)) {
                    return false;
                }
                // Check for at least one special character
                if (!/[\W_]/.test(value)) {
                    return false;
                }
                return true;
            },
            message: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.'
        }
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    fullName: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['student', 'tutor', 'admin'],
        default: 'student'
    },
    creatorStatus: {
        type: String,
        enum: ['not_applied', 'pending', 'approved', 'rejected', 'suspended'],
        default: 'not_applied'
    },
    phone: {
        type: String,
        default: ''
    },
    country: {
        type: String,
        default: ''
    },
    avatar: {
        type: String,
        default: ''
    },
    profilePicture: {
        type: String,
        default: ''
    },
    creatorHeadline: {
        type: String,
        default: ''
    },
    creatorBio: {
        type: String,
        default: ''
    },
    expertise: [{
        type: String
    }],
    languagesSpoken: [{
        type: String
    }],
    socialLinks: {
        type: socialLinksSchema,
        default: () => ({})
    },
    creatorApplicationSubmittedAt: Date,
    creatorReviewedAt: Date,
    creatorReviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        default: null
    },
    creatorReviewNotes: {
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
        unique: true,
        sparse: true
    },
    /** User who referred this account at signup (optional) */
    referredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
        index: true,
    },
    referralEarnings: {
        type: Number,
        default: 0
    },
    referralHistory: [{
        referredUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        courseId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Course'
        },
        amount: {
            type: Number,
            required: true
        },
        date: {
            type: Date,
            default: Date.now
        }
    }],
    momoDetails: momoDetailsSchema,
    withdrawalRequests: [withdrawalRequestSchema],
    isVerified: {
        type: Boolean,
        default: false
    },
    verificationCode: {
        type: String,
        default: null
    },
    verificationCodeExpires: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Generate referral code before saving
userSchema.pre('save', function(next) {
    if (!this.referralCode) {
        // Generate a unique 6-character alphanumeric code
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        this.referralCode = code;
    }
    next();
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

const User = mongoose.model('User', userSchema);
module.exports = User; 