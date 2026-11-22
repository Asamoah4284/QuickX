const { FEATURES } = require('../constants/creatorSubscriptionPlans');
const { toLegacyFeatureNames } = require('../constants/features');
const { getUserFeatures } = require('../services/entitlementService');
const { isOwner } = require('../services/ownerService');
const { hasActiveSubscription } = require('../services/tutorSubscriptionService');

/**
 * Gate for the community routes. The community is free: every signed-in account
 * gets in. Rooms and messages that need a plan check that themselves.
 *
 * Sets req.isCommunityTutor (the owner), req.isCommunityAdmin (platform admins)
 * and req.subscriptionFeatures (old-style names, read by requireTutorFeature).
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

    if (String(req.user._id) === String(tutorId) || (await isOwner(req.user._id))) {
      req.isCommunityTutor = true;
      req.isCommunityAdmin = false;
      req.subscriptionFeatures = Object.values(FEATURES);
      return next();
    }

    // The community is free, so everyone signed in gets the community names too.
    const features = await getUserFeatures(req.user._id);
    req.isCommunityTutor = false;
    req.isCommunityAdmin = false;
    req.subscriptionFeatures = toLegacyFeatureNames([...new Set([...features, 'community'])]);
    return next();
  } catch (err) {
    console.error('requireTutorSubscriber:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
}

/** After requireTutorSubscriber, require one old-style feature name. Owner and admins always pass. */
function requireTutorFeature(feature) {
  return (req, res, next) => {
    if (req.isCommunityTutor || req.isCommunityAdmin) return next();
    const features = req.subscriptionFeatures;
    if (Array.isArray(features) && features.includes(feature)) return next();
    return res.status(403).json({
      message: 'Your access does not include this feature.',
      code: 'FEATURE_REQUIRED',
      feature,
    });
  };
}

const requireCommunityAccess = requireTutorFeature(FEATURES.COMMUNITY);

/** Owner or admin only, moderation, announcements, creating polls. */
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
