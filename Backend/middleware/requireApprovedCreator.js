function requireApprovedCreator(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    if (req.user.creatorStatus === 'suspended') {
        return res.status(403).json({ message: 'Creator access is suspended' });
    }

    if (req.user.creatorStatus !== 'approved' || req.user.role !== 'tutor') {
        return res.status(403).json({
            message: 'Only approved creators can access this area',
            creatorStatus: req.user.creatorStatus || 'not_applied'
        });
    }

    next();
}

module.exports = requireApprovedCreator;
