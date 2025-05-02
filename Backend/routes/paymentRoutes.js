const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const Course = require('../models/Course');
const Book = require('../models/Book');
const auth = require('../middleware/auth');
const paymentController = require('../controllers/paymentController');

// Initialize payment
router.post('/initialize', auth, async (req, res) => {
    try {
        const {
            itemType,
            itemId,
            paymentMethod,
            momoNumber,
            cryptoAddress,
            shippingAddress,
            amount: requestAmount,
            currency: requestCurrency,
            status,
            transactionId
        } = req.body;

        // Validate item exists
        let item;
        if (itemType === 'course') {
            item = await Course.findById(itemId);
        } else if (itemType === 'book') {
            item = await Book.findById(itemId);
        }

        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }

        // Calculate amount if not provided in request
        const amount = requestAmount || (itemType === 'course' ? item.price.full : item.price);

        // Validate payment method
        const type = ['MTN', 'Vodafone', 'AirtelTigo'].includes(paymentMethod) 
            ? 'momo' 
            : 'crypto';
            
        // Use currency from request or default
        const currency = requestCurrency || (type === 'momo' ? 'GHS' : paymentMethod);

        // Create payment record
        const payment = new Payment({
            user: req.user._id,
            amount,
            currency,
            type,
            paymentMethod,
            itemType,
            itemId,
            momoNumber,
            cryptoAddress,
            shippingAddress,
            status: status || 'pending',
            transactionId
        });

        await payment.save();

        // Here you would integrate with your payment provider
        // For example, calling MTN MoMo API or generating crypto payment address

        res.json({
            paymentId: payment._id,
            amount,
            currency: payment.currency,
            // Add additional payment details based on the provider's response
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
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