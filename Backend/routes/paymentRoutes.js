const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const Course = require('../models/Course');
const Book = require('../models/Book');
const auth = require('../middleware/auth');
const paymentController = require('../controllers/paymentController');
const User = require('../models/User');

// Initialize payment and process referral
router.post('/initialize', auth, async (req, res) => {
    try {
        const { 
            itemType, 
            itemId, 
            amount, 
            transactionId, 
            referralCode,
            paymentMethod,
            momoNumber,
            shippingAddress 
        } = req.body;

        // Validate the purchase item exists
        let purchaseItem;
        let finalAmount = Number(amount); // Original amount
        let commissionAmount = 0;
        let referringUserId = null;

        if (itemType === 'course') {
            purchaseItem = await Course.findById(itemId);
            if (!purchaseItem) {
                return res.status(404).json({ message: 'Course not found' });
            }
        }

        // Process referral if code provided
        if (referralCode) {
            const referringUser = await User.findOne({ referralCode });
            
            if (referringUser) {
                // Prevent self-referral
                if (referringUser._id.toString() === req.user._id.toString()) {
                    return res.status(400).json({ message: 'Cannot use own referral code' });
                }

                // Calculate commission (10% of original amount)
                commissionAmount = Number((amount * 0.10).toFixed(2));
                // Calculate final amount after commission
                finalAmount = Number((amount - commissionAmount).toFixed(2));
                referringUserId = referringUser._id;

                // Update referring user's earnings and history
                await User.findByIdAndUpdate(
                    referringUser._id,
                    {
                        $inc: { referralEarnings: commissionAmount },
                        $push: {
                            referralHistory: {
                                referredUser: req.user._id,
                                courseId: itemId,
                                amount: commissionAmount,
                                date: new Date()
                            }
                        }
                    },
                    { new: true }
                );

                console.log(`Referral commission of ${commissionAmount} credited to user ${referringUser._id}`);
            }
        }

        // Create payment record with commission details
        const paymentRecord = {
            userId: req.user._id,
            itemType,
            itemId,
            originalAmount: amount,
            finalAmount: finalAmount,
            commissionAmount: commissionAmount,
            referringUserId: referringUserId,
            transactionId,
            paymentMethod,
            momoNumber,
            shippingAddress,
            referralCode,
            status: 'completed',
            createdAt: new Date()
        };

        // Save payment record to database
        const payment = new Payment(paymentRecord);
        await payment.save();

        console.log('Payment record:', {
            ...paymentRecord,
            breakdown: {
                original: amount,
                commission: commissionAmount,
                final: finalAmount
            }
        });

        res.json({ 
            success: true, 
            message: 'Payment initialized successfully',
            payment: {
                ...paymentRecord,
                breakdown: {
                    originalAmount: amount,
                    commissionAmount: commissionAmount,
                    finalAmount: finalAmount
                }
            }
        });
    } catch (error) {
        console.error('Payment initialization error:', error);
        res.status(500).json({ 
            message: 'Failed to process payment', 
            error: error.message 
        });
    }
});

// Verify payment status
router.get('/verify/:paymentId', auth, async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.paymentId);
        
        if (!payment) {
            return res.status(404).json({ message: 'Payment not found' });
        }

        // Here you would check the payment status with your payment provider
        // For this example, we'll just return the current status
        res.json({
            status: payment.status,
            transactionId: payment.transactionId
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Webhook for payment provider callbacks
router.post('/webhook', async (req, res) => {
    try {
        // Verify webhook signature/authenticity
        
        const { paymentId, status, transactionId } = req.body;
        
        const payment = await Payment.findById(paymentId);
        if (!payment) {
            return res.status(404).json({ message: 'Payment not found' });
        }

        payment.status = status;
        payment.transactionId = transactionId;
        await payment.save();

        // If payment is completed, update user's purchases
        if (status === 'completed') {
            const user = await user.findById(payment.user);
            
            if (payment.itemType === 'course') {
                user.purchasedCourses.push(payment.itemId);
            } else if (payment.itemType === 'book') {
                user.purchasedBooks.push(payment.itemId);
            }
            
            await user.save();
        }

        res.json({ message: 'Webhook processed successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   POST /api/payments/verify
// @desc    Verify a Paystack payment for a single module
// @access  Public
router.post('/verify', paymentController.verifyPayment);

// @route   POST /api/payments/verify-bundle
// @desc    Verify a Paystack payment for a bundle purchase
// @access  Public
router.post('/verify-bundle', paymentController.verifyBundlePayment);

module.exports = router;