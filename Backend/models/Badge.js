const mongoose = require('mongoose');

const badgeDefinitionSchema = new mongoose.Schema(
  {
    key: { type: String, trim: true, required: true, unique: true },
    name: { type: String, trim: true, required: true },
    description: { type: String, trim: true, default: '' },
    icon: { type: String, trim: true, default: 'star' },
    xpThreshold: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const userBadgeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tutorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    badgeKey: { type: String, trim: true, required: true },
    earnedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

userBadgeSchema.index({ userId: 1, tutorId: 1, badgeKey: 1 }, { unique: true });

module.exports = {
  BadgeDefinition: mongoose.model('BadgeDefinition', badgeDefinitionSchema),
  UserBadge: mongoose.model('UserBadge', userBadgeSchema),
};
