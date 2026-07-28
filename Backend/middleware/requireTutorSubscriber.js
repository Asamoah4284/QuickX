const {
  hasActiveSubscription,
  hasSubscriptionFeature,
  getActiveSubscription,
  getPlanFeatures,
  FEATURES,
} = require('../services/tutorSubscriptionService');

/**
 * Requires auth. Resolves tutorId from req.params.tutorId | req.params.userId | req.body.tutorId.
 * Allows: the tutor themselves, active subscribers (any plan with videos), or platform admins.
 * Attaches req.subscriptionPlanId + req.subscriptionFeatures when subscribed.
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
      req.subscriptionFeatures = Object.values(FEATURES);
      return next();
    }

    if (String(req.user._id) === String(tutorId)) {
      req.isCommunityTutor = true;
      req.isCommunityAdmin = false;
      req.subscriptionFeatures = Object.values(FEATURES);
      return next();
    }

    const sub = await getActiveSubscription(req.user._id, tutorId);
    if (!sub) {
      return res.status(403).json({
        message: 'Active subscription required to access this community',
        code: 'SUBSCRIPTION_REQUIRED',
      });
    }

    req.isCommunityTutor = false;
    req.isCommunityAdmin = false;
    req.subscriptionPlanId = sub.planId;
    req.subscriptionFeatures = getPlanFeatures(sub.planId);
    return next();
  } catch (err) {
    console.error('requireTutorSubscriber:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
}

/**
 * After requireTutorSubscriber — require a specific plan feature (e.g. community, ask).
 * Tutors and admins always pass.
 */
function requireTutorFeature(feature) {
  return async (req, res, next) => {
    try {
      if (req.isCommunityTutor || req.isCommunityAdmin) return next();

      const features = req.subscriptionFeatures;
      if (Array.isArray(features) && features.includes(feature)) return next();

      const tutorId = req.communityTutorId || req.params.tutorId;
      const ok = await hasSubscriptionFeature(req.user._id, tutorId, feature);
      if (!ok) {
        return res.status(403).json({
          message: `Your plan does not include this feature. Upgrade to unlock ${feature}.`,
          code: 'FEATURE_REQUIRED',
          feature,
        });
      }
      return next();
    } catch (err) {
      console.error('requireTutorFeature:', err);
      return res.status(500).json({ message: 'Server error', error: err.message });
    }
  };
}

/** Community hub entry — Premium and above (not Basic). */
const requireCommunityAccess = requireTutorFeature(FEATURES.COMMUNITY);

/** Tutor (owner) or admin only — for moderation / announcements / polls create. */
function requireCommunityModerator(req, res, next) {
  if (req.isCommunityTutor || req.isCommunityAdmin) return next();
  return res.status(403).json({ message: 'Only the tutor can perform this action' });
}

module.exports = {
  requireTutorSubscriber,
  requireTutorFeature,
  requireCommunityAccess,
  requireCommunityModerator,
  FEATURES,
  hasActiveSubscription,
};
