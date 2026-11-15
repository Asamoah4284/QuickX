const express = require('express');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Payment = require('../models/Payment');
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
const wallet = require('../services/walletService');
const { allowSimulatedPayments } = require('../config/paymentMode');

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

/** Balances, recent activity and any withdrawal in progress. */
router.get('/', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .select('walletBalance referralEarnings referralCode withdrawalRequests momoDetails')
            .lean();
        const transactions = await WalletTransaction.find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();
        const requests = (user?.withdrawalRequests || [])
            .slice()
            .sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt))
            .slice(0, 20)
            .map((r) => ({
                id: String(r._id),
                amount: r.amount,
                status: r.status,
                source: wallet.withdrawalSource(r),
                momoNumber: r.momoNumber,
                network: r.network,
                requestedAt: r.requestedAt,
                processedAt: r.processedAt || null,
            }));

        res.json({
            balance: Number(user?.walletBalance || 0),
            referralEarnings: Number(user?.referralEarnings || 0),
            referralCode: user?.referralCode || '',
            referralRatePercent: wallet.REFERRAL_RATE * 100,
            minReferralWithdrawal: wallet.MIN_REFERRAL_WITHDRAWAL,
            minWalletWithdrawal: wallet.MIN_WALLET_WITHDRAWAL,
            momoDetails: user?.momoDetails || null,
            currency: 'GHS',
            withdrawals: requests,
            hasPendingWithdrawal: requests.some((r) => r.status === 'pending'),
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
    body('amount').isFloat({ min: 1, max: 20000 }).toFloat(),
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
            // Never hand out free balance on a live server just because the provider is not set up.
            if (!allowSimulatedPayments()) {
                payment.status = 'failed';
                await payment.save();
                return res.status(503).json({ message: 'Wallet top-up is not available right now.' });
            }
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

/** Withdraw from the wallet to mobile money. An admin sends the money and marks it done. */
router.post('/withdraw', auth, [
    body('amount').isFloat({ min: 1 }).toFloat(),
    body('momoNumber').matches(/^0\d{9}$/),
    body('network').isIn(['MTN', 'Vodafone', 'AirtelTigo']),
    handleValidationErrors,
], async (req, res) => {
    try {
        const result = await wallet.requestWithdrawal({
            userId: req.user._id,
            source: 'wallet',
            amount: req.body.amount,
            momoNumber: req.body.momoNumber,
            network: req.body.network,
        });
        res.json({
            success: true,
            balance: result.walletBalance,
            message: 'Withdrawal request submitted',
            withdrawal: { amount: result.request.amount, status: 'pending' },
        });
    } catch (error) {
        res.status(error.status || 500).json({
            message: error.status ? error.message : 'Withdrawal failed',
            ...(error.currentBalance != null ? { balance: error.currentBalance } : {}),
        });
    }
});

module.exports = router;
