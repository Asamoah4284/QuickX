/**
 * Pie trading: members put wallet money into a shared pool ("Pie"), Maxwell trades it,
 * and an admin settles the result back into members' wallets.
 *
 * Safety rules:
 * - Only the owner (Maxwell) or an admin can create a Pie, start it and post trade updates.
 * - Only an admin can settle or cancel, and settling needs proof (a broker statement link).
 * - Results are capped (MAX_PROFIT_PERCENT / loss at most 100%), so a typo can't create money.
 * - Deposits can't go over the target or the per-member limit.
 * - Every wallet move is atomic and claimed first, so a retry can't pay anyone twice.
 * - Members' emails are never shown to other members.
 */
const mongoose = require('mongoose');
const TradingPie = require('../models/TradingPie');
const TradingPieDeposit = require('../models/TradingPieDeposit');
const Payment = require('../models/Payment');
const UsedPaymentReference = require('../models/UsedPaymentReference');
const { creditWallet, debitWallet } = require('../services/walletService');
const paystack = require('../services/paystackService');
const { getOwnerId } = require('../services/ownerService');

const MAX_PROFIT_PERCENT = Number(process.env.PIE_MAX_PROFIT_PERCENT) || 100;
const MARKETS = ['forex', 'commodities', 'indices', 'crypto', 'stocks'];
const RISK_LEVELS = ['Low', 'Moderate', 'High', 'Aggressive'];

const round2 = (n) => Math.round(Number(n) * 100) / 100;
const isId = (id) => mongoose.Types.ObjectId.isValid(id);

function bad(res, message, status = 400, extra = {}) {
    return res.status(status).json({ message, ...extra });
}

function canManage(req) {
    return Boolean(req.isAdmin || req.isOwner);
}

