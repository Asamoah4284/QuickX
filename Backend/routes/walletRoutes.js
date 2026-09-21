const express = require('express');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const User = require('../models/User');
const WalletTransaction = require('../models/WalletTransaction');
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
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            message: 'Validation failed',
            errors: errors.array(),
        });
    }
    next();
}

router.get('/', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('walletBalance referralEarnings');
        const transactions = await WalletTransaction.find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();

        res.json({
            balance: Number(user?.walletBalance || 0),
            referralEarnings: Number(user?.referralEarnings || 0),
            currency: 'GHS',
            transactions: transactions.map((tx) => ({
                id: String(tx._id),
                type: tx.type,
                amount: tx.amount,
                balanceAfter: tx.balanceAfter,
                label: tx.label,
                reference: tx.reference,
                status: tx.status,
                date: tx.createdAt,
            })),
        });
    } catch (error) {
        console.error('Wallet fetch error:', error);
        res.status(500).json({ message: 'Failed to load wallet' });
    }
});

router.post('/topup/initiate', auth, [
    body('amount').isFloat({ min: 1 }).toFloat(),
    body('momoNumber').matches(/^0\d{9}$/),
    body('network').optional().isIn(['MTN', 'Vodafone', 'AirtelTigo']),
    handleValidationErrors,
], async (req, res) => {
    try {
        const transactionId = `qx_wallet_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const network = req.body.network || detectNetwork(req.body.momoNumber);
        const email = req.user.email || `${req.body.momoNumber}@phone.quickxlearn.com`;

        const { paymentRecord } = await buildPendingPaymentRecord(
            {
                itemType: 'wallet_topup',
                itemId: req.user._id,
                amount: req.body.amount,
                transactionId,
                paymentMethod: network,
                momoNumber: req.body.momoNumber,
                shippingAddress: { email, phone: req.body.momoNumber },
            },
            req.user._id
        );

        const Payment = require('../models/Payment');
        const payment = new Payment(paymentRecord);
        await payment.save();

        const moolre = await initiateCollection({
            amount: req.body.amount,
            payer: req.body.momoNumber,
            network,
            externalref: transactionId,
            otpcode: req.body.otpcode,
            sessionid: req.body.sessionid,
        });

        if (!moolre.ok && !moolre.simulated) {
            payment.status = 'failed';
            await payment.save();
            return res.status(400).json({ message: moolre.message || 'Could not initiate top-up' });
        }

        if (!isConfigured() || moolre.simulated) {
            const result = await completePendingPaymentByTransactionId(transactionId, req.user._id);
            return res.json({
                success: true,
                completed: true,
                transactionId,
                balance: result.walletBalance,
            });
        }

        res.json({
            success: true,
            completed: false,
            pending: true,
            transactionId,
            requiresOtp: Boolean(moolre.requiresOtp),
            sessionId: moolre.sessionId || null,
        });
    } catch (error) {
        res.status(400).json({ message: error.message || 'Top-up failed' });
    }
});

router.post('/topup/verify', auth, [
    body('transactionId').notEmpty().trim(),
    handleValidationErrors,
], async (req, res) => {
    try {
        const Payment = require('../models/Payment');
        const payment = await Payment.findOne({
            transactionId: req.body.transactionId,
            userId: req.user._id,
            itemType: 'wallet_topup',
        });
        if (!payment) return res.status(404).json({ message: 'Top-up not found' });

        if (payment.status === 'completed') {
            const user = await User.findById(req.user._id).select('walletBalance');
            return res.json({
                success: true,
                completed: true,
                balance: Number(user?.walletBalance || 0),
            });
        }

        const verified = await verifyCollection(req.body.transactionId, payment.originalAmount);
        if (!verified.ok) {
            return res.json({
                success: true,
                completed: false,
                pending: Boolean(verified.pending),
                failed: Boolean(verified.failed),
            });
        }

        const result = await completePendingPaymentByTransactionId(req.body.transactionId, req.user._id);
        res.json({
            success: true,
            completed: true,
            balance: result.walletBalance,
        });
    } catch (error) {
        res.status(400).json({ message: error.message || 'Could not verify top-up' });
    }
});

router.post('/pay', auth, [
    body('amount').isFloat({ min: 0.01 }).toFloat(),
    body('label').optional().isString(),
    handleValidationErrors,
], async (req, res) => {
    try {
        const amount = Number(req.body.amount);
        const user = await User.findById(req.user._id);
        const balance = Number(user.walletBalance || 0);
        if (balance < amount) {
            return res.status(400).json({
                message: 'Insufficient wallet balance',
                balance,
            });
        }

        const nextBalance = Number((balance - amount).toFixed(2));
        user.walletBalance = nextBalance;
        await user.save();

        const tx = await WalletTransaction.create({
            userId: req.user._id,
            type: 'payment',
            amount: -amount,
            balanceAfter: nextBalance,
            label: req.body.label || 'Wallet payment',
            reference: `qx_wallet_pay_${Date.now()}`,
            status: 'completed',
        });

        res.json({
            success: true,
            balance: nextBalance,
            transaction: {
                id: String(tx._id),
                type: tx.type,
                amount: tx.amount,
                label: tx.label,
                date: tx.createdAt,
            },
        });
    } catch (error) {
        res.status(500).json({ message: error.message || 'Wallet payment failed' });
    }
});

router.post('/withdraw', auth, [
    body('amount').isFloat({ min: 1 }).toFloat(),
    body('momoNumber').matches(/^0\d{9}$/),
    body('network').isIn(['MTN', 'Vodafone', 'AirtelTigo']),
    handleValidationErrors,
], async (req, res) => {
    try {
        const amount = Number(req.body.amount);
        const user = await User.findById(req.user._id);
        const balance = Number(user.walletBalance || 0);
        if (balance < amount) {
            return res.status(400).json({ message: 'Insufficient wallet balance', balance });
        }

        const nextBalance = Number((balance - amount).toFixed(2));
        user.walletBalance = nextBalance;
        user.momoDetails = {
            momoNumber: req.body.momoNumber,
            network: req.body.network,
            lastUpdated: new Date(),
        };
        user.withdrawalRequests.push({
            amount,
            momoNumber: req.body.momoNumber,
            network: req.body.network,
            status: 'pending',
            requestedAt: new Date(),
            remarks: 'QuickX Wallet withdrawal',
        });
        await user.save();

        const tx = await WalletTransaction.create({
            userId: req.user._id,
            type: 'withdraw',
            amount: -amount,
            balanceAfter: nextBalance,
            label: 'Wallet withdrawal',
            reference: `qx_wallet_wd_${Date.now()}`,
            status: 'pending',
        });

        res.json({
            success: true,
            balance: nextBalance,
            message: 'Withdrawal request submitted',
            transaction: {
                id: String(tx._id),
                type: tx.type,
                amount: tx.amount,
                label: tx.label,
                status: tx.status,
            },
        });
    } catch (error) {
        res.status(500).json({ message: error.message || 'Withdrawal failed' });
    }
});

module.exports = router;
