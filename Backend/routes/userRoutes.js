const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ProgramEnrollment = require('../models/ProgramEnrollment');
const TutorProfile = require('../models/TutorProfile');
const PlatformSetting = require('../models/PlatformSetting');
const auth = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const sgMail = require('@sendgrid/mail');
const { serializeUser } = require('../utils/serializeUser');
const { sendOTP } = require('../services/sms');

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Rate limiter for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 5 requests per windowMs
    message: 'Too many authentication attempts, please try again later.',
    skipSuccessfulRequests: true,
});

// Validation middleware
const validateRegistration = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    body('fullName')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Full name must be between 2 and 100 characters')
        .matches(/^[a-zA-Z\s]+$/)
        .withMessage('Full name can only contain letters and spaces'),
    body('phone')
        .trim()
        .notEmpty()
        .withMessage('Phone number is required')
        .matches(/^\d{10,15}$/)
        .withMessage('Please provide a valid phone number (10-15 digits)'),
];

const validateLogin = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
    body('password')
        .notEmpty()
        .withMessage('Password is required'),
];

const creatorProfileValidation = [
    body('headline').optional().isLength({ max: 120 }).withMessage('Headline must be 120 characters or fewer'),
    body('bio').optional().isLength({ max: 2000 }).withMessage('Bio must be 2000 characters or fewer'),
    // JSON bodies send numbers; express-validator's isInt() only accepts strings
    body('experienceYears')
        .optional()
        .custom((value) => {
            if (value === undefined || value === null || value === '') return true;
            const n = Number(value);
            return Number.isFinite(n) && Number.isInteger(n) && n >= 0 && n <= 80;
        })
        .withMessage('Experience years must be a whole number between 0 and 80'),
];

function signUserToken(user) {
    return jwt.sign(
        {
            userId: user._id,
            role: user.role || 'student',
            creatorStatus: user.creatorStatus || 'not_applied'
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );
}

function normalizeStringArray(value) {
    if (!value) return [];
    if (Array.isArray(value)) {
        return value
            .map((item) => String(item || '').trim())
            .filter(Boolean);
    }
    return String(value)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}

function clampExperienceYears(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(80, Math.floor(n)));
}

function sanitizeCreatorDraft(body = {}) {
    const socialLinks = body.socialLinks || {};

    return {
        headline: String(body.headline || '').trim(),
        bio: String(body.bio || '').trim(),
        expertise: normalizeStringArray(body.expertise),
        experienceYears: clampExperienceYears(body.experienceYears),
        languages: normalizeStringArray(body.languages || body.languagesSpoken),
        socialLinks: {
            website: String(socialLinks.website || body.website || '').trim(),
            youtube: String(socialLinks.youtube || '').trim()
        },
        certificates: Array.isArray(body.certificates)
            ? body.certificates
                .map((item) => ({
                    title: String(item?.title || '').trim(),
                    issuer: String(item?.issuer || '').trim(),
                    year: String(item?.year || '').trim(),
                    fileUrl: String(item?.fileUrl || '').trim()
                }))
                .filter((item) => item.title)
            : [],
        teachingCategories: normalizeStringArray(body.teachingCategories),
        preferredCourseLanguage: String(body.preferredCourseLanguage || 'English').trim(),
        teachesFreeCourses: Boolean(body.teachesFreeCourses),
        teachesPaidCourses: body.teachesPaidCourses === undefined ? true : Boolean(body.teachesPaidCourses),
        offersMentorship: Boolean(body.offersMentorship),
        idDocumentUrl: String(body.idDocumentUrl || '').trim(),
        avatar: String(body.avatar || '').trim(),
        profilePicture: String(body.profilePicture || body.avatar || '').trim(),
        payoutDetails: {
            accountName: String(body.payoutDetails?.accountName || '').trim(),
            provider: String(body.payoutDetails?.provider || '').trim(),
            accountNumber: String(body.payoutDetails?.accountNumber || '').trim(),
            currency: String(body.payoutDetails?.currency || 'GHS').trim()
        }
    };
}

