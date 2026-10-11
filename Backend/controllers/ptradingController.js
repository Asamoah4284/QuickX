const mongoose = require('mongoose');
const TradingPie = require('../models/TradingPie');
const TradingPieDeposit = require('../models/TradingPieDeposit');
const User = require('../models/User');
const WalletTransaction = require('../models/WalletTransaction');

/**
 * List all Trading Pies with filters and platform statistics
 */
exports.listPies = async (req, res) => {
    try {
        const { status, market, tutorId, limit = 50, page = 1 } = req.query;

        const filter = {};
        if (status && status !== 'all') {
            filter.status = status;
        }
        if (market && market !== 'all') {
            filter.market = market;
        }
        if (tutorId) {
            filter.$or = [{ tutorId }, { ownerId: tutorId }];
        }

        const skip = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);

        const [pies, totalCount, statsAgg] = await Promise.all([
            TradingPie.find(filter)
                .populate('ownerId', 'fullName profilePicture role')
                .populate('tutorId', 'fullName profilePicture')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            TradingPie.countDocuments(filter),
            TradingPie.aggregate([
                {
                    $group: {
                        _id: null,
                        totalPools: { $sum: 1 },
                        totalCapitalRaised: { $sum: '$raisedAmount' },
                        totalDistributed: { $sum: '$totalDistributedAmount' },
                        winCount: {
                            $sum: { $cond: [{ $eq: ['$outcome', 'win'] }, 1, 0] }
                        },
                        settledCount: {
                            $sum: { $cond: [{ $eq: ['$status', 'settled'] }, 1, 0] }
                        }
                    }
                }
            ])
        ]);

        const stats = statsAgg[0] || {
            totalPools: 0,
            totalCapitalRaised: 0,
            totalDistributed: 0,
            winCount: 0,
            settledCount: 0,
        };

        const winRate = stats.settledCount > 0
            ? Math.round((stats.winCount / stats.settledCount) * 100)
            : 100;

        res.json({
            success: true,
            pies,
            totalCount,
            stats: {
                ...stats,
                winRate,
            }
        });
    } catch (error) {
        console.error('Error listing trading pies:', error);
        res.status(500).json({ message: 'Failed to load trading pies' });
    }
};

/**
 * Get detailed Pie with slice holders and personal investment info
 */
exports.getPieDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?._id;

        const pie = await TradingPie.findById(id)
            .populate('ownerId', 'fullName profilePicture email bio')
            .populate('tutorId', 'fullName profilePicture');

        if (!pie) {
            return res.status(404).json({ message: 'Trading pie not found' });
        }

        // Fetch deposits / slice holders
        const deposits = await TradingPieDeposit.find({ pieId: id })
            .populate('userId', 'fullName profilePicture email')
            .sort({ amount: -1 });

        let userDeposit = null;
        if (userId) {
            userDeposit = deposits.find(
                (d) => String(d.userId?._id || d.userId) === String(userId)
            ) || null;
        }

        res.json({
            success: true,
            pie,
            deposits,
            userDeposit,
            isOwner: userId ? String(pie.ownerId?._id || pie.ownerId) === String(userId) : false,
        });
    } catch (error) {
        console.error('Error fetching pie details:', error);
        res.status(500).json({ message: 'Failed to load pie details' });
    }
};

/**
 * Create a new Trading Pie (Tutor / Community Leader / Admin)
 */
exports.createPie = async (req, res) => {
    try {
        const {
            title,
            description,
            market = 'crypto',
            pair,
            targetAmount,
            minDeposit = 10,
            maxDeposit = 5000,
            targetRoiPercent = 20,
            maxLossPercent = 10,
            ownerFeePercent = 15,
            riskLevel = 'Moderate',
            fundingDeadline,
            tutorId,
        } = req.body;

        if (!title || !pair || !targetAmount) {
            return res.status(400).json({ message: 'Title, asset pair, and target amount are required' });
        }

        const numTarget = Number(targetAmount);
        if (isNaN(numTarget) || numTarget <= 0) {
            return res.status(400).json({ message: 'Target amount must be a positive number' });
        }

        const pie = await TradingPie.create({
            ownerId: req.user._id,
            tutorId: tutorId || req.user._id,
            title: title.trim(),
            description: (description || '').trim(),
            market,
            pair: pair.trim().toUpperCase(),
            targetAmount: numTarget,
            minDeposit: Number(minDeposit) || 10,
            maxDeposit: Number(maxDeposit) || Math.max(numTarget, 5000),
            targetRoiPercent: Number(targetRoiPercent) || 20,
            maxLossPercent: Number(maxLossPercent) || 10,
            ownerFeePercent: Number(ownerFeePercent) != null ? Number(ownerFeePercent) : 15,
            riskLevel: riskLevel || 'Moderate',
            fundingDeadline: fundingDeadline ? new Date(fundingDeadline) : null,
            status: 'funding',
        });

        const populated = await TradingPie.findById(pie._id)
            .populate('ownerId', 'fullName profilePicture')
            .populate('tutorId', 'fullName profilePicture');

        res.status(201).json({
            success: true,
            message: 'Trading Pie created successfully!',
            pie: populated,
        });
    } catch (error) {
        console.error('Error creating trading pie:', error);
        res.status(500).json({ message: error.message || 'Failed to create trading pie' });
    }
};

