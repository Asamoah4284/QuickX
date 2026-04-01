const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const auth = require('../middleware/auth');
const { requireProgramEnrollmentForBodyCourseType } = require('../middleware/requireProgramEnrollment');

function canEdit(course, userId) {
    return (
        course.source === 'user' &&
        course.createdBy &&
        course.createdBy.toString() === userId.toString()
    );
}

/** List my user-authored courses */
router.get('/', auth, async (req, res) => {
    try {
        const courses = await Course.find({ createdBy: req.user._id, source: 'user' }).sort({
            updatedAt: -1
        });
        res.json(courses);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

/** Create draft course */
router.post('/', auth, requireProgramEnrollmentForBodyCourseType, async (req, res) => {
    try {
        const {
            title,
            description,
            shortDescription,
            price,
            level,
            tags,
            courseType,
            thumbnail,
            category,
            modules
        } = req.body;

        if (!title || !description || price === undefined || !level || !courseType) {
            return res.status(400).json({
                message: 'Missing required fields',
                details: { title, description, price, level, courseType }
            });
        }

        const course = new Course({
            title,
            description,
            shortDescription: shortDescription || '',
            price: Number(price),
            level,
            tags: tags || [],
            category: category || '',
            courseType,
            thumbnail: thumbnail || '',
            modules: Array.isArray(modules) ? modules : [],
            instructor: req.user._id,
            instructorModel: 'User',
            createdBy: req.user._id,
            source: 'user',
            listingStatus: 'draft',
            isPublished: false,
            rejectionReason: ''
        });

        await course.save();
        res.status(201).json(course);
    } catch (err) {
        console.error('instructor create course:', err);
        res.status(500).json({ message: 'Error creating course', error: err.message });
    }
});

/** Get one (owner only) */
router.get('/:id', auth, async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }
        if (!canEdit(course, req.user._id)) {
            return res.status(403).json({ message: 'Access denied' });
        }
        res.json(course);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

/** Update draft or rejected */
router.patch('/:id', auth, async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }
        if (!canEdit(course, req.user._id)) {
            return res.status(403).json({ message: 'Access denied' });
        }
        if (!['draft', 'rejected'].includes(course.listingStatus)) {
            return res.status(400).json({ message: 'Only draft or rejected courses can be edited' });
        }

        const allowed = [
            'title',
            'description',
            'shortDescription',
            'price',
            'level',
            'tags',
            'thumbnail',
            'category',
            'modules',
            'courseType'
        ];
        const updates = {};
        for (const key of allowed) {
            if (req.body[key] !== undefined) updates[key] = req.body[key];
        }
        if (updates.price !== undefined) updates.price = Number(updates.price);
        if (course.listingStatus === 'rejected') {
            updates.listingStatus = 'draft';
            updates.rejectionReason = '';
        }

        Object.assign(course, updates);
        await course.save();
        res.json(course);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

/** Submit for admin review */
router.post('/:id/submit', auth, async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }
        if (!canEdit(course, req.user._id)) {
            return res.status(403).json({ message: 'Access denied' });
        }
        if (course.listingStatus !== 'draft' && course.listingStatus !== 'rejected') {
            return res.status(400).json({ message: 'Course cannot be submitted from current status' });
        }

        course.listingStatus = 'pending_review';
        await course.save();
        res.json({ message: 'Submitted for review', course });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;
