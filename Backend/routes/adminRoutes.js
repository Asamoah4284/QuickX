const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { check } = require('express-validator');
const adminAuth = require('../middleware/adminAuth');
const { thumbnailUpload, fileUpload } = require('../config/s3Config');
const Course = require('../models/Course');

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

module.exports = router; 