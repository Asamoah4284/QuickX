const express = require('express');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Payment = require('../models/Payment');
const {
    buildPendingPaymentRecord,
    completePendingPaymentByTransactionId,
} = require('../services/purchaseCompletionService');
const {
    detectNetwork,
    initiateCollection,
    verifyCollection,
    isConfigured,
} = require('../services/moolrePayments');

const router = express.Router();

function handleValidationErrors(req, res, next) {
    if (req.body.referralCode === '') delete req.body.referralCode;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            message: 'Validation failed',
            errors: errors.array(),
        });
    }
    next();
}

const validateInitiate = [
    body('itemType')
        .isIn(['course', 'book', 'book_cart', 'book_offer', 'program', 'creator_subscription', 'wallet_topup'])
        .withMessage('Invalid item type'),
    body('planId')
        .if(body('itemType').equals('creator_subscription'))
        .isIn(['basic', 'premium', 'premium_plus', 'diamond', '1m', '2m', '3m', '1y'])
        .withMessage('Invalid subscription plan'),
    body('amount').isFloat({ min: 0.01 }).toFloat(),
    body('momoNumber').matches(/^0\d{9}$/).withMessage('Invalid mobile money number'),
    body('network').optional().isIn(['MTN', 'Vodafone', 'AirtelTigo']),
    body('shippingAddress').optional().isObject(),
    body('shippingAddress.email').optional().isEmail(),
    handleValidationErrors,
];

router.post('/initiate', auth, validateInitiate, async (req, res) => {
    try {
        const transactionId =
            req.body.transactionId ||
            `qx_moolre_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const network = req.body.network || detectNetwork(req.body.momoNumber);
        const paymentMethod = network;

        const existing = await Payment.findOne({ transactionId });
        if (existing?.status === 'completed') {
            return res.json({
                success: true,
                completed: true,
                transactionId,
                message: 'Payment already completed',
            });
        }

        const { paymentRecord } = await buildPendingPaymentRecord(
            {
                ...req.body,
                transactionId,
                paymentMethod,
            },
            req.user._id
        );

        let payment = existing;
        if (!payment) {
            payment = new Payment(paymentRecord);
            await payment.save();
        } else if (payment.status === 'pending') {
            Object.assign(payment, paymentRecord);
            await payment.save();
        }

        const moolre = await initiateCollection({
            amount: payment.originalAmount,
            payer: req.body.momoNumber,
            network,
            externalref: transactionId,
            otpcode: req.body.otpcode,
            sessionid: req.body.sessionid,
        });

        if (!moolre.ok && !moolre.simulated) {
            payment.status = 'failed';
            await payment.save();
            return res.status(400).json({
                message: moolre.message || 'Could not initiate Moolre payment',
                code: moolre.code,
            });
        }

        if (!isConfigured() || moolre.simulated) {
            const result = await completePendingPaymentByTransactionId(transactionId, req.user._id);
            return res.json({
                success: true,
                completed: true,
                simulated: true,
                transactionId,
                message: 'Payment completed',
                courseAccessGranted: Boolean(result.courseAccess),
                subscription: result.subscription || null,
                walletBalance: result.walletBalance ?? null,
            });
        }

        return res.json({
            success: true,
            completed: false,
            pending: true,
            transactionId,
            requiresOtp: Boolean(moolre.requiresOtp),
            sessionId: moolre.sessionId || null,
            message:
                moolre.message ||
                'Approve the payment prompt on your phone, then tap “I’ve approved”.',
        });
    } catch (error) {
        console.error('Moolre initiate error:', error);
        res.status(400).json({ message: error.message || 'Failed to initiate payment' });
    }
});

router.post('/verify', auth, [
    body('transactionId').notEmpty().trim(),
    body('otpcode').optional().isString(),
    body('sessionid').optional().isString(),
    handleValidationErrors,
], async (req, res) => {
    try {
        const { transactionId, otpcode, sessionid } = req.body;
        const payment = await Payment.findOne({ transactionId, userId: req.user._id });
        if (!payment) {
            return res.status(404).json({ message: 'Payment not found' });
        }

        if (payment.status === 'completed') {
            const result = await completePendingPaymentByTransactionId(transactionId, req.user._id);
            return res.json({
                success: true,
                completed: true,
                transactionId,
                courseAccessGranted: Boolean(result.courseAccess),
                subscription: result.subscription || null,
                walletBalance: result.walletBalance ?? null,
            });
        }

        if (otpcode && sessionid && isConfigured()) {
            const retry = await initiateCollection({
                amount: payment.originalAmount,
                payer: payment.momoNumber,
                network: payment.paymentMethod,
                externalref: transactionId,
                otpcode,
                sessionid,
            });
            if (!retry.ok && !retry.requiresOtp) {
                return res.status(400).json({
                    message: retry.message || 'OTP verification failed',
                    code: retry.code,
                    requiresOtp: Boolean(retry.requiresOtp),
                });
            }
        }

        const verified = await verifyCollection(transactionId, payment.originalAmount);
        if (!verified.ok) {
            return res.json({
                success: true,
                completed: false,
                pending: Boolean(verified.pending),
                failed: Boolean(verified.failed),
                transactionId,
                message: verified.failed
                    ? 'Payment failed or was cancelled'
                    : 'Waiting for approval on your phone',
            });
        }

        const result = await completePendingPaymentByTransactionId(transactionId, req.user._id);
        return res.json({
            success: true,
            completed: true,
            transactionId,
            courseAccessGranted: Boolean(result.courseAccess),
            subscription: result.subscription || null,
            walletBalance: result.walletBalance ?? null,
        });
    } catch (error) {
        console.error('Moolre verify error:', error);
        res.status(400).json({ message: error.message || 'Failed to verify payment' });
    }
});

module.exports = router;
