const { isOwner } = require('../services/ownerService');

/**
 * Content tools (courses, books, offers) belong to the mentor alone.
 * Use after `auth`. The name is historical: there used to be many creators.
 */
async function requireApprovedCreator(req, res, next) {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        if (!(await isOwner(req.user._id))) {
            return res.status(403).json({ message: 'Only the mentor can access this area' });
        }
        next();
    } catch (err) {
        console.error('requireApprovedCreator:', err);
        res.status(500).json({ message: 'Server error' });
    }
}

module.exports = requireApprovedCreator;