/**
 * Deposit into a Pie from QuickX Wallet to earn a slice
 */
exports.depositSlice = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id } = req.params;
        const amount = Number(req.body.amount);
        const userId = req.user._id;

        if (!amount || isNaN(amount) || amount <= 0) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: 'Please provide a valid deposit amount' });
        }

        const pie = await TradingPie.findById(id).session(session);
        if (!pie) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: 'Trading pie not found' });
        }

        if (pie.status !== 'funding') {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: 'Deposits are closed. This Pie is already trading or settled.' });
        }

        if (pie.fundingDeadline && new Date() > new Date(pie.fundingDeadline)) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: 'The funding window for this Pie has expired' });
        }

        if (amount < pie.minDeposit) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: `Minimum deposit for this Pie is GH₵${pie.minDeposit}` });
        }

        const user = await User.findById(userId).session(session);
        const walletBalance = Number(user?.walletBalance || 0);

        if (walletBalance < amount) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                message: `Insufficient wallet balance (Available: GH₵${walletBalance.toFixed(2)}). Please top up your wallet.`,
                walletBalance,
                required: amount,
            });
        }

        // Deduct from wallet
        const nextBalance = Number((walletBalance - amount).toFixed(2));
        user.walletBalance = nextBalance;
        await user.save({ session });

        // Record wallet transaction
        const ref = `qx_pie_${pie._id}_${Date.now()}`;
        await WalletTransaction.create([{
            userId,
            type: 'payment',
            amount,
            balanceAfter: nextBalance,
            label: `PTrading Slice Deposit: ${pie.title}`,
            reference: ref,
            status: 'completed',
            metadata: {
                pieId: pie._id,
                pair: pie.pair,
            },
        }], { session });

        // Update or create deposit record
        let deposit = await TradingPieDeposit.findOne({ pieId: pie._id, userId }).session(session);
        if (deposit) {
            deposit.amount = Number((deposit.amount + amount).toFixed(2));
            await deposit.save({ session });
        } else {
            deposit = await TradingPieDeposit.create([{
                pieId: pie._id,
                userId,
                amount,
                slicePercentage: 0,
                status: 'active',
            }], { session }).then((r) => r[0]);
        }

        // Update Pie raised amount
        pie.raisedAmount = Number((pie.raisedAmount + amount).toFixed(2));
        const distinctCount = await TradingPieDeposit.countDocuments({ pieId: pie._id }).session(session);
        pie.participantCount = distinctCount;
        await pie.save({ session });

        // Recalculate slice percentages for all participants
        const allDeposits = await TradingPieDeposit.find({ pieId: pie._id }).session(session);
        const totalRaised = pie.raisedAmount;

        for (const dep of allDeposits) {
            const pct = totalRaised > 0 ? Number(((dep.amount / totalRaised) * 100).toFixed(2)) : 0;
            dep.slicePercentage = pct;
            await dep.save({ session });
        }

        await session.commitTransaction();
        session.endSession();

        // Refetch updated pie & deposits
        const updatedPie = await TradingPie.findById(pie._id)
            .populate('ownerId', 'fullName profilePicture')
            .populate('tutorId', 'fullName profilePicture');

        const updatedDeposits = await TradingPieDeposit.find({ pieId: pie._id })
            .populate('userId', 'fullName profilePicture')
            .sort({ amount: -1 });

        const currentUserDeposit = updatedDeposits.find(
            (d) => String(d.userId?._id || d.userId) === String(userId)
        );

        res.json({
            success: true,
            message: `Successfully deposited GH₵${amount}! You earned a ${currentUserDeposit?.slicePercentage || 0}% slice of the Pie.`,
            pie: updatedPie,
            deposits: updatedDeposits,
            userDeposit: currentUserDeposit,
            walletBalance: nextBalance,
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error('Error depositing into pie:', error);
        res.status(500).json({ message: error.message || 'Deposit failed' });
    }
};