/** "Kofi Asante" -> "Kofi A." so members can see who joined without exposing anyone. */
function shortName(fullName) {
    const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'Member';
    return parts.length === 1 ? parts[0] : `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

function slicePercent(amount, raised) {
    return raised > 0 ? round2((Number(amount) / Number(raised)) * 100) : 0;
}

function publicDeposit(dep, raised, { full = false, viewerId = null } = {}) {
    const user = dep.userId && typeof dep.userId === 'object' ? dep.userId : null;
    const uid = String(user?._id || dep.userId);
    return {
        _id: dep._id,
        userId: full || uid === String(viewerId) ? uid : undefined,
        name: full ? user?.fullName || 'Member' : shortName(user?.fullName),
        profilePicture: user?.profilePicture || '',
        email: full ? user?.email || '' : undefined,
        amount: round2(dep.amount),
        slicePercentage: slicePercent(dep.amount, raised),
        status: dep.status,
        payoutAmount: round2(dep.payoutAmount || 0),
        pnlAmount: round2(dep.pnlAmount || 0),
        isYou: uid === String(viewerId),
        createdAt: dep.createdAt,
    };
}

async function loadStats() {
    const [agg] = await TradingPie.aggregate([
        {
            $group: {
                _id: null,
                totalPools: { $sum: 1 },
                totalCapitalRaised: { $sum: '$raisedAmount' },
                totalDistributed: { $sum: '$totalDistributedAmount' },
                winCount: { $sum: { $cond: [{ $eq: ['$outcome', 'win'] }, 1, 0] } },
                lossCount: { $sum: { $cond: [{ $eq: ['$outcome', 'loss'] }, 1, 0] } },
                settledCount: { $sum: { $cond: [{ $eq: ['$status', 'settled'] }, 1, 0] } },
            },
        },
    ]);
    const stats = agg || { totalPools: 0, totalCapitalRaised: 0, totalDistributed: 0, winCount: 0, lossCount: 0, settledCount: 0 };
    const decided = stats.winCount + stats.lossCount;
    // No made-up 100%: until something has settled there is no win rate.
    return { ...stats, _id: undefined, winRate: decided > 0 ? Math.round((stats.winCount / decided) * 100) : null };
}

// ── Read ─────────────────────────────────────────────────────────────────────

exports.listPies = async (req, res) => {
    try {
        const { status, market } = req.query;
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 30, 1), 100);
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);

        const filter = {};
        if (status && status !== 'all') filter.status = String(status);
        if (market && market !== 'all') filter.market = String(market);

        const [pies, totalCount, stats] = await Promise.all([
            TradingPie.find(filter)
                .populate('ownerId', 'fullName profilePicture')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            TradingPie.countDocuments(filter),
            loadStats(),
        ]);

        res.json({ success: true, pies, totalCount, stats, canManage: canManage(req) });
    } catch (error) {
        console.error('Error listing trading pies:', error);
        res.status(500).json({ message: 'Could not load the Pies' });
    }
};

exports.getPieDetails = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isId(id)) return bad(res, 'Pie not found', 404);

        const pie = await TradingPie.findById(id).populate('ownerId', 'fullName profilePicture bio').lean();
        if (!pie) return bad(res, 'Pie not found', 404);

        const manage = canManage(req);
        const viewerId = req.user?._id || null;
        const deposits = await TradingPieDeposit.find({ pieId: id })
            .populate('userId', manage ? 'fullName profilePicture email' : 'fullName profilePicture')
            .sort({ amount: -1 })
            .lean();

        const shaped = deposits.map((d) => publicDeposit(d, pie.raisedAmount, { full: manage, viewerId }));
        res.json({
            success: true,
            pie,
            deposits: shaped,
            userDeposit: shaped.find((d) => d.isYou) || null,
            isOwner: Boolean(req.isOwner),
            canManage: manage,
            canSettle: Boolean(req.isAdmin),
            maxProfitPercent: MAX_PROFIT_PERCENT,
        });
    } catch (error) {
        console.error('Error fetching pie details:', error);
        res.status(500).json({ message: 'Could not load this Pie' });
    }
};

exports.getMySlices = async (req, res) => {
    try {
        const deposits = await TradingPieDeposit.find({ userId: req.user._id })
            .populate({ path: 'pieId', populate: { path: 'ownerId', select: 'fullName profilePicture' } })
            .sort({ createdAt: -1 })
            .lean();
        res.json({
            success: true,
            deposits: deposits.map((d) => ({
                ...d,
                slicePercentage: slicePercent(d.amount, d.pieId?.raisedAmount),
            })),
        });
    } catch (error) {
        console.error('Error fetching user slices:', error);
        res.status(500).json({ message: 'Could not load your slices' });
    }
};

// ── Manage (owner or admin) ──────────────────────────────────────────────────

exports.createPie = async (req, res) => {
    try {
        if (!canManage(req)) return bad(res, 'Only Maxwell can open a Pie', 403);

        const b = req.body || {};
        const title = String(b.title || '').trim();
        const pair = String(b.pair || '').trim().toUpperCase();
        const target = round2(b.targetAmount);
        const minDeposit = round2(b.minDeposit ?? 10);
        const maxDeposit = round2(b.maxDeposit ?? target);
        const targetRoi = Number(b.targetRoiPercent ?? 20);
        const maxLoss = Number(b.maxLossPercent ?? 10);
        const fee = Number(b.ownerFeePercent ?? 15);

        if (!title || !pair) return bad(res, 'Add a title and the pair you will trade');
        if (!(target >= 10)) return bad(res, 'The target must be at least 10');
        if (!(minDeposit >= 1) || minDeposit > target) return bad(res, 'The minimum slice must be between 1 and the target');
        if (!(maxDeposit >= minDeposit) || maxDeposit > target) return bad(res, 'The maximum slice must be between the minimum and the target');
        if (!(targetRoi > 0 && targetRoi <= MAX_PROFIT_PERCENT)) return bad(res, `Target return must be between 1% and ${MAX_PROFIT_PERCENT}%`);
        if (!(maxLoss > 0 && maxLoss <= 100)) return bad(res, 'Maximum loss must be between 1% and 100%');
        if (!(fee >= 0 && fee <= 50)) return bad(res, 'Your fee must be between 0% and 50% of the profit');

        let deadline = null;
        if (b.fundingDeadline) {
            deadline = new Date(b.fundingDeadline);
            if (Number.isNaN(deadline.getTime()) || deadline <= new Date()) return bad(res, 'The deadline must be in the future');
        }

        const ownerId = req.isOwner ? req.user._id : await getOwnerId();
        if (!ownerId) return bad(res, 'No owner account is set (OWNER_USER_ID)', 500);

        const pie = await TradingPie.create({
            ownerId,
            tutorId: ownerId,
            title: title.slice(0, 120),
            description: String(b.description || '').trim().slice(0, 2000),
            market: MARKETS.includes(b.market) ? b.market : 'forex',
            pair: pair.slice(0, 20),
            targetAmount: target,
            minDeposit,
            maxDeposit,
            targetRoiPercent: targetRoi,
            maxLossPercent: maxLoss,
            ownerFeePercent: fee,
            riskLevel: RISK_LEVELS.includes(b.riskLevel) ? b.riskLevel : 'Moderate',
            fundingDeadline: deadline,
            status: 'funding',
        });

        res.status(201).json({ success: true, message: 'Pie opened. Members can now take a slice.', pie });
    } catch (error) {
        console.error('Error creating trading pie:', error);
        res.status(500).json({ message: 'Could not open the Pie' });
    }
};

exports.startTrading = async (req, res) => {
    try {
        if (!canManage(req)) return bad(res, 'Only Maxwell can start trading', 403);
        const pie = await TradingPie.findOneAndUpdate(
            { _id: req.params.id, status: 'funding', raisedAmount: { $gt: 0 } },
            { $set: { status: 'trading', tradingStartedAt: new Date() } },
            { new: true }
        );
        if (!pie) return bad(res, 'Only a Pie that is still funding and has money in it can start trading');
        res.json({ success: true, message: 'Trading started. Deposits are now closed.', pie });
    } catch (error) {
        console.error('Error starting trading:', error);
        res.status(500).json({ message: 'Could not start trading' });
    }
};

exports.addTradeUpdate = async (req, res) => {
    try {
        if (!canManage(req)) return bad(res, 'Only Maxwell can post updates', 403);
        const { title, notes, entryPrice, stopLoss, takeProfit, imageUrl } = req.body || {};
        if (!String(title || '').trim()) return bad(res, 'Give the update a title');

        const clean = (v, max = 60) => String(v || '').trim().slice(0, max);
        const image = clean(imageUrl, 500);
        if (image && !/^https:\/\//i.test(image)) return bad(res, 'Image links must start with https://');

        const pie = await TradingPie.findOneAndUpdate(
            { _id: req.params.id, status: { $in: ['funding', 'trading'] } },
            {
                $push: {
                    tradeUpdates: {
                        title: clean(title, 120),
                        notes: clean(notes, 2000),
                        entryPrice: clean(entryPrice),
                        stopLoss: clean(stopLoss),
                        takeProfit: clean(takeProfit),
                        imageUrl: image,
                        createdAt: new Date(),
                    },
                },
            },
            { new: true }
        );
        if (!pie) return bad(res, 'Updates can only be posted while a Pie is funding or trading');
        res.json({ success: true, message: 'Update posted', updates: pie.tradeUpdates });
    } catch (error) {
        console.error('Error adding trade update:', error);
        res.status(500).json({ message: 'Could not post the update' });
    }
};

// ── Members: take a slice ────────────────────────────────────────────────────

/** Why this member cannot add `amount` to this Pie right now, or null if they can. */
async function sliceProblem(pie, userId, amount) {
    if (!pie) return { message: 'Pie not found', status: 404 };
    if (String(pie.ownerId) === String(userId)) return { message: "You can't take a slice of your own Pie" };
    if (pie.status !== 'funding') return { message: 'This Pie is no longer taking slices' };
    if (pie.fundingDeadline && new Date() > new Date(pie.fundingDeadline)) return { message: 'The deadline for this Pie has passed' };
    if (amount < pie.minDeposit) return { message: `The smallest slice is GH₵${pie.minDeposit}` };

    const existing = await TradingPieDeposit.findOne({ pieId: pie._id, userId }).lean();
    const already = round2(existing?.amount || 0);
    if (already + amount > pie.maxDeposit) {
        return { message: `The most one member can put in is GH₵${pie.maxDeposit}. You can add up to GH₵${round2(pie.maxDeposit - already)} more.` };
    }
    const left = round2(pie.targetAmount - pie.raisedAmount);
    if (amount > left) return { message: left > 0 ? `Only GH₵${left} of room is left in this Pie` : 'This Pie is full' };
    return null;
}

/** Reserve room in the Pie so it can never go over the target. Returns the updated Pie or null. */
function reserveRoom(pie, amount) {
    return TradingPie.findOneAndUpdate(
        { _id: pie._id, status: 'funding', raisedAmount: { $lte: round2(pie.targetAmount - amount) } },
        { $inc: { raisedAmount: amount } },
        { new: true }
    );
}

async function recordSlice(pieId, userId, amount, method) {
    await TradingPieDeposit.updateOne(
        { pieId, userId },
        {
            $inc: { amount },
            $setOnInsert: { status: 'active', slicePercentage: 0 },
            $set: { acceptedRiskAt: new Date(), lastPaymentMethod: method },
        },
        { upsert: true }
    );
    const participantCount = await TradingPieDeposit.countDocuments({ pieId });
    await TradingPie.updateOne({ _id: pieId }, { $set: { participantCount } });
    const mine = await TradingPieDeposit.findOne({ pieId, userId }).select('amount').lean();
    return round2(mine?.amount || amount);
}

/**
 * Take a slice. Two ways to pay:
 * - `transactionId`: a Paystack payment (MoMo or card) made just before this call.
 * - no `transactionId`: taken from the QuickX wallet.
 * Send `check: true` to only check the slice is allowed (used before opening Paystack).
 */
exports.depositSlice = async (req, res) => {
    const amount = round2(req.body?.amount);
    const userId = req.user._id;
    const { id } = req.params;
    const ref = String(req.body?.transactionId || '').trim();

    try {
        if (!isId(id)) return bad(res, 'Pie not found', 404);
        if (!(amount > 0)) return bad(res, 'Enter how much you want to put in');
        if (req.body?.acceptRisk !== true) {
            return bad(res, 'Please confirm you understand you can lose some or all of this money');
        }

        const pie = await TradingPie.findById(id).lean();
        const problem = await sliceProblem(pie, userId, amount);

        if (req.body?.check === true) {
            return problem ? bad(res, problem.message, problem.status) : res.json({ ok: true });
        }

        if (ref) return await payWithPaystack({ req, res, pie, id, userId, amount, ref, problem });

        // ── Wallet ──
        if (problem) return bad(res, problem.message, problem.status);
        const claimed = await reserveRoom(pie, amount);
        if (!claimed) return bad(res, 'Someone else just filled this Pie. Try a smaller amount.');

        let balance;
        try {
            balance = await debitWallet(userId, amount, {
                type: 'payment',
                label: `Pie slice: ${pie.title}`,
                reference: `qx_pie_${id}_${userId}_${Date.now()}`,
                metadata: { pieId: id, pair: pie.pair },
            });
        } catch (err) {
            await TradingPie.updateOne({ _id: id }, { $inc: { raisedAmount: -amount } });
            if (err.code === 'INSUFFICIENT_BALANCE' || err.extra?.code === 'INSUFFICIENT_BALANCE' || /Insufficient/i.test(err.message)) {
                return bad(res, 'Not enough money in your wallet. Pay with MoMo or card instead.', 400, { code: 'INSUFFICIENT_BALANCE' });
            }
            throw err;
        }

        try {
            const total = await recordSlice(id, userId, amount, 'wallet');
            return res.json({
                success: true,
                message: `You're in with GH₵${total}. That's ${slicePercent(total, claimed.raisedAmount)}% of the Pie so far.`,
                walletBalance: balance,
            });
        } catch (err) {
            console.error(`[pie] wallet slice for user ${userId} on pie ${id} (GH₵${amount}) was charged but not recorded:`, err);
            throw err;
        }
    } catch (error) {
        console.error('Error taking a pie slice:', error);
        res.status(500).json({
            message: ref
                ? `Something went wrong after your payment. Please contact support with this reference: ${ref}`
                : 'The slice did not go through. Check your wallet history before trying again.',
        });
    }
};

async function payWithPaystack({ res, pie, id, userId, amount, ref, problem }) {
    if (!pie) return bad(res, 'Pie not found', 404);

    // Claim the reference first. The database refuses a second claim of the same payment.
    try {
        await UsedPaymentReference.create({ _id: ref, userId, purpose: 'pie_slice', itemId: id, amount });
    } catch (err) {
        if (err.code === 11000) return bad(res, 'This payment has already been used.', 409);
        throw err;
    }

    const verified = await paystack.verifyPayment(ref, amount);
    if (!verified.ok) {
        // Release the claim so the member can retry once Paystack confirms.
        await UsedPaymentReference.deleteOne({ _id: ref });
        const status = verified.code === 'UNAVAILABLE' || verified.code === 'NOT_CONFIGURED' ? 503 : 402;
        return bad(res, verified.message, status, { code: verified.code });
    }

    await Payment.create({
        userId,
        itemType: 'pie',
        itemId: id,
        originalAmount: amount,
        finalAmount: amount,
        paymentMethod: 'paystack',
        status: 'completed',
        transactionId: ref,
    });

    // The money has arrived. If the slice can't be added any more, keep the money safe in the wallet.
    const claimed = problem ? null : await reserveRoom(pie, amount);
    if (!claimed) {
        const balance = await creditWallet(userId, amount, {
            type: 'refund',
            label: `Pie slice could not be added: ${pie.title}`,
            reference: ref,
            metadata: { pieId: id },
        });
        return bad(
            res,
            `We received your GH₵${amount}, but ${problem ? problem.message.toLowerCase() : 'the Pie filled up before your payment finished'}. ` +
                'The money is in your QuickX wallet. You can use it for another Pie or withdraw it.',
            409,
            { code: 'MOVED_TO_WALLET', walletBalance: balance }
        );
    }

    const total = await recordSlice(id, userId, amount, 'paystack');
    return res.json({
        success: true,
        message: `Payment received. You're in with GH₵${total}, which is ${slicePercent(total, claimed.raisedAmount)}% of the Pie so far.`,
    });
}

