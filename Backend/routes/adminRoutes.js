const express = require('express');
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

router.delete('/courses/:id', adminController.deleteCourse);
router.get('/courses', adminController.getAllCourses);
router.get('/courses/:id', adminController.getCourseById);

// Book management routes
router.post('/books', 
    adminAuth,
    adminController.createBook
);

router.put('/books/:id', 
    adminAuth,
    adminController.updateBook
);

router.delete('/books/:id', adminController.deleteBook);
router.get('/books', adminController.getAllBooks);
router.get('/books/:id', adminController.getBookById);

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

// Get all withdrawal requests
router.get('/withdrawals', adminAuth, async (req, res) => {
    try {
        // Find all users who have pending withdrawal requests
        const users = await User.find({
            'withdrawalRequests.status': 'pending'
        });

        // Extract and format withdrawal requests
        const withdrawalRequests = [];
        users.forEach(user => {
            user.withdrawalRequests.forEach(request => {
                if (request.status === 'pending') {
                    withdrawalRequests.push({
                        _id: request._id,
                        user: {
                            _id: user._id,
                            fullName: user.fullName,
                            email: user.email
                        },
                        amount: request.amount,
                        momoNumber: request.momoNumber,
                        network: request.network,
                        status: request.status,
                        requestedAt: request.requestedAt
                    });
                }
            });
        });

        res.json(withdrawalRequests);
    } catch (error) {
        console.error('Error fetching withdrawal requests:', error);
        res.status(500).json({ message: 'Error fetching withdrawal requests' });
    }
});

// Approve withdrawal request
router.post('/withdrawals/:requestId/approve', adminAuth, async (req, res) => {
    try {
        const { requestId } = req.params;

        // Find user with the withdrawal request
        const user = await User.findOne({
            'withdrawalRequests._id': requestId
        });

        if (!user) {
            return res.status(404).json({ message: 'Withdrawal request not found' });
        }

        // Update the withdrawal request status
        const withdrawalRequest = user.withdrawalRequests.id(requestId);
        if (!withdrawalRequest) {
            return res.status(404).json({ message: 'Withdrawal request not found' });
        }

        withdrawalRequest.status = 'completed';
        withdrawalRequest.processedAt = new Date();

        // Reset referral earnings after successful withdrawal
        user.referralEarnings = 0;

        await user.save();
        res.json({ message: 'Withdrawal request approved successfully' });
    } catch (error) {
        console.error('Error approving withdrawal:', error);
        res.status(500).json({ message: 'Error approving withdrawal request' });
    }
});

// Reject withdrawal request
router.post('/withdrawals/:requestId/reject', adminAuth, async (req, res) => {
    try {
        const { requestId } = req.params;

        // Find user with the withdrawal request
        const user = await User.findOne({
            'withdrawalRequests._id': requestId
        });

        if (!user) {
            return res.status(404).json({ message: 'Withdrawal request not found' });
        }

        // Update the withdrawal request status
        const withdrawalRequest = user.withdrawalRequests.id(requestId);
        if (!withdrawalRequest) {
            return res.status(404).json({ message: 'Withdrawal request not found' });
        }

        // Add the amount back to user's referral earnings
        user.referralEarnings += withdrawalRequest.amount;

        withdrawalRequest.status = 'rejected';
        withdrawalRequest.processedAt = new Date();

        await user.save();
        res.json({ message: 'Withdrawal request rejected successfully' });
    } catch (error) {
        console.error('Error rejecting withdrawal:', error);
        res.status(500).json({ message: 'Error rejecting withdrawal request' });
    }
});

module.exports = router; 