/**
 * Start trading phase (Owner only)
 */
exports.startTrading = async (req, res) => {
    try {
        const { id } = req.params;
        const pie = await TradingPie.findById(id);

        if (!pie) return res.status(404).json({ message: 'Trading pie not found' });
        if (String(pie.ownerId) !== String(req.user._id) && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Only the Pie owner can commence trading' });
        }

        if (pie.status !== 'funding') {
            return res.status(400).json({ message: `Cannot start trading. Current status is ${pie.status}` });
        }

        if (pie.raisedAmount <= 0) {
            return res.status(400).json({ message: 'Cannot start trading with zero deposits' });
        }

        pie.status = 'trading';
        pie.tradingStartedAt = new Date();
        await pie.save();

        res.json({
            success: true,
            message: 'Trading started! Pool is now active in market execution.',
            pie,
        });
    } catch (error) {
        console.error('Error starting trading:', error);
        res.status(500).json({ message: 'Failed to start trading' });
    }
};

/**
 * Add a live trade journal update (Owner only)
 */
exports.addTradeUpdate = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, notes, entryPrice, stopLoss, takeProfit, imageUrl } = req.body;

        const pie = await TradingPie.findById(id);
        if (!pie) return res.status(404).json({ message: 'Trading pie not found' });

        if (String(pie.ownerId) !== String(req.user._id) && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Only the Pie owner can post trade updates' });
        }

        if (!title) return res.status(400).json({ message: 'Update title is required' });

        pie.tradeUpdates.push({
            title: title.trim(),
            notes: (notes || '').trim(),
            entryPrice: (entryPrice || '').trim(),
            stopLoss: (stopLoss || '').trim(),
            takeProfit: (takeProfit || '').trim(),
            imageUrl: (imageUrl || '').trim(),
            createdAt: new Date(),
        });

        await pie.save();

        res.json({
            success: true,
            message: 'Trade update posted successfully',
            updates: pie.tradeUpdates,
        });
    } catch (error) {
        console.error('Error adding trade update:', error);
        res.status(500).json({ message: 'Failed to post trade update' });
    }
};

/**
 * Settle Pie as WIN or LOSS and distribute wallet payouts (Owner only)
 */