// ── Admin: settle or cancel ──────────────────────────────────────────────────

/**
 * Who gets what. Members share pool + profit (minus Maxwell's fee on the profit only),
 * or what is left after a loss, in proportion to what each put in.
 */
function settlementAmounts(deposits, pnlPct, feePercent = 0) {
    const pool = round2(deposits.reduce((sum, d) => sum + Number(d.amount || 0), 0));
    const gross = round2((pool * pnlPct) / 100);
    const fee = gross > 0 ? round2((gross * (Number(feePercent) || 0)) / 100) : 0;
    const toShare = Math.max(0, round2(pool + gross - fee));
    const payouts = new Map();
    for (const dep of deposits) {
        const share = pool > 0 ? Number(dep.amount) / pool : 0;
        payouts.set(String(dep._id), { share, payout: Math.max(0, round2(toShare * share)) });
    }
    return { pool, gross, fee, toShare, payouts };
}
exports.settlementAmounts = settlementAmounts;

async function payOut(dep, amount, fields, walletOpts) {
    // Claim the deposit first: if this runs twice, the second run finds nothing to claim.
    const claimed = await TradingPieDeposit.findOneAndUpdate(
        { _id: dep._id, status: 'active' },
        { $set: fields },
        { new: true }
    );
    if (!claimed) return 0;
    if (amount > 0) await creditWallet(dep.userId, amount, walletOpts);
    return amount;
}

