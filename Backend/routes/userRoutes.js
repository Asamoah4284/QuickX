const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const bcrypt = require('bcryptjs');

// Register user
router.post('/register', async (req, res) => {
    try {
        const { email, password, fullName } = req.body;
        
        // Log the request data (excluding password)
        console.log('Registration attempt:', { email, fullName });
        
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const user = new User({
            email,
            password,
            fullName
        });

        await user.save();
        console.log('User saved successfully');

        if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET is not configured');
        }

        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            token,
            user: {
                id: user._id,
                email: user.email,
                fullName: user.fullName
            }
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

// Login user
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        
        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user._id,
                email: user.email,
                fullName: user.fullName,
                profilePicture: user.profilePicture,
                subscriptionStatus: user.subscriptionStatus
            }
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
            user: {
                id: req.user._id,
                email: req.user.email,
                fullName: req.user.fullName,
                profilePicture: req.user.profilePicture,
                subscriptionStatus: req.user.subscriptionStatus
            }
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

        res.json(user);
    } catch (error) {
        console.error('Error fetching user data:', error);
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

module.exports = router; 