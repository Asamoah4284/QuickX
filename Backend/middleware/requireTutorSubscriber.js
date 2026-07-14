const { hasActiveSubscription } = require('../services/tutorSubscriptionService');

/**
 * Requires auth. Resolves tutorId from req.params.tutorId | req.params.userId | req.body.tutorId.
 * Allows: the tutor themselves, active subscribers, or platform admins (role admin).
 */
async function requireTutorSubscriber(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const tutorId =
      req.params.tutorId ||
      req.params.userId ||
      req.body?.tutorId ||
      req.query?.tutorId;

    if (!tutorId) {
      return res.status(400).json({ message: 'tutorId is required' });
    }

    req.communityTutorId = String(tutorId);

    if (req.user.role === 'admin') {
      req.isCommunityTutor = false;
      req.isCommunityAdmin = true;
      return next();
    }

    if (String(req.user._id) === String(tutorId)) {
      req.isCommunityTutor = true;
      req.isCommunityAdmin = false;
      return next();
    }

    const ok = await hasActiveSubscription(req.user._id, tutorId);
    if (!ok) {
      return res.status(403).json({
        message: 'Active subscription required to access this community',
        code: 'SUBSCRIPTION_REQUIRED',
      });
    }

    req.isCommunityTutor = false;
    req.isCommunityAdmin = false;
    return next();
  } catch (err) {
    console.error('requireTutorSubscriber:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
}

/** Tutor (owner) or admin only — for moderation / announcements / polls create. */
function requireCommunityModerator(req, res, next) {
  if (req.isCommunityTutor || req.isCommunityAdmin) return next();
  return res.status(403).json({ message: 'Only the tutor can perform this action' });
}

module.exports = {
  requireTutorSubscriber,
  requireCommunityModerator,
};
