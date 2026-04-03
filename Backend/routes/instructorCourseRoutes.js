const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Review = require('../models/Review');
const Transaction = require('../models/Transaction');
const Payout = require('../models/Payout');
const PlatformSetting = require('../models/PlatformSetting');
const auth = require('../middleware/auth');
const requireApprovedCreator = require('../middleware/requireApprovedCreator');

function canEdit(course, userId) {
    return (
        course.source === 'user' &&
        course.createdBy &&
        course.createdBy.toString() === userId.toString()
    );
}

function normalizeStringArray(value) {
    if (!value) return [];
    if (Array.isArray(value)) {
        return value.map((item) => String(item || '').trim()).filter(Boolean);
    }
    return String(value)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}

function normalizeResources(resources = []) {
    if (!Array.isArray(resources)) return [];
    return resources.map((resource) => ({
        title: String(resource?.title || '').trim(),
        url: String(resource?.url || '').trim(),
        type: String(resource?.type || 'link').trim(),
        thumbnail: String(resource?.thumbnail || '').trim()
    })).filter((resource) => resource.title || resource.url);
}

function normalizeModules(modules = []) {
    if (!Array.isArray(modules)) return [];

    return modules.map((module, moduleIndex) => ({
        title: String(module?.title || `Module ${moduleIndex + 1}`).trim(),
        description: String(module?.description || '').trim(),
        price: Number(module?.price || 0),
        level: module?.level || 'beginner',
        order: Number(module?.order ?? moduleIndex + 1),
        unlocked: Boolean(module?.unlocked),
        sections: Array.isArray(module?.sections)
            ? module.sections.map((section, sectionIndex) => ({
                title: String(section?.title || `Section ${sectionIndex + 1}`).trim(),
                description: String(section?.description || '').trim(),
                order: Number(section?.order ?? sectionIndex + 1),
                lessons: Array.isArray(section?.lessons)
                    ? section.lessons.map((lesson, lessonIndex) => {
                        const type = lesson?.lessonType || lesson?.type || 'video';

                        return {
                            title: String(lesson?.title || `Lesson ${lessonIndex + 1}`).trim(),
                            type,
                            lessonType: type,
                            duration: String(lesson?.duration || ''),
                            videoUrl: String(lesson?.videoUrl || '').trim(),
                            videoKey: String(lesson?.videoKey || '').trim(),
                            videoPublicId: String(lesson?.videoPublicId || '').trim(),
                            filePath: String(lesson?.filePath || '').trim(),
                            pdfUrl: String(lesson?.pdfUrl || '').trim(),
                            textContent: String(lesson?.textContent || '').trim(),
                            resourceUrl: String(lesson?.resourceUrl || '').trim(),
                            resources: normalizeResources(lesson?.resources),
                            description: String(lesson?.description || '').trim(),
                            free: Boolean(lesson?.free || lesson?.isPreview),
                            isPreview: Boolean(lesson?.isPreview),
                            isLocked: lesson?.isLocked === undefined ? !Boolean(lesson?.isPreview) : Boolean(lesson?.isLocked),
                            order: Number(lesson?.order ?? lessonIndex + 1)
                        };
                    })
                    : []
            }))
            : []
    }));
}

function normalizeAdditionalMaterials(materials = []) {
    if (!Array.isArray(materials)) return [];
    return materials.map((material) => ({
        title: String(material?.title || '').trim(),
        type: String(material?.type || 'file').trim(),
        url: String(material?.url || '').trim(),
        thumbnail: String(material?.thumbnail || '').trim()
    })).filter((material) => material.title);
}

const DEFAULT_COURSE_DESCRIPTION =
    'Add your full course description here. You can edit anytime while the course is in draft.';

function buildCoursePayload(body = {}) {
    const modules = normalizeModules(body.modules);

    const descriptionRaw = String(body.description || body.fullDescription || '').trim();
    const titleRaw = String(body.title || '').trim();

    return {
        title: titleRaw || 'Untitled course',
        subtitle: String(body.subtitle || '').trim(),
        description: descriptionRaw || DEFAULT_COURSE_DESCRIPTION,
        shortDescription: String(body.shortDescription || '').trim(),
        category: String(body.category || '').trim(),
        subcategory: String(body.subcategory || '').trim(),
        language: String(body.language || body.primaryLanguage || 'English').trim(),
        thumbnail: String(body.thumbnail || '').trim(),
        promoVideo: String(body.promoVideo || '').trim(),
        courseType: body.courseType || body.categoryTrack || 'forex',
        level: body.level || 'beginner',
        tags: normalizeStringArray(body.tags),
        learningOutcomes: normalizeStringArray(body.learningOutcomes),
        requirements: normalizeStringArray(body.requirements),
        targetAudience: normalizeStringArray(body.targetAudience),
        skillsGained: normalizeStringArray(body.skillsGained),
        pricingType: body.pricingType || (Number(body.price || 0) > 0 ? 'paid' : 'free'),
        price: Number(body.price || 0),
        currency: String(body.currency || 'GHS').trim(),
        discountPrice: body.discountPrice === '' || body.discountPrice === null || body.discountPrice === undefined
            ? null
            : Number(body.discountPrice),
        certificateEnabled: Boolean(body.certificateEnabled),
        modules,
        additionalMaterials: normalizeAdditionalMaterials(body.additionalMaterials)
    };
}

