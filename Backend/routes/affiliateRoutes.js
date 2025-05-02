const express = require('express');
const router = express.Router();
const Affiliate = require('../models/Affiliate');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Get affiliate dashboard data
router.get('/dashboard', auth, async (req, res) => {
    try {
        const affiliate = await Affiliate.findOne({ user: req.user._id })
            .populate('referredUsers.user', 'fullName email');

        if (!affiliate) {
            return res.status(404).json({ message: 'Affiliate account not found' });
        }

        res.json(affiliate);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Register as affiliate
router.post('/register', auth, async (req, res) => {
    try {
        const { momoNumber, momoProvider, cryptoAddress, cryptoType } = req.body;

        let affiliate = await Affiliate.findOne({ user: req.user._id });
        if (affiliate) {
            return res.status(400).json({ message: 'Already registered as affiliate' });
        }

        affiliate = new Affiliate({
            user: req.user._id,
            referralCode: req.user.referralCode,
            paymentDetails: {
                momoNumber,
                momoProvider,
                cryptoAddress,
                cryptoType
            }
        });

        await affiliate.save();
        res.status(201).json(affiliate);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Update payment details
router.put('/payment-details', auth, async (req, res) => {
    try {
        const { momoNumber, momoProvider, cryptoAddress, cryptoType } = req.body;

        const affiliate = await Affiliate.findOne({ user: req.user._id });
        if (!affiliate) {
            return res.status(404).json({ message: 'Affiliate account not found' });
        }

        affiliate.paymentDetails = {
            momoNumber,
            momoProvider,
            cryptoAddress,
            cryptoType
        };

        await affiliate.save();
        res.json(affiliate);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get affiliate statistics
router.get('/stats', auth, async (req, res) => {
    try {
        const affiliate = await Affiliate.findOne({ user: req.user._id });
        if (!affiliate) {
            return res.status(404).json({ message: 'Affiliate account not found' });
        }

        const stats = {
            totalReferrals: affiliate.referredUsers.length,
            completedReferrals: affiliate.referredUsers.filter(
                ref => ref.status === 'completed'
            ).length,
            totalEarnings: affiliate.totalEarnings,
            availableBalance: affiliate.availableBalance,
            tier: affiliate.tier
        };

        res.json(stats);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Process referral
router.post('/process-referral', async (req, res) => {
    try {
        const { referralCode, userId, purchaseAmount } = req.body;

        const affiliate = await Affiliate.findOne({ referralCode });
        if (!affiliate) {
            return res.status(404).json({ message: 'Invalid referral code' });
        }

        // Calculate commission based on tier
        let commissionRate;
        switch (affiliate.tier) {
            case 'platinum':
                commissionRate = 0.15; // 15%
                break;
            case 'gold':
                commissionRate = 0.12; // 12%
                break;
            case 'silver':
                commissionRate = 0.10; // 10%
                break;
            default:
                commissionRate = 0.08; // 8%
        }

        const commission = purchaseAmount * commissionRate;

        // Add referral
        affiliate.referredUsers.push({
            user: userId,
            status: 'completed',
            commission,
            purchaseAmount
        });

        affiliate.totalEarnings += commission;
        affiliate.availableBalance += commission;

        // Update tier based on earnings
        if (affiliate.totalEarnings >= 10000) {
            affiliate.tier = 'platinum';
        } else if (affiliate.totalEarnings >= 5000) {
            affiliate.tier = 'gold';
        } else if (affiliate.totalEarnings >= 1000) {
            affiliate.tier = 'silver';
        }

        await affiliate.save();
        res.json({ message: 'Referral processed successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;