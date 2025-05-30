const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

// Rate limiter for withdrawal requests
const withdrawalLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Limit to 3 withdrawal requests per hour
    message: 'Too many withdrawal requests. Please try again later.',
    skipSuccessfulRequests: false
});

// Validation middleware
const validateMomoDetails = [
    body('momoNumber')
        .matches(/^0\d{9}$/)
        .withMessage('Invalid phone number format. Must be 10 digits starting with 0'),
    body('network')
        .isIn(['MTN', 'Vodafone', 'AirtelTigo'])
        .withMessage('Invalid network. Must be MTN, Vodafone, or AirtelTigo')
];

// Update MoMo details
router.post('/momo-details', auth, validateMomoDetails, async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { momoNumber, network } = req.body;

        // Update user's MoMo details
        const user = await User.findByIdAndUpdate(
            req.user._id,
            {
                momoDetails: {
                    momoNumber,
                    network,
                    lastUpdated: new Date()
                }
            },
            { new: true }
        );

        res.json({
            message: 'MoMo details updated successfully',
            momoDetails: user.momoDetails
        });
    } catch (error) {
        console.error('Error updating MoMo details:', error);
        res.status(500).json({
            message: 'Failed to update MoMo details',
            error: error.message
        });
    }
});

// Request withdrawal
router.post('/withdraw', auth, withdrawalLimiter, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        
        // Check if user has pending withdrawal
        const hasPendingWithdrawal = user.withdrawalRequests.some(
            request => request.status === 'pending'
        );
        
        if (hasPendingWithdrawal) {
            return res.status(400).json({
                message: 'You already have a pending withdrawal request. Please wait for it to be processed.'
            });
        }

        // Check minimum withdrawal amount
        if (user.referralEarnings < 20) {
            return res.status(400).json({
                message: 'Minimum withdrawal amount is ₵20',
                currentBalance: user.referralEarnings
            });
        }

        // Ensure user has MoMo details set up
        if (!user.momoDetails) {
            return res.status(400).json({
                message: 'Please set up your Mobile Money details before withdrawing'
            });
        }

        const withdrawalAmount = user.referralEarnings;
        const withdrawalRequest = {
            amount: withdrawalAmount,
            momoNumber: user.momoDetails.momoNumber,
            network: user.momoDetails.network,
            status: 'pending',
            requestedAt: new Date()
        };

        // Reset earnings and add withdrawal request
        user.referralEarnings = 0;
        user.withdrawalRequests.push(withdrawalRequest);
        await user.save();

        // Here you would typically integrate with your payment processing system
        // to actually send the money to the user's MoMo account

        res.json({
            message: 'Withdrawal request processed successfully',
            withdrawal: {
                amount: withdrawalAmount,
                momoNumber: user.momoDetails.momoNumber,
                network: user.momoDetails.network,
                status: 'pending'
            }
        });
    } catch (error) {
        console.error('Withdrawal error:', error);
        res.status(500).json({
            message: 'Failed to process withdrawal',
            error: error.message
        });
    }
});

// Get withdrawal history
router.get('/history', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .select('withdrawalRequests')
            .sort({ 'withdrawalRequests.requestedAt': -1 });

        res.json({
            withdrawalRequests: user.withdrawalRequests
        });
    } catch (error) {
        console.error('Error fetching withdrawal history:', error);
        res.status(500).json({
            message: 'Failed to fetch withdrawal history',
            error: error.message
        });
    }
});

// Get MoMo details
router.get('/momo-details', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .select('momoDetails');

        res.json({
            momoDetails: user.momoDetails || null
        });
    } catch (error) {
        console.error('Error fetching MoMo details:', error);
        res.status(500).json({
            message: 'Failed to fetch MoMo details',
            error: error.message
        });
    }
});

module.exports = router; 