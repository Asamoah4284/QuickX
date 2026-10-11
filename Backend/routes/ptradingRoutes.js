const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Admin = require('../models/Admin');
const ptradingController = require('../controllers/ptradingController');

/**
 * Optional user auth helper: Extracts user if token is present, continues otherwise.
 */
const optionalUserAuth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token || token === 'local') return next();

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Check Admin model
        if (decoded.id) {
            const admin = await Admin.findById(decoded.id).select('-password');
            if (admin) {
                req.admin = admin;
                req.isAdmin = true;
            }
        }

        // Check User model
        const userId = decoded.userId || decoded.id;
        if (userId && !req.admin) {
            const user = await User.findById(userId).select('-password');
            if (user) {
                req.user = user;
                req.userId = user._id;
            }
        }
        next();
    } catch {
        // Continue unauthenticated on expired or invalid tokens
        next();
    }
};

// Public / Optional Auth Routes
router.get('/', optionalUserAuth, ptradingController.listPies);
router.get('/my-slices', auth, ptradingController.getMySlices);
router.get('/:id', optionalUserAuth, ptradingController.getPieDetails);

// Protected Routes
router.post('/', auth, ptradingController.createPie);
router.post('/:id/deposit', auth, ptradingController.depositSlice);
router.post('/:id/start-trading', auth, ptradingController.startTrading);
router.post('/:id/trade-updates', auth, ptradingController.addTradeUpdate);
router.post('/:id/settle', auth, ptradingController.settlePie);
router.post('/:id/cancel', auth, ptradingController.cancelPie);

module.exports = router;