exports.settlePie = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id } = req.params;
        const { outcome, finalPnlPercent, settlementProof, settlementNotes } = req.body;

        const pie = await TradingPie.findById(id).session(session);
        if (!pie) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: 'Trading pie not found' });
        }

        if (String(pie.ownerId) !== String(req.user._id) && req.user.role !== 'admin') {
            await session.abortTransaction();
            session.endSession();
            return res.status(403).json({ message: 'Only the Pie owner can settle trades' });
        }

        if (pie.status !== 'trading') {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: `Cannot settle a Pie in ${pie.status} state` });
        }

        if (!['win', 'loss', 'even'].includes(outcome)) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: 'Outcome must be win, loss, or even' });
        }

        const pnlPct = Number(finalPnlPercent);
        if (isNaN(pnlPct)) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: 'Valid final PnL percentage is required' });
        }

        const totalPool = pie.raisedAmount;
        const deposits = await TradingPieDeposit.find({ pieId: pie._id, status: 'active' }).session(session);

        let grossPnlAmount = 0;
        let ownerFeeEarned = 0;
        let totalDistributedAmount = 0;

        if (outcome === 'win') {
            // Profit scenario
            const profitPct = Math.max(0, pnlPct);
            grossPnlAmount = Number(((totalPool * profitPct) / 100).toFixed(2));
            const ownerFeeRate = (pie.ownerFeePercent || 15) / 100;
            ownerFeeEarned = Number((grossPnlAmount * ownerFeeRate).toFixed(2));
            const netProfitPool = Number((grossPnlAmount - ownerFeeEarned).toFixed(2));

            // Distribute each slice: original principal + (netProfit * slicePct / 100)
            for (const dep of deposits) {
                const memberProfit = Number(((netProfitPool * dep.slicePercentage) / 100).toFixed(2));
                const memberPayout = Number((dep.amount + memberProfit).toFixed(2));

                dep.payoutAmount = memberPayout;
                dep.pnlAmount = memberProfit;
                dep.status = 'settled';

                const memberUser = await User.findById(dep.userId).session(session);
                if (memberUser) {
                    const nextBal = Number(((memberUser.walletBalance || 0) + memberPayout).toFixed(2));
                    memberUser.walletBalance = nextBal;
                    await memberUser.save({ session });

                    const ref = `qx_pie_win_${dep._id}_${Date.now()}`;
                    dep.settlementTransactionRef = ref;
                    await WalletTransaction.create([{
                        userId: dep.userId,
                        type: 'deposit',
                        amount: memberPayout,
                        balanceAfter: nextBal,
                        label: `PTrading WIN Payout: ${pie.title} (+${profitPct}% ROI)`,
                        reference: ref,
                        status: 'completed',
                        metadata: {
                            pieId: pie._id,
                            depositAmount: dep.amount,
                            profitEarned: memberProfit,
                            slicePercentage: dep.slicePercentage,
                        },
                    }], { session });
                }
                await dep.save({ session });
                totalDistributedAmount += memberPayout;
            }

            // Credit owner performance fee
            if (ownerFeeEarned > 0) {
                const owner = await User.findById(pie.ownerId).session(session);
                if (owner) {
                    const nextOwnerBal = Number(((owner.walletBalance || 0) + ownerFeeEarned).toFixed(2));
                    owner.walletBalance = nextOwnerBal;
                    await owner.save({ session });

                    await WalletTransaction.create([{
                        userId: pie.ownerId,
                        type: 'deposit',
                        amount: ownerFeeEarned,
                        balanceAfter: nextOwnerBal,
                        label: `PTrading Trader Performance Fee: ${pie.title}`,
                        reference: `qx_pie_fee_${pie._id}_${Date.now()}`,
                        status: 'completed',
                        metadata: {
                            pieId: pie._id,
                            grossPnlAmount,
                            feePercent: pie.ownerFeePercent,
                        },
                    }], { session });
                }
            }
        } else if (outcome === 'loss') {
            // Loss scenario
            const lossPct = Math.min(100, Math.abs(pnlPct));
            const lossAmount = Number(((totalPool * lossPct) / 100).toFixed(2));
            grossPnlAmount = -lossAmount;
            ownerFeeEarned = 0; // No commission on loss
            const remainingPool = Math.max(0, Number((totalPool - lossAmount).toFixed(2)));

            // Distribute remaining capital by slice percentage
            for (const dep of deposits) {
                const memberReturn = Number(((remainingPool * dep.slicePercentage) / 100).toFixed(2));
                const memberLoss = Number((dep.amount - memberReturn).toFixed(2));

                dep.payoutAmount = memberReturn;
                dep.pnlAmount = -memberLoss;
                dep.status = 'settled';

                const memberUser = await User.findById(dep.userId).session(session);
                if (memberUser && memberReturn > 0) {
                    const nextBal = Number(((memberUser.walletBalance || 0) + memberReturn).toFixed(2));
                    memberUser.walletBalance = nextBal;
                    await memberUser.save({ session });

                    const ref = `qx_pie_loss_${dep._id}_${Date.now()}`;
                    dep.settlementTransactionRef = ref;
                    await WalletTransaction.create([{
                        userId: dep.userId,
                        type: 'deposit',
                        amount: memberReturn,
                        balanceAfter: nextBal,
                        label: `PTrading Settlement: ${pie.title} (-${lossPct}% Stop Loss)`,
                        reference: ref,
                        status: 'completed',
                        metadata: {
                            pieId: pie._id,
                            depositAmount: dep.amount,
                            lossIncurred: memberLoss,
                            slicePercentage: dep.slicePercentage,
                        },
                    }], { session });
                }
                await dep.save({ session });
                totalDistributedAmount += memberReturn;
            }
        } else {
            // Even / Breakeven scenario (0% change)
            grossPnlAmount = 0;
            ownerFeeEarned = 0;
            for (const dep of deposits) {
                dep.payoutAmount = dep.amount;
                dep.pnlAmount = 0;
                dep.status = 'settled';

                const memberUser = await User.findById(dep.userId).session(session);
                if (memberUser) {
                    const nextBal = Number(((memberUser.walletBalance || 0) + dep.amount).toFixed(2));
                    memberUser.walletBalance = nextBal;
                    await memberUser.save({ session });

                    await WalletTransaction.create([{
                        userId: dep.userId,
                        type: 'deposit',
                        amount: dep.amount,
                        balanceAfter: nextBal,
                        label: `PTrading Breakeven Return: ${pie.title}`,
                        reference: `qx_pie_even_${dep._id}_${Date.now()}`,
                        status: 'completed',
                    }], { session });
                }
                await dep.save({ session });
                totalDistributedAmount += dep.amount;
            }
        }

        // Finalize Pie
        pie.status = 'settled';
        pie.outcome = outcome;
        pie.finalPnlPercent = pnlPct;
        pie.grossPnlAmount = grossPnlAmount;
        pie.ownerFeeEarned = ownerFeeEarned;
        pie.totalDistributedAmount = Number(totalDistributedAmount.toFixed(2));
        pie.settlementProof = settlementProof || '';
        pie.settlementNotes = settlementNotes || '';
        pie.settledAt = new Date();
        await pie.save({ session });

        await session.commitTransaction();
        session.endSession();

        const updated = await TradingPie.findById(pie._id)
            .populate('ownerId', 'fullName profilePicture')
            .populate('tutorId', 'fullName profilePicture');

        res.json({
            success: true,
            message: `Trade settled as ${outcome.toUpperCase()} (${pnlPct > 0 ? '+' : ''}${pnlPct}%). All member wallets have been credited!`,
            pie: updated,
            settlement: {
                outcome,
                grossPnlAmount,
                ownerFeeEarned,
                totalDistributedAmount,
            }
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error('Error settling trading pie:', error);
        res.status(500).json({ message: error.message || 'Settlement failed' });
    }
};

