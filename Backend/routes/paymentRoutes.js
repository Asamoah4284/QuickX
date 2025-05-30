const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const Course = require('../models/Course');
const Book = require('../models/Book');
const auth = require('../middleware/auth');
const paymentController = require('../controllers/paymentController');
const User = require('../models/User');
const { body, validationResult } = require('express-validator');

// Validation middleware for payment initialization
const validatePayment = [
    body('amount')
        .isFloat({ min: 0.01 })
        .withMessage('Amount must be greater than 0')
        .toFloat(),
    body('itemType')
        .isIn(['course', 'book'])
        .withMessage('Invalid item type'),
    body('itemId')
        .isMongoId()
        .withMessage('Invalid item ID'),
    body('transactionId')
        .notEmpty()
        .trim()
        .escape()
        .withMessage('Transaction ID is required'),
    body('paymentMethod')
        .isIn(['MTN', 'Vodafone', 'AirtelTigo', 'momo', 'paystack', 'card', 'direct'])
        .withMessage('Invalid payment method'),
    body('momoNumber')
        .matches(/^0\d{9}$/)
        .withMessage('Invalid mobile money number format. Must start with 0 and be 10 digits'),
    body('referralCode')
        .optional({ nullable: true, checkFalsy: true })
        .if(body('referralCode').notEmpty())
        .isAlphanumeric()
        .isLength({ min: 6, max: 6 })
        .withMessage('Invalid referral code format'),
    body('shippingAddress')
        .isObject()
        .withMessage('Shipping address must be an object'),
    body('shippingAddress.email')
        .isEmail()
        .withMessage('Valid email is required in shipping address'),
    body('shippingAddress.phone')
        .matches(/^0\d{9}$/)
        .withMessage('Valid phone number is required in shipping address'),
    body('currency')
        .equals('GHS')
        .withMessage('Currency must be GHS')
];

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
    if (req.body.referralCode === '') {
        delete req.body.referralCode;
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log('Validation errors:', {
            body: req.body,
            errors: errors.array()
        });
        return res.status(400).json({ 
            message: 'Validation failed',
            errors: errors.array().map(err => ({
                field: err.path,
                message: err.msg,
                value: err.value
            }))
        });
    }
    next();
};

// Initialize payment and process referral
router.post('/initialize', auth, validatePayment, handleValidationErrors, async (req, res) => {
    try {
        console.log('Received payment initialization request:', {
            body: req.body,
            user: req.user._id
        });

        const { 
            itemType, 
            itemId, 
            amount, 
            transactionId, 
            referralCode,
            paymentMethod,
            momoNumber,
            shippingAddress,
            currency 
        } = req.body;

        // Validate the purchase item exists and verify price
        let purchaseItem;
        let finalAmount = Number(amount); // Original amount
        let commissionAmount = 0;
        let referringUserId = null;

        if (itemType === 'course') {
            purchaseItem = await Course.findById(itemId);
            if (!purchaseItem) {
                return res.status(404).json({ message: 'Course not found' });
            }
            
         
        } else if (itemType === 'book') {
            purchaseItem = await Book.findById(itemId);
            if (!purchaseItem) {
                return res.status(404).json({ message: 'Book not found' });
            }
            
            // Verify the amount matches the book price (with small tolerance for floating point)
            const priceDiff = Math.abs(purchaseItem.price - finalAmount);
            if (priceDiff > 0.01) {
                return res.status(400).json({ 
                    message: 'Invalid amount. Price mismatch detected.',
                    expected: purchaseItem.price,
                    received: finalAmount,
                    difference: priceDiff
                });
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
            const user = await User.findById(payment.user);
            
            if (payment.itemType === 'course') {
                const course = await Course.findById(payment.itemId);
                
                // Add course to user's purchased courses
                user.purchasedCourses.push(payment.itemId);
                
                // If this is a forex course, add all forex ebooks
                if (course && course.courseType === 'forex') {
                    const forexBooks = await Book.find({ 
                        category: 'forex',
                        type: 'ebook'
                    });
                    
                    // Add forex books if not already purchased
                    for (const book of forexBooks) {
                        if (!user.purchasedBooks.includes(book._id)) {
                            user.purchasedBooks.push(book._id);
                        }
                    }
                }
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