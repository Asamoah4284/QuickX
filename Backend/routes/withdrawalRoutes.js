const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const wallet = require('../services/walletService');

/** Referral-earnings withdrawals (wallet withdrawals live in walletRoutes). */

const withdrawalLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: { message: 'Too many withdrawal requests. Please try again later.' },
});

const validateMomoDetails = [
    body('momoNumber')
        .matches(/^0\d{9}$/)
        .withMessage('Invalid phone number format. Must be 10 digits starting with 0'),
    body('network')
        .isIn(['MTN', 'Vodafone', 'AirtelTigo'])
        .withMessage('Invalid network. Must be MTN, Vodafone, or AirtelTigo'),
];

router.post('/momo-details', auth, validateMomoDetails, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
        }
        const { momoNumber, network } = req.body;
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { momoDetails: { momoNumber, network, lastUpdated: new Date() } },
            { new: true }
        );
        res.json({ message: 'MoMo details updated successfully', momoDetails: user.momoDetails });
    } catch (error) {
        console.error('Error updating MoMo details:', error);
        res.status(500).json({ message: 'Failed to update MoMo details' });
    }
});

/** Withdraw the full referral balance to the saved mobile money number. */
router.post('/withdraw', auth, withdrawalLimiter, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('momoDetails').lean();
        const momoNumber = req.body.momoNumber || user?.momoDetails?.momoNumber;
        const network = req.body.network || user?.momoDetails?.network;
        if (!momoNumber || !network) {
            return res.status(400).json({ message: 'Please set up your Mobile Money details before withdrawing' });
        }

        const result = await wallet.requestWithdrawal({
            userId: req.user._id,
            source: 'referral',
            momoNumber,
            network,
        });

        res.json({
            message: 'Withdrawal request submitted. You will be paid once it is approved.',
            referralEarnings: result.referralEarnings,
            withdrawal: {
                amount: result.request.amount,
                momoNumber,
                network,
                status: 'pending',
            },
        });
    } catch (error) {
        if (!error.status) console.error('Withdrawal error:', error);
        res.status(error.status || 500).json({
            message: error.status ? error.message : 'Failed to process withdrawal',
            ...(error.currentBalance != null ? { currentBalance: error.currentBalance } : {}),
        });
    }
});

router.get('/history', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('withdrawalRequests').lean();
        const withdrawalRequests = (user?.withdrawalRequests || [])
            .slice()
            .sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));
        res.json({ withdrawalRequests });
    } catch (error) {
        console.error('Error fetching withdrawal history:', error);
        res.status(500).json({ message: 'Failed to fetch withdrawal history' });
    }
});

router.get('/momo-details', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('momoDetails');
        res.json({ momoDetails: user.momoDetails || null });
    } catch (error) {
        console.error('Error fetching MoMo details:', error);
        res.status(500).json({ message: 'Failed to fetch MoMo details' });
    }
});

module.exports = router;
