const express = require('express');
const router = express.Router();
const mentorshipController = require('../controllers/mentorshipController');
const adminAuth = require('../middleware/adminAuth');

// Public: Get all mentorship sessions
router.get('/', mentorshipController.getMentorships);

// Admin: Create a new mentorship session
router.post('/', adminAuth, mentorshipController.createMentorship);

module.exports = router; 