const GamificationEvent = require('../models/GamificationEvent');
const { BadgeDefinition, UserBadge } = require('../models/Badge');

const XP_RULES = {
  post_created: 10,
  comment_created: 3,
  answer_created: 8,
  best_answer: 25,
  like_received: 1,
  daily_streak: 5,
  resource_upload: 5,
  poll_vote: 2,
};

const DEFAULT_BADGES = [
  { key: 'first_post', name: 'First Post', description: 'Shared your first post', xpThreshold: 10, icon: 'edit' },
  { key: 'helpful', name: 'Helpful', description: 'Earned a best answer', xpThreshold: 25, icon: 'award' },
  { key: 'contributor', name: 'Contributor', description: 'Reached 100 XP', xpThreshold: 100, icon: 'star' },
  { key: 'champion', name: 'Champion', description: 'Reached 500 XP', xpThreshold: 500, icon: 'trophy' },
];

async function ensureBadgeDefinitions() {
  for (const b of DEFAULT_BADGES) {
    await BadgeDefinition.updateOne({ key: b.key }, { $setOnInsert: b }, { upsert: true });
  }
}

async function awardXp({ userId, tutorId, type, meta = {} }) {
  const xp = XP_RULES[type] || 0;
  if (!xp || !userId || !tutorId) return null;

  const event = await GamificationEvent.create({
    userId,
    tutorId,
    type,
    xp,
    meta,
  });

  await ensureBadgeDefinitions();
  const totalXp = await getUserXp(userId, tutorId);

  if (type === 'post_created') {
    await UserBadge.updateOne(
      { userId, tutorId, badgeKey: 'first_post' },
      { $setOnInsert: { userId, tutorId, badgeKey: 'first_post', earnedAt: new Date() } },
      { upsert: true }
    );
  }
  if (type === 'best_answer') {
    await UserBadge.updateOne(
      { userId, tutorId, badgeKey: 'helpful' },
      { $setOnInsert: { userId, tutorId, badgeKey: 'helpful', earnedAt: new Date() } },
      { upsert: true }
    );
  }
  if (totalXp >= 100) {
    await UserBadge.updateOne(
      { userId, tutorId, badgeKey: 'contributor' },
      { $setOnInsert: { userId, tutorId, badgeKey: 'contributor', earnedAt: new Date() } },
      { upsert: true }
    );
  }
  if (totalXp >= 500) {
    await UserBadge.updateOne(
      { userId, tutorId, badgeKey: 'champion' },
      { $setOnInsert: { userId, tutorId, badgeKey: 'champion', earnedAt: new Date() } },
      { upsert: true }
    );
  }

  return event;
}

async function getUserXp(userId, tutorId) {
  const mongoose = require('mongoose');
  if (!mongoose.Types.ObjectId.isValid(String(userId)) || !mongoose.Types.ObjectId.isValid(String(tutorId))) {
    return 0;
  }
  const uid = new mongoose.Types.ObjectId(String(userId));
  const tid = new mongoose.Types.ObjectId(String(tutorId));
  const rows = await GamificationEvent.aggregate([
    { $match: { userId: uid, tutorId: tid } },
    { $group: { _id: null, total: { $sum: '$xp' } } },
  ]);
  return rows[0]?.total || 0;
}

async function getLeaderboard(tutorId, limit = 20) {
  const mongoose = require('mongoose');
  const tid = new mongoose.Types.ObjectId(String(tutorId));
  return GamificationEvent.aggregate([
    { $match: { tutorId: tid } },
    { $group: { _id: '$userId', xp: { $sum: '$xp' } } },
    { $sort: { xp: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: '$user' },
    {
      $project: {
        userId: '$_id',
        xp: 1,
        fullName: '$user.fullName',
        profilePicture: '$user.profilePicture',
      },
    },
  ]);
}

module.exports = {
  XP_RULES,
  awardXp,
  getUserXp,
  getLeaderboard,
  ensureBadgeDefinitions,
};
