const { hasFeature } = require('../services/entitlementService');
const { isFeature } = require('../constants/features');

/**
 * Use after `auth`. Lets the request through only if the user currently holds
 * `feature`. The owner always passes (handled inside hasFeature).
 */
function requireFeature(feature) {
    if (!isFeature(feature)) throw new Error(`requireFeature: unknown feature "${feature}"`);

    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({ message: 'Authentication required' });
            }
            if (req.user.role === 'admin') return next();
            if (await hasFeature(req.user._id, feature)) return next();
            return res.status(403).json({
                message: `You need ${feature} access to use this.`,
                code: 'FEATURE_REQUIRED',
                feature,
            });
        } catch (err) {
            console.error('requireFeature:', err);
            return res.status(500).json({ message: 'Server error' });
        }
    };
}

module.exports = requireFeature;
