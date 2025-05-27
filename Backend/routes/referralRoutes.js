const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Course = require('../models/Course');
const auth = require('../middleware/auth');

// POST /api/checkout - Process course purchase with referral
router.post('/checkout', auth, async (req, res) => {
    try {
        const { courseId, referralCode } = req.body;
        const purchasingUser = req.user;

        // Validate course exists
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ error: 'Course not found' });
        }

        // If referral code provided, process referral
        if (referralCode) {
            // Find referring user
            const referringUser = await User.findOne({ referralCode });
            
            if (!referringUser) {
                return res.status(400).json({ error: 'Invalid referral code' });
            }

            // Prevent self-referral
            if (referringUser._id.toString() === purchasingUser._id.toString()) {
                return res.status(400).json({ error: 'Cannot use own referral code' });
            }

            // Calculate commission (10% of course price)
            const commission = course.price * 0.10;

            // Update referring user's earnings and history
            await User.findByIdAndUpdate(referringUser._id, {
                $inc: { referralEarnings: commission },
                $push: {
                    referralHistory: {
                        referredUser: purchasingUser._id,
                        courseId: course._id,
                        amount: commission
                    }
                }
            });
        }

        // Here you would integrate with your payment processing logic
        // and actually process the course purchase

        res.json({ message: 'Purchase successful' });
    } catch (error) {
        console.error('Checkout error:', error);
        res.status(500).json({ error: 'Failed to process purchase' });
    }
});

// POST /api/withdraw - Withdraw referral earnings
router.post('/withdraw', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        
        // Check minimum balance requirement
        if (user.referralEarnings < 20) {
            return res.status(400).json({ 
                error: 'Minimum withdrawal amount is ₵20',
                currentBalance: user.referralEarnings
            });
        }

        const withdrawalAmount = user.referralEarnings;

        // Reset earnings to 0 after withdrawal
        user.referralEarnings = 0;
        await user.save();

        // Here you would integrate with your payment processing system
        // to actually send the money to the user

        res.json({ 
            message: 'Withdrawal processed successfully',
            amount: withdrawalAmount
        });
    } catch (error) {
        console.error('Withdrawal error:', error);
        res.status(500).json({ error: 'Failed to process withdrawal' });
    }
});

module.exports = router; 