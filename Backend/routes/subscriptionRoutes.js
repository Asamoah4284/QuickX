const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireApprovedCreator = require('../middleware/requireApprovedCreator');
const {
  getActiveSubscription,
  listActiveSubscriptionsForStudent,
  listSubscribersForTutor,
  getPlanFeatures,
} = require('../services/tutorSubscriptionService');
const User = require('../models/User');

/** Current user's subscription status for a tutor (auth required). */
router.get('/instructors/:tutorId/subscription/me', auth, async (req, res) => {
  try {
    const { tutorId } = req.params;
    const isSelf = String(req.user._id) === String(tutorId);
    if (isSelf) {
      return res.json({
        subscribed: true,
        isTutor: true,
        features: ['videos', 'community', 'download', 'ask', 'post_trade', 'signals', 'mentored'],
        canAccessCommunity: true,
        subscription: null,
      });
    }

    const sub = await getActiveSubscription(req.user._id, tutorId);
    const features = sub ? getPlanFeatures(sub.planId) : [];
    res.json({
      subscribed: Boolean(sub),
      isTutor: false,
      accessType: sub ? 'subscription' : null,
      features,
      canAccessCommunity: features.includes('community'),
      subscription: sub
        ? {
            planId: sub.planId,
            startsAt: sub.startsAt,
            endsAt: sub.endsAt,
            status: sub.status,
            features,
          }
        : null,
    });
  } catch (err) {
    console.error('subscription/me:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/** Creator: list active subscribers */
router.get('/instructor/subscribers', auth, requireApprovedCreator, async (req, res) => {
  try {
    const rows = await listSubscribersForTutor(req.user._id);
    res.json({
      subscribers: rows.map((s) => ({
        id: s._id,
        planId: s.planId,
        startsAt: s.startsAt,
        endsAt: s.endsAt,
        student: s.studentId
          ? {
              id: s.studentId._id,
              fullName: s.studentId.fullName,
              email: s.studentId.email,
              profilePicture: s.studentId.profilePicture,
            }
          : null,
      })),
    });
  } catch (err) {
    console.error('instructor/subscribers:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/** Public-ish: member count for a tutor community */
router.get('/instructors/:tutorId/community/stats', async (req, res) => {
  try {
    const TutorSubscription = require('../models/TutorSubscription');
    const now = new Date();
    const count = await TutorSubscription.countDocuments({
      tutorId: req.params.tutorId,
      status: 'active',
      endsAt: { $gt: now },
    });
    const tutor = await User.findById(req.params.tutorId).select('fullName profilePicture');
    res.json({
      memberCount: count,
      tutor: tutor
        ? { id: tutor._id, fullName: tutor.fullName, profilePicture: tutor.profilePicture }
        : null,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/** Current user's active tutor subscriptions (community access). */
router.get('/me/subscriptions', auth, async (req, res) => {
  try {
    const rows = await listActiveSubscriptionsForStudent(req.user._id);
    res.json({
      subscriptions: rows.map((s) => ({
        id: s._id,
        planId: s.planId,
        endsAt: s.endsAt,
        accessType: 'subscription',
        tutor: s.tutorId
          ? {
              id: s.tutorId._id,
              fullName: s.tutorId.fullName,
              profilePicture: s.tutorId.profilePicture,
            }
          : null,
      })),
    });
  } catch (err) {
    console.error('me/subscriptions:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
