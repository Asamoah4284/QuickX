const express = require('express');
const router = express.Router();
const Program = require('../models/Program');
const auth = require('../middleware/auth');
const ProgramEnrollment = require('../models/ProgramEnrollment');

/** Public: list active creator programs */
router.get('/', async (req, res) => {
    try {
        const programs = await Program.find({ isActive: true }).sort({ courseType: 1 });
        res.json(programs);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

/** Authenticated: my active program enrollments (before /:slug) */
router.get('/user/me', auth, async (req, res) => {
    try {
        const now = new Date();
        const enrollments = await ProgramEnrollment.find({
            userId: req.user._id,
            status: 'active',
            $or: [{ endsAt: null }, { endsAt: { $gt: now } }]
        })
            .populate('programId')
            .sort({ createdAt: -1 });

        res.json(enrollments);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

/** Public: get one by slug */
router.get('/:slug', async (req, res) => {
    try {
        const program = await Program.findOne({ slug: req.params.slug, isActive: true });
        if (!program) {
            return res.status(404).json({ message: 'Program not found' });
        }
        res.json(program);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;
