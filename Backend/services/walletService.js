/**
 * All money that moves between QuickX balances goes through here:
 * the wallet balance, referral earnings, and withdrawal requests.
 *
 * Rules this file enforces:
 *  - A balance can never go below zero, even if two requests arrive together
 *    (every debit is a single conditional database update).
 *  - Referral commission is paid once per completed payment, never for a
 *    payment that was only started.
 *  - A withdrawal takes the money out of the right balance when it is
 *    requested, and puts it back in the same balance if it is rejected.
 */
const User = require('../models/User');
const Payment = require('../models/Payment');
const WalletTransaction = require('../models/WalletTransaction');

const REFERRAL_RATE = 0.05;
const MIN_REFERRAL_WITHDRAWAL = 20;
const MIN_WALLET_WITHDRAWAL = 5;
const COMMISSIONABLE_TYPES = ['course', 'book', 'book_cart', 'book_offer', 'product'];

function round2(n) {
    return Math.round(Number(n) * 100) / 100;
}

function fail(message, status = 400, extra = {}) {
    const err = new Error(message);
    err.status = status;
    Object.assign(err, extra);
    return err;
}

/** Commission owed on an amount actually paid. (Pure — unit tested.) */
function commissionFor(amountPaid) {
    const amount = Number(amountPaid);
    if (!Number.isFinite(amount) || amount <= 0) return 0;
    return round2(amount * REFERRAL_RATE);
}

/** Which balance an older withdrawal request (saved before `source` existed) came from. */
function withdrawalSource(request) {
    if (request.source) return request.source;
    return /wallet/i.test(String(request.remarks || '')) ? 'wallet' : 'referral';
}

// ── Wallet balance ───────────────────────────────────────────────────────────

async function creditWallet(userId, amount, { type = 'deposit', label = '', reference = '', metadata = {} } = {}) {
    const value = round2(amount);
    if (!(value > 0)) throw fail('Amount must be greater than zero');
    const user = await User.findByIdAndUpdate(userId, { $inc: { walletBalance: value } }, { new: true }).select('walletBalance');
    if (!user) throw fail('User not found', 404);
    const balance = round2(user.walletBalance);
    await WalletTransaction.create({ userId, type, amount: value, balanceAfter: balance, label, reference, status: 'completed', metadata });
    return balance;
}

/** Takes `amount` out of the wallet, or throws if there is not enough. Safe under concurrent requests. */
async function debitWallet(userId, amount, { type = 'payment', label = '', reference = '', status = 'completed', metadata = {} } = {}) {
    const value = round2(amount);
    if (!(value > 0)) throw fail('Amount must be greater than zero');
    const user = await User.findOneAndUpdate(
        { _id: userId, walletBalance: { $gte: value } },
        { $inc: { walletBalance: -value } },
        { new: true }
    ).select('walletBalance');
    if (!user) {
        const current = await User.findById(userId).select('walletBalance').lean();
        throw fail('Insufficient wallet balance', 400, { code: 'INSUFFICIENT_BALANCE', balance: round2(current?.walletBalance || 0) });
    }
    const balance = round2(user.walletBalance);
    await WalletTransaction.create({ userId, type, amount: -value, balanceAfter: balance, label, reference, status, metadata });
    return balance;
}

// ── Referral commission ──────────────────────────────────────────────────────

async function findReferrer(payment) {
    const code = String(payment.referralCode || '').trim().toUpperCase();
    if (code) {
        const byCode = await User.findOne({ referralCode: code }).select('_id');
        if (byCode) return byCode;
    }
    const buyer = await User.findById(payment.userId).select('referredBy').lean();
    return buyer?.referredBy ? User.findById(buyer.referredBy).select('_id') : null;
}

/**
 * Pay the referrer their commission for a completed payment.
 * Safe to call any number of times: it only ever pays once per payment.
 */
async function creditReferralForPayment(payment) {
    if (!payment?.userId || payment.status !== 'completed') return null;
    if (!COMMISSIONABLE_TYPES.includes(payment.itemType)) return null;

    // Claim the payment first so a retry or a second request cannot pay twice.
    const claimed = await Payment.updateOne(
        { _id: payment._id, commissionCredited: { $ne: true } },
        { $set: { commissionCredited: true } }
    );
    if (!claimed.modifiedCount) return null;

    const referrer = await findReferrer(payment);
    const commission = commissionFor(payment.finalAmount ?? payment.originalAmount);
    if (!referrer || String(referrer._id) === String(payment.userId) || commission <= 0) return null;

    await User.updateOne(
        { _id: referrer._id },
        {
            $inc: { referralEarnings: commission },
            $push: {
                referralHistory: {
                    referredUser: payment.userId,
                    courseId: payment.itemType === 'course' ? payment.itemId : undefined,
                    amount: commission,
                    date: new Date(),
                },
            },
        }
    );
    await Payment.updateOne(
        { _id: payment._id },
        { $set: { commissionAmount: commission, referringUserId: referrer._id } }
    );
    return { referrerId: referrer._id, commission };
}

// ── Withdrawals ──────────────────────────────────────────────────────────────

const NO_PENDING = { withdrawalRequests: { $not: { $elemMatch: { status: 'pending' } } } };

/**
 * Ask to withdraw. `source` is 'referral' (always the full referral balance)
 * or 'wallet' (a chosen amount). The money leaves the balance now and is
 * returned if an admin rejects the request.
 */
