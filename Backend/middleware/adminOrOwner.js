const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const User = require('../models/User');
const { isOwner } = require('../services/ownerService');

/**
 * Lets in a website admin (admin token) or the mentor signed in with his own account
 * (user token for the owner). Used where Maxwell needs to act from the phone app, like signals.
 */
module.exports = async function adminOrOwner(req, res, next) {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'Please sign in' });

    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        const expired = error.name === 'TokenExpiredError';
        return res.status(401).json({ message: expired ? 'Your session has ended. Please sign in again.' : 'Please sign in' });
    }

    try {
        if (decoded.id) {
            const admin = await Admin.findById(decoded.id).select('-password');
            if (admin) {
                req.admin = admin;
                req.adminId = admin._id;
                return next();
            }
        }
        if (decoded.userId && (await isOwner(decoded.userId))) {
            const user = await User.findById(decoded.userId).select('-password');
            if (user) {
                req.user = user;
                req.userId = user._id;
                req.isOwner = true;
                return next();
            }
        }
        return res.status(403).json({ message: 'Only the mentor or an admin can do this' });
    } catch (error) {
        console.error('adminOrOwner:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};