exports.settlePie = async (req, res) => {
    try {
        if (!req.isAdmin) return bad(res, 'Settling is done from the admin panel', 403);
        const { outcome, settlementNotes } = req.body || {};
        const proof = String(req.body?.settlementProof || '').trim();
        const pnl = Number(req.body?.finalPnlPercent);

        if (!['win', 'loss', 'even'].includes(outcome)) return bad(res, 'Choose win, loss or break-even');
        if (!/^https:\/\//i.test(proof)) return bad(res, 'Add a link (https://) to the broker statement or screenshot as proof');
        if (outcome === 'win' && !(pnl > 0 && pnl <= MAX_PROFIT_PERCENT)) return bad(res, `A win must be between 0.01% and ${MAX_PROFIT_PERCENT}%`);
        if (outcome === 'loss' && !(pnl < 0 && pnl >= -100)) return bad(res, 'A loss must be between -0.01% and -100%');

        // Lock the Pie so it can only be settled once.
        const pie = await TradingPie.findOneAndUpdate(
            { _id: req.params.id, status: 'trading' },
            { $set: { status: 'settling' } },
            { new: true }
        );
        if (!pie) return bad(res, 'Only a Pie that is trading can be settled');

        const pnlPct = outcome === 'even' ? 0 : pnl;
        const deposits = await TradingPieDeposit.find({ pieId: pie._id, status: 'active' }).lean();
        const { pool, gross, fee, payouts } = settlementAmounts(deposits, pnlPct, outcome === 'win' ? pie.ownerFeePercent : 0);

        let distributed = 0;
        for (const dep of deposits) {
            const { share, payout } = payouts.get(String(dep._id));
            distributed += await payOut(
                dep,
                payout,
                { status: 'settled', payoutAmount: payout, pnlAmount: round2(payout - dep.amount), slicePercentage: round2(share * 100) },
                {
                    type: 'deposit',
                    label: `Pie result: ${pie.title} (${pnlPct > 0 ? '+' : ''}${pnlPct}%)`,
                    reference: `qx_pie_settle_${dep._id}`,
                    metadata: { pieId: pie._id, deposited: dep.amount, outcome },
                }
            );
        }

        if (fee > 0) {
            await creditWallet(pie.ownerId, fee, {
                type: 'deposit',
                label: `Pie performance fee: ${pie.title}`,
                reference: `qx_pie_fee_${pie._id}`,
                metadata: { pieId: pie._id, gross, feePercent: pie.ownerFeePercent },
            });
        }

        const done = await TradingPie.findByIdAndUpdate(
            pie._id,
            {
                $set: {
                    status: 'settled',
                    outcome,
                    finalPnlPercent: pnlPct,
                    grossPnlAmount: gross,
                    ownerFeeEarned: fee,
                    totalDistributedAmount: round2(distributed),
                    settlementProof: proof,
                    settlementNotes: String(settlementNotes || '').trim().slice(0, 2000),
                    settledAt: new Date(),
                    settledBy: req.admin?._id,
                },
            },
            { new: true }
        );
        console.log(`[pie] ${req.admin?.email} settled ${pie._id} as ${outcome} ${pnlPct}%: paid GH₵${round2(distributed)}, fee GH₵${fee}`);

        res.json({
            success: true,
            message: `Settled as ${outcome} (${pnlPct > 0 ? '+' : ''}${pnlPct}%). GH₵${round2(distributed)} went back to members' wallets.`,
            pie: done,
            settlement: { outcome, grossPnlAmount: gross, ownerFeeEarned: fee, totalDistributedAmount: round2(distributed) },
        });
    } catch (error) {
        console.error('Error settling trading pie:', error);
        res.status(500).json({ message: 'Settling stopped part way. Open the Pie again: members already paid are not paid twice.' });
    }
};

exports.cancelPie = async (req, res) => {
    try {
        if (!req.isAdmin) return bad(res, 'Cancelling is done from the admin panel', 403);
        // Money that is already in the market can't simply be handed back, so only funding Pies can be cancelled.
        const pie = await TradingPie.findOneAndUpdate(
            { _id: req.params.id, status: { $in: ['funding', 'cancelling'] } },
            { $set: { status: 'cancelling' } },
            { new: true }
        );
        if (!pie) return bad(res, 'Only a Pie that is still funding can be cancelled. Settle a trading Pie instead.');

        const deposits = await TradingPieDeposit.find({ pieId: pie._id, status: 'active' }).lean();
        let refunded = 0;
        for (const dep of deposits) {
            refunded += await payOut(
                dep,
                round2(dep.amount),
                { status: 'refunded', payoutAmount: dep.amount, pnlAmount: 0 },
                {
                    type: 'refund',
                    label: `Pie cancelled, full refund: ${pie.title}`,
                    reference: `qx_pie_refund_${dep._id}`,
                    metadata: { pieId: pie._id },
                }
            );
        }

        const reason = String(req.body?.reason || '').trim().slice(0, 500) || 'Cancelled before trading started';
        const done = await TradingPie.findByIdAndUpdate(
            pie._id,
            { $set: { status: 'cancelled', settlementNotes: reason, totalDistributedAmount: round2(refunded) } },
            { new: true }
        );
        res.json({ success: true, message: `Pie cancelled. GH₵${round2(refunded)} was refunded in full.`, pie: done });
    } catch (error) {
        console.error('Error cancelling pie:', error);
        res.status(500).json({ message: 'Cancelling stopped part way. Try again: nobody is refunded twice.' });
    }
};
