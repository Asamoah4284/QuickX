/**
 * Deleting a member's account, as Google Play and the App Store require.
 *
 * What goes: the account itself (name, email, phone, photo, password, Mobile Money details),
 * plans, course progress, phone and browser push registrations, notifications, private chats,
 * community posts and questions, likes, votes and course reviews. Comments and answers on
 * other people's posts are removed too.
 *
 * What stays, without the person's details: payment and wallet records, tickets and Pie
 * deposits. They are needed for accounting and refunds, and point to an account that no
 * longer exists.
 */
const mongoose = require('mongoose');

/** Load a model by its file name (models/<Name>.js) so this works outside the server too. */
const model = (name) => {
    require(`../models/${name}`);
    return mongoose.model(name);
};

/**
 * Why the account cannot be deleted yet. Pure, so it is easy to test.
 * `balance` is wallet balance plus referral earnings.
 */
function blockersFor({ isOwner, pendingWithdrawal, activePieCount, balance, acceptLoss }) {
    const list = [];
    if (isOwner) {
        list.push({ code: 'OWNER', message: 'This is the site owner account. Move ownership to another account before deleting it.' });
    }
    if (pendingWithdrawal) {
        list.push({ code: 'PENDING_WITHDRAWAL', message: 'You have a withdrawal being processed. Wait until it is paid, then delete your account.' });
    }
    if (activePieCount > 0) {
        list.push({
            code: 'ACTIVE_PIE',
            message: 'You have money in a Pie that has not finished. Wait until it pays out to your wallet, withdraw it, then delete your account.',
        });
    }
    if (balance > 0 && !acceptLoss) {
        list.push({
            code: 'HAS_BALANCE',
            message: `You still have GH₵${balance.toFixed(2)} in your wallet and referral earnings. Withdraw it first, or confirm you want to give it up.`,
            amount: Number(balance.toFixed(2)),
        });
    }
    return list;
}

/** Everything the app needs to show before asking "Are you sure?". */
async function deletionCheck(userId, { acceptLoss = false } = {}) {
    const { isOwner } = require('./ownerService');
    const user = await model('User').findById(userId).select('walletBalance referralEarnings withdrawalRequests').lean();
    if (!user) return { exists: false, blockers: [] };
    const [owner, activePieCount] = await Promise.all([
        isOwner(userId),
        model('TradingPieDeposit').countDocuments({ userId, status: 'active' }),
    ]);
    const balance = Number(user.walletBalance || 0) + Number(user.referralEarnings || 0);
    const pendingWithdrawal = (user.withdrawalRequests || []).some((r) => r.status === 'pending');
    return {
        exists: true,
        balance: Number(balance.toFixed(2)),
        blockers: blockersFor({ isOwner: owner, pendingWithdrawal, activePieCount, balance, acceptLoss }),
    };
}

/** Keep comment and answer counts right after removing some. */
async function recount(parentModel, childModel, parentKey, countField, parentIds) {
    for (const id of parentIds) {
        const count = await model(childModel).countDocuments({ [parentKey]: id, deletedAt: null });
        await model(parentModel).updateOne({ _id: id }, { $set: { [countField]: count } });
    }
}

/**
 * Delete the account. Returns { deleted: true } or { deleted: false, blockers }.
 * Safe to call again if it stops half way: the account itself is removed last.
 */
async function deleteAccount(userId, { acceptLoss = false } = {}) {
    const check = await deletionCheck(userId, { acceptLoss });
    if (!check.exists) return { deleted: true };
    if (check.blockers.length) return { deleted: false, blockers: check.blockers };

    const id = new mongoose.Types.ObjectId(String(userId));
    const now = new Date();

    // Their community posts and questions, with everything under them.
    const posts = await model('CommunityPost').find({ authorId: id }).distinct('_id');
    const questions = await model('CommunityQuestion').find({ authorId: id }).distinct('_id');
    await Promise.all([
        model('CommunityComment').deleteMany({ postId: { $in: posts } }),
        model('CommunityLike').deleteMany({ postId: { $in: posts } }),
        model('CommunityAnswer').deleteMany({ questionId: { $in: questions } }),
    ]);
    await Promise.all([model('CommunityPost').deleteMany({ _id: { $in: posts } }), model('CommunityQuestion').deleteMany({ _id: { $in: questions } })]);

    // Their comments and answers on other people's posts: removed the same way as when they delete one.
    const commentedPosts = await model('CommunityComment').find({ authorId: id, deletedAt: null }).distinct('postId');
    await model('CommunityComment').updateMany({ authorId: id }, { $set: { deletedAt: now, body: '' } });
    await recount('CommunityPost', 'CommunityComment', 'postId', 'commentCount', commentedPosts);
    const answeredQuestions = await model('CommunityAnswer').find({ authorId: id, deletedAt: null }).distinct('questionId');
    await model('CommunityAnswer').updateMany({ authorId: id }, { $set: { deletedAt: now, body: '' } });
    await recount('CommunityQuestion', 'CommunityAnswer', 'questionId', 'answerCount', answeredQuestions);

    // Private chats they were in.
    const chats = await model('Conversation').find({ participantIds: id }).select('_id isGroup').lean();
    const oneToOne = chats.filter((c) => !c.isGroup).map((c) => c._id);
    await model('Message').deleteMany({ $or: [{ conversationId: { $in: oneToOne } }, { senderId: id }] });
    await model('Conversation').deleteMany({ _id: { $in: oneToOne } });
    await model('Conversation').updateMany({ participantIds: id }, { $pull: { participantIds: id } });

    // Upcoming mentorship sessions are cancelled so Maxwell is not waiting for them.
    await model('Booking').updateMany({ userId: id, status: 'upcoming' }, { $set: { status: 'cancelled' } });

    const { UserBadge } = require('../models/Badge');
    await Promise.all([
        model('CommunityLike').deleteMany({ userId: id }),
        model('CommunityPollVote').deleteMany({ userId: id }),
        model('CommunityBlock').deleteMany({ userId: id }),
        model('Notification').deleteMany({ userId: id }),
        model('DeviceToken').deleteMany({ userId: id }),
        model('PushSubscription').deleteMany({ userId: id }),
        model('Entitlement').deleteMany({ userId: id }),
        model('Enrollment').deleteMany({ studentId: id }),
        model('Review').deleteMany({ studentId: id }),
        model('GamificationEvent').deleteMany({ userId: id }),
        UserBadge.deleteMany({ userId: id }),
    ]);

    // Last: the account and every personal detail on it.
    await model('User').deleteOne({ _id: id });
    return { deleted: true };
}

module.exports = { blockersFor, deletionCheck, deleteAccount };
