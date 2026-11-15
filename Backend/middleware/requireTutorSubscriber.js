const { FEATURES } = require('../constants/creatorSubscriptionPlans');
const { toLegacyFeatureNames } = require('../constants/features');
const { getUserFeatures } = require('../services/entitlementService');
const { isOwner } = require('../services/ownerService');
const { hasActiveSubscription } = require('../services/tutorSubscriptionService');

/**
 * Gate for the community routes. Access comes from entitlements; the feature
 * names placed on `req.subscriptionFeatures` are the old ones (community, ask,
 * post_trade, …) because the community routes still check those.
 *
 * Passes: platform admins, the owner, and members with any active access.
 * Follow with requireCommunityAccess / requireTutorFeature for a specific feature.
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

    const features = await getUserFeatures(req.user._id);
    if (!features.length) {
      return res.status(403).json({
        message: 'Community access is required',
        code: 'SUBSCRIPTION_REQUIRED',
      });
    }

    req.isCommunityTutor = false;
    req.isCommunityAdmin = false;
    req.subscriptionFeatures = toLegacyFeatureNames(features);
    return next();
  } catch (err) {
    console.error('requireTutorSubscriber:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
}

/** After requireTutorSubscriber — require one old-style feature name. Owner and admins always pass. */
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

/** Owner or admin only — moderation, announcements, creating polls. */
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