/**
 * Cancel Pie & refund 100% of deposits back to participants' wallets (Owner/Admin)
 */
exports.cancelPie = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id } = req.params;
        const { reason } = req.body;

        const pie = await TradingPie.findById(id).session(session);
        if (!pie) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: 'Trading pie not found' });
        }

        if (String(pie.ownerId) !== String(req.user._id) && req.user.role !== 'admin') {
            await session.abortTransaction();
            session.endSession();
            return res.status(403).json({ message: 'Only owner or admin can cancel a Pie' });
        }

        if (pie.status === 'settled') {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: 'Cannot cancel an already settled Pie' });
        }

        const deposits = await TradingPieDeposit.find({ pieId: pie._id, status: 'active' }).session(session);

        // Refund all deposits
        for (const dep of deposits) {
            dep.status = 'refunded';
            dep.payoutAmount = dep.amount;
            dep.pnlAmount = 0;

            const memberUser = await User.findById(dep.userId).session(session);
            if (memberUser) {
                const nextBal = Number(((memberUser.walletBalance || 0) + dep.amount).toFixed(2));
                memberUser.walletBalance = nextBal;
                await memberUser.save({ session });

                await WalletTransaction.create([{
                    userId: dep.userId,
                    type: 'refund',
                    amount: dep.amount,
                    balanceAfter: nextBal,
                    label: `PTrading Full Refund: ${pie.title}`,
                    reference: `qx_pie_rfnd_${dep._id}_${Date.now()}`,
                    status: 'completed',
                    metadata: { pieId: pie._id, reason },
                }], { session });
            }
            await dep.save({ session });
        }

        pie.status = 'cancelled';
        pie.settlementNotes = reason || 'Cancelled by owner';
        await pie.save({ session });

        await session.commitTransaction();
        session.endSession();

        res.json({
            success: true,
            message: 'Pie cancelled. All participant deposits have been 100% refunded to their wallets.',
            pie,
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error('Error cancelling pie:', error);
        res.status(500).json({ message: error.message || 'Cancellation failed' });
    }
};

/**
 * Get slices owned by the current logged-in user
 */
exports.getMySlices = async (req, res) => {
    try {
        const userId = req.user._id;

        const deposits = await TradingPieDeposit.find({ userId })
            .populate({
                path: 'pieId',
                populate: { path: 'ownerId', select: 'fullName profilePicture' }
            })
            .sort({ createdAt: -1 });

        const createdPies = await TradingPie.find({ ownerId: userId })
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            deposits,
            createdPies,
        });
    } catch (error) {
        console.error('Error fetching user slices:', error);
        res.status(500).json({ message: 'Failed to load your slices' });
    }
};
