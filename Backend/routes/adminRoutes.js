const express = require('express');
const walletService = require('../services/walletService');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { check } = require('express-validator');
const adminAuth = require('../middleware/adminAuth');
const { thumbnailUpload, fileUpload } = require('../config/s3Config');
const Course = require('../models/Course');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Admin login route
router.post('/login', [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists()
], adminController.login);

// Upload thumbnail route
router.post('/upload-thumbnail', 
    adminAuth,
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ message: 'No thumbnail file uploaded' });
            }
            res.status(200).json({ 
                thumbnail: req.file.location,
                key: req.file.key
            });
        } catch (error) {
            console.error('Error uploading thumbnail:', error);
            res.status(500).json({ 
                message: 'Error uploading thumbnail', 
                error: error.message 
            });
        }
    }
);

// Course management routes
router.post('/courses', 
    adminAuth,
    adminController.createCourse
);

router.put('/courses/:id', 
    adminAuth,
    adminController.updateCourse
);

router.delete('/courses/:id', adminAuth, adminController.deleteCourse);
router.get('/courses', adminAuth, adminController.getAllCourses);
router.get('/courses/:id', adminAuth, adminController.getCourseById);

// Book management routes
router.post('/books', 
    adminAuth,
    adminController.createBook
);

router.put('/books/:id', 
    adminAuth,
    adminController.updateBook
);

router.delete('/books/:id', adminAuth, adminController.deleteBook);
router.get('/books', adminAuth, adminController.getAllBooks);
router.get('/books/:id', adminAuth, adminController.getBookById);
router.patch('/books/:id/status', adminAuth, adminController.updateBookStatus);

// Display currency and exchange rate
router.get('/settings', adminAuth, adminController.getDisplaySettings);
router.put('/settings', adminAuth, adminController.updateDisplaySettings);

// Content upload route
router.post('/upload-content', (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        
        res.status(200).json({
            message: 'Content uploaded successfully',
            url: req.file.location,
            key: req.file.key
        });
    } catch (error) {
        console.error('Content upload error:', error);
        res.status(500).json({ message: 'Content upload failed', error: error.message });
    }
});

/**
 * One login for the mentor: an admin can open the Studio (course and book
 * authoring) as the owner account without knowing that account's password.
 */
router.post('/owner-session', adminAuth, async (req, res) => {
    try {
        const jwt = require('jsonwebtoken');
        const { getOwnerId } = require('../services/ownerService');
        const { serializeUser } = require('../utils/serializeUser');
        const ownerId = await getOwnerId();
        if (!ownerId) {
            return res.status(404).json({ message: 'No owner account is set. Set OWNER_USER_ID on the server.' });
        }
        const owner = await User.findById(ownerId).select('-password');
        if (!owner) return res.status(404).json({ message: 'Owner account not found' });

        const token = jwt.sign(
            { userId: owner._id, role: owner.role || 'tutor', creatorStatus: owner.creatorStatus || 'approved' },
            process.env.JWT_SECRET,
            { expiresIn: '12h' }
        );
        console.log(`[admin] ${req.admin.email} opened a Studio session as owner ${owner._id}`);
        res.json({ token, user: serializeUser(owner) });
    } catch (error) {
        console.error('owner-session:', error);
        res.status(500).json({ message: 'Could not open the Studio' });
    }
});

// Withdrawal requests (referral earnings and wallet). ?status=pending|completed|rejected
router.get('/withdrawals', adminAuth, async (req, res) => {
    try {
        const status = ['pending', 'completed', 'rejected'].includes(req.query.status) ? req.query.status : 'pending';
        res.json(await walletService.listWithdrawals({ status }));
    } catch (error) {
        console.error('Error fetching withdrawal requests:', error);
        res.status(500).json({ message: 'Error fetching withdrawal requests' });
    }
});

/** Mark as paid: the money was already taken from the member's balance when they asked. */
router.post('/withdrawals/:requestId/approve', adminAuth, async (req, res) => {
    try {
        await walletService.resolveWithdrawal(req.params.requestId, 'completed', req.body?.remarks);
        res.json({ message: 'Withdrawal marked as paid' });
    } catch (error) {
        if (!error.status) console.error('Error approving withdrawal:', error);
        res.status(error.status || 500).json({ message: error.status ? error.message : 'Error approving withdrawal request' });
    }
});

/** Reject: the amount goes back to the balance it came from. */
router.post('/withdrawals/:requestId/reject', adminAuth, async (req, res) => {
    try {
        await walletService.resolveWithdrawal(req.params.requestId, 'rejected', req.body?.remarks);
        res.json({ message: 'Withdrawal rejected and the amount returned to the member' });
    } catch (error) {
        if (!error.status) console.error('Error rejecting withdrawal:', error);
        res.status(error.status || 500).json({ message: error.status ? error.message : 'Error rejecting withdrawal request' });
    }
});

module.exports = router; 