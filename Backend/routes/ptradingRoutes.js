const express = require('express');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Admin = require('../models/Admin');
const { isOwner } = require('../services/ownerService');
const ptrading = require('../controllers/ptradingController');

const router = express.Router();

/**
 * Reads whichever token is sent (member or admin) and sets
 * req.user / req.isOwner (Maxwell's member account) or req.admin / req.isAdmin.
 * Carries on signed-out for public pages.
 */
async function identify(req, res, next) {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) return next();
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.id && !decoded.userId) {
            const admin = await Admin.findById(decoded.id).select('-password');
            if (admin) {
                req.admin = admin;
                req.isAdmin = true;
                return next();
            }
        }
        if (decoded.userId) {
            const user = await User.findById(decoded.userId).select('-password');
            if (user) {
                req.user = user;
                req.userId = user._id;
                req.isOwner = await isOwner(user._id);
            }
        }
    } catch {
        // Expired or bad token: treat as signed out.
    }
    next();
}

function requireSignedIn(req, res, next) {
    if (req.user || req.admin) return next();
    return res.status(401).json({ message: 'Please sign in' });
}

router.get('/', identify, ptrading.listPies);
router.get('/my-slices', auth, ptrading.getMySlices);
router.get('/:id', identify, ptrading.getPieDetails);

router.post('/', identify, requireSignedIn, ptrading.createPie);
router.post('/:id/deposit', auth, ptrading.depositSlice);
router.post('/:id/start-trading', identify, requireSignedIn, ptrading.startTrading);
router.post('/:id/trade-updates', identify, requireSignedIn, ptrading.addTradeUpdate);
router.post('/:id/settle', identify, requireSignedIn, ptrading.settlePie);
router.post('/:id/cancel', identify, requireSignedIn, ptrading.cancelPie);

module.exports = router;