async function requestWithdrawal({ userId, source, amount, momoNumber, network }) {
    if (!['referral', 'wallet'].includes(source)) throw fail('Unknown withdrawal source');
    if (!/^0\d{9}$/.test(String(momoNumber || ''))) throw fail('Enter a valid 10-digit mobile money number');
    if (!['MTN', 'Vodafone', 'AirtelTigo'].includes(network)) throw fail('Choose a mobile money network');

    const current = await User.findById(userId).select('referralEarnings walletBalance withdrawalRequests').lean();
    if (!current) throw fail('User not found', 404);
    if ((current.withdrawalRequests || []).some((r) => r.status === 'pending')) {
        throw fail('You already have a withdrawal being processed. Please wait for it to finish.');
    }

    const field = source === 'referral' ? 'referralEarnings' : 'walletBalance';
    const available = round2(current[field] || 0);
    const value = source === 'referral' ? available : round2(amount);
    const minimum = source === 'referral' ? MIN_REFERRAL_WITHDRAWAL : MIN_WALLET_WITHDRAWAL;

    if (!(value > 0) || value < minimum) {
        throw fail(`Minimum withdrawal is ₵${minimum}`, 400, { currentBalance: available });
    }
    if (value > available) throw fail('Insufficient balance', 400, { currentBalance: available });

    const walletRef = `qx_wd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const request = {
        amount: value,
        momoNumber,
        network,
        status: 'pending',
        requestedAt: new Date(),
        source,
        walletRef,
        remarks: source === 'wallet' ? 'QuickX Wallet withdrawal' : 'Referral earnings withdrawal',
    };

    // One conditional update: only succeeds if the money is still there and nothing is pending.
    const user = await User.findOneAndUpdate(
        { _id: userId, [field]: { $gte: value }, ...NO_PENDING },
        {
            $inc: { [field]: -value },
            $push: { withdrawalRequests: request },
            $set: { momoDetails: { momoNumber, network, lastUpdated: new Date() } },
        },
        { new: true }
    ).select('referralEarnings walletBalance withdrawalRequests');
    if (!user) throw fail('Could not create the withdrawal. Please try again.');

    if (source === 'wallet') {
        await WalletTransaction.create({
            userId,
            type: 'withdraw',
            amount: -value,
            balanceAfter: round2(user.walletBalance),
            label: 'Wallet withdrawal',
            reference: walletRef,
            status: 'pending',
        });
    }

    const saved = user.withdrawalRequests.find((r) => r.walletRef === walletRef);
    return {
        request: saved,
        referralEarnings: round2(user.referralEarnings),
        walletBalance: round2(user.walletBalance),
    };
}

/**
 * Admin decision on a pending withdrawal.
 * 'completed' — the money has been sent; nothing else changes.
 * 'rejected'  — the money goes back to the balance it came from.
 */
async function resolveWithdrawal(requestId, decision, remarks = '') {
    if (!['completed', 'rejected'].includes(decision)) throw fail('Unknown decision');

    const owner = await User.findOne({ 'withdrawalRequests._id': requestId }).select('withdrawalRequests');
    const request = owner?.withdrawalRequests.id(requestId);
    if (!request) throw fail('Withdrawal request not found', 404);
    if (request.status !== 'pending') throw fail('This withdrawal has already been processed', 409);

    const source = withdrawalSource(request);
    const field = source === 'referral' ? 'referralEarnings' : 'walletBalance';
    const update = {
        $set: {
            'withdrawalRequests.$.status': decision,
            'withdrawalRequests.$.processedAt': new Date(),
            ...(remarks ? { 'withdrawalRequests.$.remarks': String(remarks).slice(0, 300) } : {}),
        },
    };
    if (decision === 'rejected') update.$inc = { [field]: request.amount };

    // Matching on status again means two admins clicking at once cannot both win.
    const user = await User.findOneAndUpdate(
        { _id: owner._id, withdrawalRequests: { $elemMatch: { _id: requestId, status: 'pending' } } },
        update,
        { new: true }
    ).select('walletBalance referralEarnings');
    if (!user) throw fail('This withdrawal has already been processed', 409);

    if (source === 'wallet') {
        if (request.walletRef) {
            await WalletTransaction.updateOne(
                { userId: owner._id, reference: request.walletRef },
                { $set: { status: decision === 'completed' ? 'completed' : 'failed' } }
            );
        }
        if (decision === 'rejected') {
            await WalletTransaction.create({
                userId: owner._id,
                type: 'refund',
                amount: request.amount,
                balanceAfter: round2(user.walletBalance),
                label: 'Withdrawal rejected — returned to wallet',
                reference: request.walletRef || `qx_wd_refund_${requestId}`,
                status: 'completed',
            });
        }
    }
    return { userId: owner._id, source, amount: request.amount, decision };
}

async function listWithdrawals({ status = 'pending' } = {}) {
    const users = await User.find({ 'withdrawalRequests.status': status }).select('fullName email withdrawalRequests');
    const rows = [];
    for (const user of users) {
        for (const request of user.withdrawalRequests) {
            if (request.status !== status) continue;
            rows.push({
                _id: request._id,
                user: { _id: user._id, fullName: user.fullName, email: user.email },
                amount: request.amount,
                momoNumber: request.momoNumber,
                network: request.network,
                status: request.status,
                source: withdrawalSource(request),
                requestedAt: request.requestedAt,
                processedAt: request.processedAt || null,
            });
        }
    }
    return rows.sort((a, b) => new Date(a.requestedAt) - new Date(b.requestedAt));
}

module.exports = {
    REFERRAL_RATE,
    MIN_REFERRAL_WITHDRAWAL,
    MIN_WALLET_WITHDRAWAL,
    commissionFor,
    withdrawalSource,
    creditWallet,
    debitWallet,
    creditReferralForPayment,
    requestWithdrawal,
    resolveWithdrawal,
    listWithdrawals,
};