function monthKey(date) {
    if (!date) return null;
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return null;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getLastNMonthBuckets(n = 6) {
    const buckets = [];
    const now = new Date();
    for (let i = n - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        buckets.push({
            key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
            label: d.toLocaleString('en', { month: 'short', year: '2-digit' })
        });
    }
    return buckets;
}

async function buildDashboardResponse(userId) {
    const [courses, reviews, earnings, payouts, enrollments] = await Promise.all([
        Course.find({ createdBy: userId, source: 'user' }).sort({ updatedAt: -1 }),
        Review.find({}).populate('courseId', 'createdBy'),
        Transaction.find({ tutorId: userId, status: 'completed' }),
        Payout.find({ tutorId: userId }).sort({ createdAt: -1 }).limit(10),
        Enrollment.find({}).populate('courseId', 'createdBy')
    ]);

    const myCourseIds = new Set(courses.map((course) => course._id.toString()));
    const myReviews = reviews.filter((review) => review.courseId && myCourseIds.has(review.courseId._id.toString()));
    const myEnrollments = enrollments.filter((enrollment) => enrollment.courseId && myCourseIds.has(enrollment.courseId._id.toString()));

    const totalStudents = new Set(myEnrollments.map((enrollment) => enrollment.studentId?.toString()).filter(Boolean)).size;
    const averageRating = myReviews.length > 0
        ? myReviews.reduce((sum, review) => sum + review.rating, 0) / myReviews.length
        : 0;
    const completionRate = myEnrollments.length > 0
        ? myEnrollments.reduce((sum, enrollment) => sum + Number(enrollment.progressPercent || 0), 0) / myEnrollments.length
        : 0;
    const totalRevenue = earnings.reduce((sum, transaction) => sum + Number(transaction.tutorEarning || 0), 0);

    const buckets = getLastNMonthBuckets(6);
    const revenueByMonth = buckets.map(() => 0);
    const enrollmentsByMonth = buckets.map(() => 0);

    earnings.forEach((t) => {
        const mk = monthKey(t.createdAt);
        const idx = buckets.findIndex((b) => b.key === mk);
        if (idx >= 0) revenueByMonth[idx] += Number(t.tutorEarning || 0);
    });

    myEnrollments.forEach((e) => {
        const mk = monthKey(e.enrolledAt || e.createdAt);
        const idx = buckets.findIndex((b) => b.key === mk);
        if (idx >= 0) enrollmentsByMonth[idx] += 1;
    });

    const listingStatusOrder = ['draft', 'pending_review', 'under_review', 'published', 'rejected', 'archived'];
    const listingStatusLabels = {
        draft: 'Draft',
        pending_review: 'Pending review',
        under_review: 'In review',
        published: 'Published',
        rejected: 'Rejected',
        archived: 'Archived'
    };
    const courseStatusBreakdown = listingStatusOrder.map((status) => ({
        key: status,
        label: listingStatusLabels[status] || status,
        count: courses.filter((c) => (c.listingStatus || 'published') === status).length
    }));

    return {
        stats: {
            totalCourses: courses.length,
            totalStudents,
            totalRevenue,
            averageRating: Number(averageRating.toFixed(1)),
            completionRate: Number(completionRate.toFixed(1)),
            pendingReviews: courses.filter((course) => ['under_review', 'pending_review'].includes(course.listingStatus)).length
        },
        charts: {
            labels: buckets.map((b) => b.label),
            revenue: revenueByMonth,
            enrollments: enrollmentsByMonth,
            courseStatus: courseStatusBreakdown
        },
        recentCourses: courses.slice(0, 5),
        recentPayouts: payouts
    };
}

/** List my user-authored courses */
router.get('/', auth, requireApprovedCreator, async (req, res) => {
    try {
        const query = { createdBy: req.user._id, source: 'user' };
        const status = req.query.status;
        if (status && status !== 'all') {
            query.listingStatus = status;
        }
        const courses = await Course.find(query).sort({
            updatedAt: -1
        });
        res.json(courses);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

router.get('/dashboard', auth, requireApprovedCreator, async (req, res) => {
    try {
        const dashboard = await buildDashboardResponse(req.user._id);
        res.json(dashboard);
    } catch (err) {
        console.error('instructor dashboard:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

router.get('/students', auth, requireApprovedCreator, async (req, res) => {
    try {
        const courses = await Course.find({ createdBy: req.user._id, source: 'user' }).select('_id title');
        const courseIds = courses.map((course) => course._id);
        const enrollments = await Enrollment.find({ courseId: { $in: courseIds } })
            .populate('studentId', 'fullName email avatar profilePicture')
            .populate('courseId', 'title');
        res.json(enrollments);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

router.get('/reviews', auth, requireApprovedCreator, async (req, res) => {
    try {
        const courses = await Course.find({ createdBy: req.user._id, source: 'user' }).select('_id');
        const reviews = await Review.find({ courseId: { $in: courses.map((course) => course._id) } })
            .populate('studentId', 'fullName')
            .populate('courseId', 'title')
            .sort({ createdAt: -1 });
        res.json(reviews);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

router.get('/earnings', auth, requireApprovedCreator, async (req, res) => {
    try {
        const [transactions, payouts] = await Promise.all([
            Transaction.find({ tutorId: req.user._id }).sort({ createdAt: -1 }),
            Payout.find({ tutorId: req.user._id }).sort({ createdAt: -1 })
        ]);

        const completed = transactions.filter((transaction) => transaction.status === 'completed');
        const totalRevenue = completed.reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
        const totalEarnings = completed.reduce((sum, transaction) => sum + Number(transaction.tutorEarning || 0), 0);
        const totalPaidOut = payouts
            .filter((payout) => payout.status === 'paid')
            .reduce((sum, payout) => sum + Number(payout.amount || 0), 0);

        res.json({
            totalRevenue,
            totalEarnings,
            availableBalance: totalEarnings - totalPaidOut,
            transactions,
            payouts
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

router.get('/payouts', auth, requireApprovedCreator, async (req, res) => {
    try {
        const payouts = await Payout.find({ tutorId: req.user._id }).sort({ createdAt: -1 });
        res.json(payouts);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

/** Create draft course */
router.post('/', auth, requireApprovedCreator, async (req, res) => {
    try {
        const payload = buildCoursePayload(req.body);

        const course = new Course({
            ...payload,
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
router.get('/:id', auth, requireApprovedCreator, async (req, res) => {
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
router.patch('/:id', auth, requireApprovedCreator, async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }
        if (!canEdit(course, req.user._id)) {
            return res.status(403).json({ message: 'Access denied' });
        }
        if (course.listingStatus === 'under_review' || course.listingStatus === 'pending_review') {
            return res.status(400).json({ message: 'Course is under review and cannot be edited right now' });
        }

        const updates = buildCoursePayload({
            ...course.toObject(),
            ...req.body
        });
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

router.post('/:id/duplicate', auth, requireApprovedCreator, async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }
        if (!canEdit(course, req.user._id)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const clone = new Course({
            ...course.toObject(),
            _id: undefined,
            title: `${course.title} (Copy)`,
            listingStatus: 'draft',
            isPublished: false,
            reviewMetadata: {},
            createdAt: undefined,
            updatedAt: undefined
        });

        await clone.save();
        res.status(201).json(clone);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

router.delete('/:id', auth, requireApprovedCreator, async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }
        if (!canEdit(course, req.user._id)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        await Course.findByIdAndDelete(req.params.id);
        res.json({ message: 'Course deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

/** Submit for admin review */
router.post('/:id/submit', auth, requireApprovedCreator, async (req, res) => {
    try {
        const settings = await PlatformSetting.findOne().sort({ createdAt: -1 });
        const course = await Course.findById(req.params.id);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }
        if (!canEdit(course, req.user._id)) {
            return res.status(403).json({ message: 'Access denied' });
        }
        if (!course.title || !course.description || !course.shortDescription || !course.thumbnail) {
            return res.status(400).json({ message: 'Complete the required course details before publishing' });
        }
        if (course.listingStatus !== 'draft' && course.listingStatus !== 'rejected' && course.listingStatus !== 'published') {
            return res.status(400).json({ message: 'Course cannot be submitted from current status' });
        }

        const autoApprovalEnabled = Boolean(settings?.courseAutoApproval);
        course.listingStatus = autoApprovalEnabled ? 'published' : 'under_review';
        course.isPublished = autoApprovalEnabled;
        course.publishedAt = autoApprovalEnabled ? new Date() : course.publishedAt;
        course.reviewMetadata = {
            ...course.reviewMetadata,
            submittedAt: new Date(),
            reviewedAt: autoApprovalEnabled ? new Date() : null,
            notes: autoApprovalEnabled ? 'Auto-approved by platform settings' : ''
        };
        await course.save();
        res.json({
            message: autoApprovalEnabled ? 'Course published successfully' : 'Submitted for review',
            course
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

router.post('/:id/publish', auth, requireApprovedCreator, async (req, res) => {
    try {
        const settings = await PlatformSetting.findOne().sort({ createdAt: -1 });
        if (!settings?.courseAutoApproval) {
            return res.status(403).json({ message: 'Direct publishing is disabled by admin' });
        }

        const course = await Course.findById(req.params.id);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }
        if (!canEdit(course, req.user._id)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        course.listingStatus = 'published';
        course.isPublished = true;
        course.publishedAt = new Date();
        await course.save();

        res.json(course);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

router.post('/:id/unpublish', auth, requireApprovedCreator, async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }
        if (!canEdit(course, req.user._id)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        course.listingStatus = 'draft';
        course.isPublished = false;
        await course.save();
        res.json(course);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

router.post('/:id/archive', auth, requireApprovedCreator, async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }
        if (!canEdit(course, req.user._id)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        course.listingStatus = 'archived';
        course.isPublished = false;
        course.archivedAt = new Date();
        await course.save();
        res.json(course);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;