// Register user
router.post('/register', authLimiter, validateRegistration, async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password, fullName, phone, country = '', avatar = '' } = req.body;
        
        // Log the request data (excluding password)
        console.log('Registration attempt:', { email, fullName, phone });
        
        const userExists = await User.findOne({ email: email.toLowerCase() });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        const user = new User({
            email: email.toLowerCase(),
            password,
            fullName: fullName.trim(),
            phone: String(phone || '').trim(),
            country: String(country || '').trim(),
            avatar: String(avatar || '').trim(),
            profilePicture: String(avatar || '').trim(),
            isVerified: false,
            verificationCode: otp,
            verificationCodeExpires: otpExpiry
        });

        await user.save();
        console.log('User saved successfully. Sending OTP...');

        // Send OTP via SMS
        try {
            await sendOTP(user.phone, otp);
        } catch (smsError) {
            console.error('Failed to send registration OTP:', smsError);
            // We don't fail registration if SMS fails conceptually, 
            // but the user won't be able to verify without it.
            // In a production app, you might want to handle this differently.
        }

        if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET is not configured');
        }

        const token = signUserToken(user);

        res.status(201).json({
            message: 'Registration successful. Verification code sent.',
            token,
            user: serializeUser(user)
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            message: 'Server error', 
            error: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Verify Account
router.post('/verify-account', authLimiter, [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('code').isLength({ min: 6, max: 6 }).withMessage('6-digit code is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, code } = req.body;
        const user = await User.findOne({ 
            email: email.toLowerCase(),
            verificationCode: code,
            verificationCodeExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired verification code' });
        }

        user.isVerified = true;
        user.verificationCode = undefined;
        user.verificationCodeExpires = undefined;
        await user.save();

        const token = signUserToken(user);
        res.json({
            message: 'Account verified successfully',
            token,
            user: serializeUser(user)
        });
    } catch (error) {
        console.error('Account verification error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Resend OTP
router.post('/resend-otp', authLimiter, [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required')
], async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.isVerified) {
            return res.status(400).json({ message: 'Account is already verified' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.verificationCode = otp;
        user.verificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000);
        await user.save();

        await sendOTP(user.phone, otp);

        res.json({ message: 'Verification code resent successfully' });
    } catch (error) {
        console.error('Resend OTP error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Login user
router.post('/login', authLimiter, validateLogin, async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;
        const user = await User.findOne({ email: email.toLowerCase() });
        
        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = signUserToken(user);

        res.json({
            token,
            user: serializeUser(user)
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Validate token and check auth status
router.get('/validate-token', auth, async (req, res) => {
    try {
        res.json({
            isAuthenticated: true,
            user: serializeUser(req.user)
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get user profile
router.get('/profile', auth, async (req, res) => {
    try {
        const user = await User.findById(req.userId)
            .select('-password')
            .populate('purchasedCourses', 'title thumbnail price')
            .populate('purchasedBooks', 'title coverImage price');
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

/** Active program (creator) enrollments — same data as GET /api/programs/user/me */
router.get('/me/programs', auth, async (req, res) => {
    try {
        const now = new Date();
        const enrollments = await ProgramEnrollment.find({
            userId: req.user._id,
            status: 'active',
            $or: [{ endsAt: null }, { endsAt: { $gt: now } }]
        })
            .populate('programId')
            .sort({ createdAt: -1 });
        res.json(enrollments);
    } catch (error) {
        console.error('me/programs:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get current user data
router.get('/me', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .select('-password') // Exclude password
            .lean(); // Convert to plain JavaScript object

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Ensure referral fields are properly formatted
        user.referralEarnings = user.referralEarnings || 0;
        user.referralCode = user.referralCode || '';
        user.avatar = user.avatar || user.profilePicture || '';
        user.profilePicture = user.profilePicture || user.avatar || '';

        res.json(user);
    } catch (error) {
        console.error('Error fetching user data:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

router.patch('/me/account', auth, async (req, res) => {
    try {
        const allowed = ['fullName', 'phone', 'country', 'avatar', 'profilePicture'];
        const updates = {};

        for (const key of allowed) {
            if (req.body[key] !== undefined) {
                const val = String(req.body[key] ?? '').trim();
                // fullName is required on User — never persist empty (would fail validators)
                if (key === 'fullName' && !val) {
                    continue;
                }
                updates[key] = val;
            }
        }

        // Sync fields and handle empty strings correctly
        if (updates.avatar !== undefined || updates.profilePicture !== undefined) {
             const finalAvatar = updates.avatar || updates.profilePicture || '';
             const finalProfilePicture = updates.profilePicture || updates.avatar || '';
             
             // Check if they were explicitly set to empty/invalid and reset them
             updates.avatar = (finalAvatar && finalAvatar !== 'undefined' && finalAvatar !== 'null') ? finalAvatar : '';
             updates.profilePicture = (finalProfilePicture && finalProfilePicture !== 'undefined' && finalProfilePicture !== 'null') ? finalProfilePicture : '';
        }

        if (Object.keys(updates).length === 0) {
            const user = await User.findById(req.user._id);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            return res.json({ user: serializeUser(user) });
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: updates },
            { new: true, runValidators: true }
        );

        res.json({ user: serializeUser(user) });
    } catch (error) {
        console.error('update /me/account:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

router.get('/creator/profile', auth, async (req, res) => {
    try {
        const [user, tutorProfile, settings] = await Promise.all([
            User.findById(req.user._id).select('-password'),
            TutorProfile.findOne({ userId: req.user._id }),
            PlatformSetting.findOne().sort({ createdAt: -1 }).lean()
        ]);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            user: serializeUser(user),
            tutorProfile,
            settings: settings || {
                commissionRate: 15,
                courseAutoApproval: false,
                creatorAutoApproval: false
            }
        });
    } catch (error) {
        console.error('GET /creator/profile:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

router.put('/creator/profile', auth, creatorProfileValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const payload = sanitizeCreatorDraft(req.body);
        const [user, tutorProfile] = await Promise.all([
            User.findById(req.user._id),
            TutorProfile.findOneAndUpdate(
                { userId: req.user._id },
                {
                    $set: {
                        userId: req.user._id,
                        ...payload,
                        applicationStatus: 'draft'
                    }
                },
                { new: true, upsert: true, setDefaultsOnInsert: true }
            )
        ]);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.creatorHeadline = payload.headline;
        user.creatorBio = payload.bio;
        user.expertise = payload.expertise;
        user.languagesSpoken = payload.languages;
        user.socialLinks = payload.socialLinks;
        
        if (payload.avatar) {
            user.avatar = payload.avatar;
            user.profilePicture = payload.avatar;
        }
        
        await user.save();
        console.log(`[API] Tutor profile updated for user: ${req.user._id}`);

        res.json({
            user: serializeUser(user),
            tutorProfile
        });
    } catch (error) {
        console.error('PUT /creator/profile:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

router.post('/creator/profile/submit', auth, async (req, res) => {
    try {
        const [user, tutorProfile, settings] = await Promise.all([
            User.findById(req.user._id),
            TutorProfile.findOne({ userId: req.user._id }),
            PlatformSetting.findOne().sort({ createdAt: -1 })
        ]);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!tutorProfile) {
            return res.status(400).json({ message: 'Complete your tutor profile before submitting' });
        }

        if (!tutorProfile.headline || !tutorProfile.bio || tutorProfile.teachingCategories.length === 0) {
            return res.status(400).json({
                message: 'Tutor profile is incomplete',
                details: {
                    headline: !tutorProfile.headline,
                    bio: !tutorProfile.bio,
                    teachingCategories: tutorProfile.teachingCategories.length === 0
                }
            });
        }

        const autoApprove = Boolean(settings?.creatorAutoApproval);
        tutorProfile.applicationStatus = autoApprove ? 'approved' : 'pending';
        tutorProfile.reviewNotes = autoApprove ? 'Auto-approved by platform settings' : '';
        await tutorProfile.save();

        user.creatorStatus = autoApprove ? 'approved' : 'pending';
        user.role = autoApprove ? 'tutor' : user.role;
        user.creatorApplicationSubmittedAt = new Date();
        user.creatorReviewNotes = tutorProfile.reviewNotes || '';
        await user.save();
        console.log(`[API] Creator application submitted/processed for user: ${req.user._id}. Status: ${user.creatorStatus}`);

        res.json({
            message: autoApprove ? 'Creator application approved automatically' : 'Creator application submitted',
            user: serializeUser(user),
            tutorProfile
        });
    } catch (error) {
        console.error('POST /creator/profile/submit:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get user's referral history
router.get('/referrals', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .select('referralHistory referralEarnings referralCode')
            .populate('referralHistory.referredUser', 'fullName email')
            .populate('referralHistory.courseId', 'title');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            referralCode: user.referralCode,
            referralEarnings: user.referralEarnings,
            referralHistory: user.referralHistory
        });
    } catch (error) {
        console.error('Error fetching referral history:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Forgot password route
router.post('/forgot-password', authLimiter, [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email')
], async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email } = req.body;
        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            // For security reasons, don't reveal if the email exists or not
            return res.json({ message: 'If your email is registered, you will receive a password reset link shortly.' });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetExpires = Date.now() + 3600000; // 1 hour from now

        // Save token and expiration to user
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = resetExpires;
        await user.save();

        // Create reset URL
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

        // Send email
        const msg = {
            to: user.email,
            from: process.env.SENDGRID_FROM_EMAIL,
            subject: 'Password Reset Request',
            html: `
                <h1>Password Reset Request</h1>
                <p>You requested a password reset. Click the link below to reset your password:</p>
                <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
                <p>This link will expire in 1 hour.</p>
                <p>If you didn't request this, please ignore this email.</p>
            `
        };

        await sgMail.send(msg);

        res.json({ message: 'If your email is registered, you will receive a password reset link shortly.' });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ 
            message: 'Server error', 
            error: process.env.NODE_ENV === 'development' ? error.message : undefined 
        });
    }
});

// Reset password route
router.post('/reset-password', authLimiter, [
    body('token')
        .notEmpty()
        .withMessage('Reset token is required'),
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
], async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { token, password } = req.body;

        // Find user with valid reset token
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired reset token' });
        }

        // Update password and clear reset token fields
        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        // Send confirmation email
        const msg = {
            to: user.email,
            from: process.env.SENDGRID_FROM_EMAIL,
            subject: 'Password Reset Successful',
            html: `
                <h1>Password Reset Successful</h1>
                <p>Your password has been successfully reset.</p>
                <p>If you didn't make this change, please contact support immediately.</p>
            `
        };

        await sgMail.send(msg);

        res.json({ message: 'Password has been reset successfully' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ 
            message: 'Server error', 
            error: process.env.NODE_ENV === 'development' ? error.message : undefined 
        });
    }
});

module.exports = router; 