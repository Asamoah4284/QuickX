const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireApprovedCreator = require('../middleware/requireApprovedCreator');
const {
  getActiveSubscription,
  hasCourseEnrollmentWithTutor,
  listAccessibleTutorIdsForStudent,
  listSubscribersForTutor,
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
        subscription: null,
      });
    }

    const sub = await getActiveSubscription(req.user._id, tutorId);
    const enrolled = !sub && (await hasCourseEnrollmentWithTutor(req.user._id, tutorId));
    res.json({
      subscribed: Boolean(sub) || enrolled,
      isTutor: false,
      accessType: sub ? 'subscription' : enrolled ? 'course' : null,
      subscription: sub
        ? {
            planId: sub.planId,
            startsAt: sub.startsAt,
            endsAt: sub.endsAt,
            status: sub.status,
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

/** Current user's tutor communities (subscription or course enrollment). */
router.get('/me/subscriptions', auth, async (req, res) => {
  try {
    const communities = await listAccessibleTutorIdsForStudent(req.user._id);
    res.json({
      subscriptions: communities.map((entry) => ({
        id: entry.tutorId,
        planId: entry.accessType === 'subscription' ? 'subscription' : null,
        endsAt: entry.endsAt,
        accessType: entry.accessType,
        tutor: entry.tutor,
      })),
    });
  } catch (err) {
    console.error('me/subscriptions:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
