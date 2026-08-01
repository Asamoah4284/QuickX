const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const Purchase = require('../models/Purchase');
const Enrollment = require('../models/Enrollment');
const Review = require('../models/Review');
const Transaction = require('../models/Transaction');
const PlatformSetting = require('../models/PlatformSetting');
const TutorProfile = require('../models/TutorProfile');
const User = require('../models/User');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const multerS3 = require('multer-s3');
const path = require('path');
const { check, validationResult } = require('express-validator');
const { videoUpload, thumbnailUpload } = require('../config/s3Config');

const axios = require('axios');

/** Ensure tutor ref is a plain ObjectId (handles populated instructor/createdBy). */
function resolveCourseTutorId(course) {
    if (!course || course.source !== 'user') return null;
    const raw = course.createdBy || course.instructor;
    if (raw == null) return null;
    if (typeof raw === 'object' && raw._id) return raw._id;
    return raw;
}

/** Rewrite S3 object URLs to CloudFront when CLOUDFRONT_URL / CDN_URL is set. */
function publicAssetUrl(url) {
    if (!url || typeof url !== 'string') return url;
    const cdn = String(
        process.env.CLOUDFRONT_URL ||
            process.env.CDN_URL ||
            'https://d3mvqd2a72xwvk.cloudfront.net'
    )
        .trim()
        .replace(/\/$/, '');
    if (!cdn) return url;
    const trimmed = url.trim();
    if (trimmed.includes('.cloudfront.net')) return trimmed;
    try {
        const u = new URL(trimmed);
        const host = u.hostname.toLowerCase();
        const isVirtualHostedS3 =
            host.endsWith('.amazonaws.com') && /\.s3[.-]/i.test(host);
        if (isVirtualHostedS3 && u.pathname && u.pathname !== '/') {
            return `${cdn}${u.pathname}`;
        }
    } catch {
        return url;
    }
    return url;
}

function findLessonInCourse(course, lessonId) {
    const target = String(lessonId || '').trim();
    if (!target || !course?.modules) return null;

    // Path form: moduleIndex-sectionIndex-lessonIndex
    if (/^\d+-\d+-\d+$/.test(target)) {
        const [m, s, l] = target.split('-').map((n) => Number(n));
        const lesson = course.modules?.[m]?.sections?.[s]?.lessons?.[l];
        if (lesson) {
            return {
                lesson,
                moduleIndex: m,
                sectionIndex: s,
                lessonIndex: l,
                pathId: target,
            };
        }
        return null;
    }

    for (let m = 0; m < course.modules.length; m += 1) {
        const sections = course.modules[m]?.sections || [];
        for (let s = 0; s < sections.length; s += 1) {
            const lessons = sections[s]?.lessons || [];
            for (let l = 0; l < lessons.length; l += 1) {
                const lesson = lessons[l];
                if (lesson?._id && String(lesson._id) === target) {
                    return {
                        lesson,
                        moduleIndex: m,
                        sectionIndex: s,
                        lessonIndex: l,
                        pathId: `${m}-${s}-${l}`,
                    };
                }
            }
        }
    }
    return null;
}

async function userHasCourseAccess(userId, course) {
    const isOwner =
        course.source === 'user' &&
        course.createdBy &&
        course.createdBy.toString() === userId.toString();
    if (isOwner) {
        return { allowed: true, via: 'owner', purchase: null, enrollment: null };
    }

    const [purchase, enrollment] = await Promise.all([
        Purchase.findOne({
            userId,
            courseId: course._id,
            status: 'completed',
        }),
        Enrollment.findOne({
            studentId: userId,
            courseId: course._id,
        }),
    ]);

    if (purchase) {
        return { allowed: true, via: 'purchase', purchase, enrollment };
    }
    if (enrollment) {
        return { allowed: true, via: 'enrollment', purchase, enrollment };
    }

    const { hasActiveSubscription } = require('../services/tutorSubscriptionService');
    const tutorId = resolveCourseTutorId(course);
    const subscribed = tutorId ? await hasActiveSubscription(userId, tutorId) : false;
    if (subscribed) {
        return { allowed: true, via: 'subscription', purchase, enrollment };
    }

    return { allowed: false, via: null, purchase, enrollment };
}

async function userCanDownloadOffline(userId, course, access) {
    if (!access?.allowed) return false;
    if (access.via === 'owner') return true;

    const purchase = access.purchase || await Purchase.findOne({
        userId,
        courseId: course._id,
        status: 'completed',
    });
    if (purchase) return true;

    const { hasSubscriptionFeature } = require('../services/tutorSubscriptionService');
    const { FEATURES } = require('../constants/creatorSubscriptionPlans');
    const tutorId = resolveCourseTutorId(course);
    if (!tutorId) return false;
    return hasSubscriptionFeature(userId, tutorId, FEATURES.DOWNLOAD);
}

async function buildTransactionRecord({ course, userId, amount, paymentReference = '' }) {
    const settings = await PlatformSetting.findOne().sort({ createdAt: -1 });
    const commissionRate = Number(settings?.commissionRate || 15);
    const gross = Number(amount || 0);
    const platformCommission = course.source === 'user'
        ? Number(((gross * commissionRate) / 100).toFixed(2))
        : 0;
    const tutorEarning = Number((gross - platformCommission).toFixed(2));

    return {
        studentId: userId,
        tutorId: resolveCourseTutorId(course),
        courseId: course._id,
        amount: gross,
        platformCommission,
        tutorEarning: course.source === 'user' ? tutorEarning : 0,
        status: 'completed',
        paymentReference
    };
}

/** Strip lesson media from non-preview lessons so public /preview cannot leak full curriculum URLs. */
function sanitizeCourseModulesForPublicPreview(courseObj) {
    const modules = (courseObj.modules || []).map((mod) => ({
        ...mod,
        sections: (mod.sections || []).map((sec) => ({
            ...sec,
            lessons: (sec.lessons || []).map((lesson) => {
                const previewAllowed = lesson.isPreview === true || lesson.free === true;
                if (previewAllowed) return lesson;
                return {
                    ...lesson,
                    videoUrl: '',
                    pdfUrl: '',
                    textContent: '',
                    videoKey: undefined,
                    videoPublicId: undefined,
                    filePath: undefined,
                    resourceUrl: undefined,
                    resources: []
                };
            })
        }))
    }));
    return { ...courseObj, modules };
}

// Get user's purchased courses
router.get('/user/purchased', auth, async (req, res) => {
    try {
        // Check if user is authenticated
        if (!req.user || !req.user._id) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const {
            listActiveSubscriptionsForStudent,
            enrollStudentInTutorPublishedCourses,
        } = require('../services/tutorSubscriptionService');

        const buildCourseList = async () => {
            const [purchases, enrollments] = await Promise.all([
                Purchase.find({
                    userId: req.user._id,
                    status: 'completed'
                }).populate({
                    path: 'courseId',
                    select: 'title description shortDescription thumbnail price instructor'
                }),
                Enrollment.find({ studentId: req.user._id }).populate({
                    path: 'courseId',
                    select: 'title description shortDescription thumbnail price instructor'
                })
            ]);

            const courseMap = new Map();

            purchases
                .filter((purchase) => purchase.courseId)
                .forEach((purchase) => {
                    courseMap.set(String(purchase.courseId._id), {
                        id: purchase.courseId._id,
                        title: purchase.courseId.title,
                        description: purchase.courseId.shortDescription || purchase.courseId.description,
                        thumbnail: purchase.courseId.thumbnail,
                        price: purchase.courseId.price,
                        instructor: purchase.courseId.instructor?.fullName || 'Unknown Instructor',
                        purchaseDate: purchase.createdAt,
                        progress: 0,
                        lastAccessed: 'Recently'
                    });
                });

            enrollments
                .filter((enrollment) => enrollment.courseId)
                .forEach((enrollment) => {
                    courseMap.set(String(enrollment.courseId._id), {
                        id: enrollment.courseId._id,
                        title: enrollment.courseId.title,
                        description: enrollment.courseId.shortDescription || enrollment.courseId.description,
                        thumbnail: enrollment.courseId.thumbnail,
                        price: enrollment.courseId.price,
                        instructor: enrollment.courseId.instructor?.fullName || 'Unknown Instructor',
                        purchaseDate: enrollment.enrolledAt,
                        progress: enrollment.progressPercent || 0,
                        lastAccessed: enrollment.updatedAt ? new Date(enrollment.updatedAt).toLocaleDateString() : 'Recently'
                    });
                });

            return Array.from(courseMap.values());
        };

        // Repair paid-but-unenrolled courses before responding so dashboard is correct immediately.
        try {
            const { repairCourseAccessFromPayments } = require('../services/coursePurchaseService');
            await repairCourseAccessFromPayments(req.user._id);
        } catch (repairErr) {
            console.error('purchased courses repair:', repairErr.message);
        }

        const courses = await buildCourseList();
        res.json(courses);

        // Soft sync in the background so future visits stay consistent without blocking this request.
        setImmediate(async () => {
            try {
                const subs = await listActiveSubscriptionsForStudent(req.user._id);
                await Promise.all(
                    subs.map((sub) => {
                        const tutorId = sub.tutorId?._id || sub.tutorId;
                        return tutorId
                            ? enrollStudentInTutorPublishedCourses(req.user._id, tutorId)
                            : Promise.resolve();
                    })
                );
            } catch (syncErr) {
                console.error('subscription course sync:', syncErr.message);
            }
        });
    } catch (error) {
        console.error('Error fetching purchased courses:', error);
        res.status(500).json({ 
            message: 'Server error while fetching purchased courses',
            error: error.message 
        });
    }
});

// Public catalog: only published marketplace listings
router.get('/', async (req, res) => {
    try {
        const { category, search, courseType, level, sort } = req.query;
        let query = {
            $and: [
                {
                    $or: [
                        { source: { $ne: 'user' } },
                        { listingStatus: 'published' }
                    ]
                }
            ]
        };
            
        if (category) {
            if (typeof category !== 'string' || category.length > 50) {
                return res.status(400).json({ message: 'Invalid category parameter' });
            }
            query.$and.push({
                $or: [
                    { category: new RegExp('^' + category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') },
                    { tags: category }
                ]
            });
        }
        
        if (search) {
            if (typeof search !== 'string' || search.length > 100) {
                return res.status(400).json({ message: 'Invalid search parameter' });
            }
            const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            query.$and.push({
                $or: [
                    { title: { $regex: escapedSearch, $options: 'i' } },
                    { shortDescription: { $regex: escapedSearch, $options: 'i' } }
                ]
            });
        }

        if (courseType) {
            if (!['forex', 'crypto', 'webdev'].includes(courseType)) {
                return res.status(400).json({ message: 'Invalid course type' });
            }
            query.$and.push({ courseType });
        }

        if (level) {
            if (!['beginner', 'intermediate', 'advanced'].includes(level)) {
                return res.status(400).json({ message: 'Invalid level' });
            }
            query.$and.push({ level });
        }

        let sortSpec = { createdAt: -1 };
        if (sort === 'price_asc') sortSpec = { price: 1 };
        if (sort === 'price_desc') sortSpec = { price: -1 };
        if (sort === 'oldest') sortSpec = { createdAt: 1 };

        const courses = await Course.find(query)
            .select('-topics.videoUrl')
            .sort(sortSpec)
            .populate('instructor', 'fullName');

        const courseDocs = courses.map((c) => c.toObject());
        const tutorIds = [
            ...new Set(
                courseDocs
                    .map((c) => {
                        const id = resolveCourseTutorId(c);
                        return id ? String(id) : null;
                    })
                    .filter(Boolean)
            ),
        ];

        let pricingByTutor = {};
        if (tutorIds.length) {
            const profiles = await TutorProfile.find({ userId: { $in: tutorIds } })
                .select('userId subscriptionPricing')
                .lean();
            pricingByTutor = Object.fromEntries(
                profiles.map((p) => [String(p.userId), p.subscriptionPricing || null])
            );
        }

        const withSubscriptionPricing = courseDocs.map((c) => {
            const tutorId = resolveCourseTutorId(c);
            return {
                ...c,
                subscriptionPricing: tutorId ? pricingByTutor[String(tutorId)] || null : null,
            };
        });

        console.log(`Found ${withSubscriptionPricing.length} courses matching query`);
        console.log('Course types returned:', withSubscriptionPricing.map((c) => c.courseType));

        res.json(withSubscriptionPricing);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get single course details (public preview)
router.get('/:id/preview', async (req, res) => {
    try {
        const course = await Course.findById(req.params.id)
            .select('-topics.videoUrl')
            .populate('instructor', 'fullName avatar profilePicture');
            
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }
        if (course.source === 'user' && course.listingStatus !== 'published') {
            return res.status(404).json({ message: 'Course not found' });
        }
        
        const [reviews, relatedCourses, tutorProfile] = await Promise.all([
            Review.find({ courseId: course._id })
                .populate('studentId', 'fullName')
                .sort({ createdAt: -1 })
                .limit(5),
            Course.find({
                _id: { $ne: course._id },
                courseType: course.courseType,
                listingStatus: 'published'
            })
                .sort({ averageRating: -1, createdAt: -1 })
                .limit(3)
                .select('title thumbnail price averageRating totalLessons createdBy'),
            course.createdBy ? TutorProfile.findOne({ userId: course.createdBy }) : null
        ]);

        const safeCourse = sanitizeCourseModulesForPublicPreview(course.toObject());
        res.json({
            ...safeCourse,
            reviews,
            relatedCourses,
            tutorProfile
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get full course content (authenticated & purchased users only)
router.get('/:id/full', auth, async (req, res) => {
    try {
        const user = req.user;
        const course = await Course.findById(req.params.id)
            .populate('instructor', 'fullName');
            
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        const isOwner =
            course.source === 'user' &&
            course.createdBy &&
            course.createdBy.toString() === user._id.toString();
        if (isOwner) {
            return res.json({
                ...course.toObject(),
                canDownloadOffline: true,
                tutorId: resolveCourseTutorId(course) ? String(resolveCourseTutorId(course)) : null,
            });
        }

        const [purchase, enrollment] = await Promise.all([
            Purchase.findOne({ 
                userId: user._id, 
                courseId: course._id,
                status: 'completed'
            }),
            Enrollment.findOne({
                studentId: user._id,
                courseId: course._id
            })
        ]);

        let accessEnrollment = enrollment;
        if (!purchase && !enrollment) {
            const { hasActiveSubscription } = require('../services/tutorSubscriptionService');
            const tutorId = resolveCourseTutorId(course);
            const subscribed = tutorId ? await hasActiveSubscription(user._id, tutorId) : false;
            if (!subscribed) {
                return res.status(403).json({ message: 'Access denied. Please purchase this course.' });
            }
            // Active creator subscription — ensure enrollment so progress tracking works
            accessEnrollment = await Enrollment.findOneAndUpdate(
                { studentId: user._id, courseId: course._id },
                {
                    $setOnInsert: {
                        studentId: user._id,
                        courseId: course._id,
                        enrolledAt: new Date(),
                        progressPercent: 0,
                        completedLessonIds: [],
                    },
                },
                { upsert: true, new: true }
            );
        }
        
        res.json({
            ...course.toObject(),
            enrollment: accessEnrollment,
            canDownloadOffline: await userCanDownloadOffline(user._id, course, {
                allowed: true,
                via: isOwner ? 'owner' : (purchase ? 'purchase' : (accessEnrollment ? 'enrollment' : 'subscription')),
                purchase,
                enrollment: accessEnrollment,
            }),
            tutorId: resolveCourseTutorId(course) ? String(resolveCourseTutorId(course)) : null,
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

/**
 * Shared entitlement + lesson resolution for offline download.
 * Returns { error, status, payload } where payload is ready for JSON or stream.
 */
async function resolveLessonDownloadEntitlement(user, courseId, lessonId) {
    const course = await Course.findById(courseId);
    if (!course) {
        return { status: 404, error: { message: 'Course not found' } };
    }

    const access = await userHasCourseAccess(user._id, course);
    if (!access.allowed) {
        return {
            status: 403,
            error: {
                message: 'Access denied. Please purchase this course or subscribe.',
                code: 'NO_ACCESS',
            },
        };
    }

    const canDownload = await userCanDownloadOffline(user._id, course, access);
    if (!canDownload) {
        return {
            status: 403,
            error: {
                message:
                    'Offline downloads require Premium or Diamond, or a course purchase. Upgrade to download and watch without using mobile data.',
                code: 'UPGRADE_REQUIRED',
                canDownloadOffline: false,
            },
        };
    }

    const decodedLessonId = decodeURIComponent(String(lessonId || '').trim());
    const found = findLessonInCourse(course, decodedLessonId);
    if (!found?.lesson) {
        return { status: 404, error: { message: 'Lesson not found' } };
    }

    const rawUrl = String(found.lesson.videoUrl || found.lesson.filePath || '').trim();
    if (!rawUrl) {
        return { status: 404, error: { message: 'This lesson has no downloadable video' } };
    }

    const url = publicAssetUrl(rawUrl);
    const lessonKey = found.lesson._id ? String(found.lesson._id) : found.pathId;
    return {
        status: 200,
        course,
        found,
        url,
        lessonKey,
        access,
    };
}

/**
 * Entitlement for offline lesson download.
 * Allowed for: course owner, completed purchase, or Premium/Diamond (download feature).
 * Basic subscribers can stream but not download.
 */
router.get('/:id/lessons/:lessonId/download', auth, async (req, res) => {
    try {
        const jwt = require('jsonwebtoken');
        const resolved = await resolveLessonDownloadEntitlement(
            req.user,
            req.params.id,
            req.params.lessonId
        );
        if (resolved.error) {
            return res.status(resolved.status).json(resolved.error);
        }

        const { course, found, url, lessonKey } = resolved;
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
        const offlineLicense = jwt.sign(
            {
                typ: 'offline_lesson',
                uid: String(req.user._id),
                cid: String(course._id),
                lid: lessonKey,
                exp: Math.floor(expiresAt.getTime() / 1000),
            },
            process.env.JWT_SECRET
        );

        res.json({
            allowed: true,
            url,
            streamPath: `/api/courses/${course._id}/lessons/${encodeURIComponent(lessonKey)}/download-stream`,
            courseId: String(course._id),
            courseTitle: course.title || '',
            lessonId: lessonKey,
            pathId: found.pathId,
            lessonTitle: found.lesson.title || '',
            offlineLicense,
            offlineLicenseExpiresAt: expiresAt.toISOString(),
        });
    } catch (error) {
        console.error('lesson download entitlement:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

/**
 * Authenticated byte stream for offline save (avoids CDN CORS issues in the browser).
 */
router.get('/:id/lessons/:lessonId/download-stream', auth, async (req, res) => {
    try {
        const resolved = await resolveLessonDownloadEntitlement(
            req.user,
            req.params.id,
            req.params.lessonId
        );
        if (resolved.error) {
            return res.status(resolved.status).json(resolved.error);
        }

        const { url } = resolved;
        // Large lesson files — no short timeout; pipe bytes through (do not buffer).
        const upstream = await axios.get(url, {
            responseType: 'stream',
            timeout: 0,
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            validateStatus: (s) => s >= 200 && s < 400,
        });

        const contentType = upstream.headers['content-type'] || 'video/mp4';
        const contentLength = upstream.headers['content-length'];
        res.setHeader('Content-Type', contentType);
        if (contentLength) res.setHeader('Content-Length', contentLength);
        res.setHeader('Content-Disposition', 'inline');
        res.setHeader('Cache-Control', 'private, no-store');
        // Allow browser fetch() from the Vite/dev/prod origin
        res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Type');

        req.on('close', () => {
            try {
                upstream.data.destroy();
            } catch {
                // ignore
            }
        });

        upstream.data.on('error', (err) => {
            console.error('download-stream upstream error:', err.message);
            if (!res.headersSent) {
                res.status(502).json({ message: 'Failed to fetch video for download' });
            } else {
                res.destroy(err);
            }
        });
        upstream.data.pipe(res);
    } catch (error) {
        console.error('lesson download-stream:', error.message);
        if (!res.headersSent) {
            res.status(502).json({
                message: 'Could not download video. Try again on a stable Wi‑Fi connection.',
                error: error.message,
            });
        }
    }
});

router.post('/:id/enroll', auth, async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course || (course.source === 'user' && course.listingStatus !== 'published')) {
            return res.status(404).json({ message: 'Course not found' });
        }

        if (Number(course.price || 0) > 0) {
            return res.status(400).json({ message: 'This course requires payment before enrollment' });
        }

        const enrollment = await Enrollment.findOneAndUpdate(
            { studentId: req.user._id, courseId: course._id },
            {
                $setOnInsert: {
                    studentId: req.user._id,
                    courseId: course._id,
                    enrolledAt: new Date()
                }
            },
            { new: true, upsert: true }
        );

        await User.findByIdAndUpdate(req.user._id, {
            $addToSet: { purchasedCourses: course._id }
        });

        const transactionExists = await Transaction.findOne({
            studentId: req.user._id,
            courseId: course._id
        });

        if (!transactionExists) {
            const transactionRecord = await buildTransactionRecord({
                course,
                userId: req.user._id,
                amount: 0,
                paymentReference: 'FREE_ENROLLMENT'
            });
            await Transaction.create(transactionRecord);
        }

        res.json({
            message: 'Enrolled successfully',
            enrollment
        });
    } catch (error) {
        console.error('free enroll error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Purchase course (authenticated) — idempotent; prefer /payments/initialize which also grants access
router.post('/:id/purchase', auth, async (req, res) => {
    try {
        console.log('Processing course purchase:', {
            courseId: req.params.id,
            userId: req.user._id,
            body: req.body
        });

        const { grantCourseAccess } = require('../services/coursePurchaseService');
        const result = await grantCourseAccess({
            userId: req.user._id,
            courseId: req.params.id,
            amount: req.body.amount,
            transactionId: req.body.reference || req.body.transactionId || '',
            paymentMethod: req.body.paymentMethod || 'paystack',
        });

        res.json({
            success: true,
            message: result.createdPurchase
                ? 'Course purchased successfully'
                : 'Course access already on your account',
            purchase: {
                id: result.purchaseId,
                courseId: result.courseId,
                amount: req.body.amount,
                status: 'completed',
            }
        });
    } catch (error) {
        if (error.status === 404) {
            return res.status(404).json({ message: error.message || 'Course not found' });
        }
        console.error('Error in course purchase:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to process course purchase',
            error: error.message
        });
    }
});

router.post('/:id/progress', auth, async (req, res) => {
    try {
        const { progressPercent = 0, completedLessonId } = req.body;
        const enrollment = await Enrollment.findOne({ studentId: req.user._id, courseId: req.params.id });

        if (!enrollment) {
            return res.status(404).json({ message: 'Enrollment not found' });
        }

        enrollment.progressPercent = Math.max(0, Math.min(100, Number(progressPercent)));
        if (completedLessonId) {
            enrollment.completedLessonIds = Array.from(
                new Set([...(enrollment.completedLessonIds || []), String(completedLessonId)])
            );
        }
        if (enrollment.progressPercent >= 100 && !enrollment.completedAt) {
            enrollment.completedAt = new Date();
        }

        await enrollment.save();

        res.json({
            enrollment,
            certificateEligible: enrollment.progressPercent >= 100
        });
    } catch (error) {
        console.error('progress update error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get all courses (admin)
router.get('/admin/courses', adminAuth, async (req, res) => {
    try {
        const courses = await Course.find().populate('instructor', 'name email');
        res.json(courses);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get single course (admin)
router.get('/admin/courses/:id', adminAuth, async (req, res) => {
    try {
        const course = await Course.findById(req.params.id)
            .populate('instructor', 'name email')
            .populate('modules.content');
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }
        res.json(course);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get enrolled students for a course
router.get('/admin/courses/:id/students', adminAuth, async (req, res) => {
    try {
        const course = await Course.findById(req.params.id)
            .populate('enrolledStudents.student', 'name email');
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }
        res.json(course.enrolledStudents);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Add content to a course
router.post('/admin/courses/:id/content', adminAuth, async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        const { type, title, description, url, moduleId } = req.body;
        const content = {
            type,
            title,
            description,
            url: type === 'video' ? url : null,
            filePath: req.file ? req.file.path : null
        };

        if (moduleId) {
            const module = course.modules.id(moduleId);
            if (!module) {
                return res.status(404).json({ message: 'Module not found' });
            }
            module.content.push(content);
        } else {
            course.modules[0].content.push(content);
        }

        await course.save();
        res.status(201).json(content);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Delete content from a course
router.delete('/admin/courses/:courseId/content/:contentId', adminAuth, async (req, res) => {
    try {
        const course = await Course.findById(req.params.courseId);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        let contentFound = false;
        for (const module of course.modules) {
            const contentIndex = module.content.findIndex(c => c._id.toString() === req.params.contentId);
            if (contentIndex !== -1) {
                module.content.splice(contentIndex, 1);
                contentFound = true;
                break;
            }
        }

        if (!contentFound) {
            return res.status(404).json({ message: 'Content not found' });
        }

        await course.save();
        res.json({ message: 'Content deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Update student progress
router.put('/admin/courses/:courseId/students/:studentId/progress', adminAuth, async (req, res) => {
    try {
        const course = await Course.findById(req.params.courseId);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        const studentIndex = course.enrolledStudents.findIndex(
            s => s.student.toString() === req.params.studentId
        );

        if (studentIndex === -1) {
            return res.status(404).json({ message: 'Student not found' });
        }

        course.enrolledStudents[studentIndex].progress = req.body.progress;
        course.enrolledStudents[studentIndex].status = req.body.status;

        await course.save();
        res.json(course.enrolledStudents[studentIndex]);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create a new course
router.post('/admin/courses', adminAuth, async (req, res) => {
    try {
        // Log received data for debugging
        console.log('Received course data:', req.body);
        console.log('courseType from request:', req.body.courseType);
        
        const { 
            title, 
            description, 
            shortDescription, 
            price, 
            level, 
            tags, 
            instructor, 
            instructorModel, 
            modules,
            thumbnail,
            courseType
        } = req.body;

        console.log('Extracted courseType:', courseType);

        // Validate required fields
        if (!title || !description || !price || !level || !instructor || !instructorModel || !courseType) {
            return res.status(400).json({ 
                message: 'Missing required fields',
                details: {
                    title: !title ? 'Title is required' : undefined,
                    description: !description ? 'Description is required' : undefined,
                    price: !price ? 'Price is required' : undefined,
                    level: !level ? 'Level is required' : undefined,
                    instructor: !instructor ? 'Instructor is required' : undefined,
                    instructorModel: !instructorModel ? 'Instructor model is required' : undefined,
                    courseType: !courseType ? 'Course type is required (forex or crypto)' : undefined
                }
            });
        }

        // Validate courseType is valid
        if (!['forex', 'crypto', 'webdev'].includes(courseType)) {
            return res.status(400).json({
                message: 'Invalid course type',
                details: {
                    courseType: `'${courseType}' is not a valid course type. Must be forex, crypto, or webdev`
                }
            });
        }

        // Create the course
        const course = new Course({
            title,
            description,
            shortDescription,
            price: Number(price),
            level,
            tags,
            instructor,
            instructorModel,
            modules,
            thumbnail,
            courseType,
            source: 'admin',
            listingStatus: 'published',
            isPublished: true
        });

        console.log('Course object before saving:', course);
        
        await course.save();
        res.status(201).json(course);
    } catch (error) {
        console.error('Error creating course:', error);
        res.status(500).json({ 
            message: 'Error creating course', 
            error: error.message,
            details: error.stack 
        });
    }
});

// Upload video content
router.post('/admin/courses/:courseId/modules/:moduleId/sections/:sectionId/lessons/video', 
    adminAuth, 

    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ 
                    message: 'No video file uploaded',
                    details: 'Make sure the file is being sent with the field name "video"'
                });
            }

            // Get the S3 URL of the uploaded file
            const videoUrl = req.file.location;
            const videoKey = req.file.key;

            // If this is part of course creation, update the course
            if (req.params.courseId !== 'new') {
                const course = await Course.findById(req.params.courseId);
                if (!course) {
                    throw new Error('Course not found');
                }

                const module = course.modules.id(req.params.moduleId);
                if (!module) {
                    throw new Error('Module not found');
                }

                const section = module.sections.id(req.params.sectionId);
                if (!section) {
                    throw new Error('Section not found');
                }

                // Add or update the lesson
                const lessonData = {
                    title: req.body.title,
                    type: 'video',
                    description: req.body.description || '',
                    videoUrl: videoUrl,
                    videoKey: videoKey,
                    duration: req.body.duration || '0min',
                    free: req.body.free === 'true',
                    order: parseInt(req.body.order) || section.lessons.length + 1
                };

                if (req.params.lessonId) {
                    const lesson = section.lessons.id(req.params.lessonId);
                    if (!lesson) {
                        throw new Error('Lesson not found');
                    }
                    Object.assign(lesson, lessonData);
                } else {
                    section.lessons.push(lessonData);
                }

                await course.save();
            }

            res.status(201).json({
                url: videoUrl,
                key: videoKey,
                duration: req.body.duration || '0min'
            });
        } catch (error) {
            console.error('Error in video upload:', error);
            res.status(500).json({ 
                message: 'Error uploading video', 
                error: error.message
            });
        }
    }
);

// Delete video lesson
router.delete('/admin/courses/:courseId/modules/:moduleId/sections/:sectionId/lessons/:lessonId',
    adminAuth,
    async (req, res) => {
        try {
            const { courseId, moduleId, sectionId, lessonId } = req.params;

            const course = await Course.findById(courseId);
            if (!course) {
                return res.status(404).json({ message: 'Course not found' });
            }

            const module = course.modules.id(moduleId);
            if (!module) {
                return res.status(404).json({ message: 'Module not found' });
            }

            const section = module.sections.id(sectionId);
            if (!section) {
                return res.status(404).json({ message: 'Section not found' });
            }

            const lesson = section.lessons.id(lessonId);
            if (!lesson) {
                return res.status(404).json({ message: 'Lesson not found' });
            }

            // If it's a video lesson, delete from S3
            if (lesson.type === 'video' && lesson.videoKey) {
                await s3.deleteObject({
                    Bucket: 'quickxlearn',
                    Key: lesson.videoKey
                }).promise();
            }

            lesson.remove();
            await course.save();
            res.json({ message: 'Lesson deleted successfully' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
);

// Get user's purchase history
router.get('/purchases/history', auth, async (req, res) => {
    try {
        const purchases = await Purchase.find({ userId: req.user._id })
            .populate('courseId', 'title thumbnail price')
            .sort({ date: -1 });
            
        res.json(purchases);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get all purchases (admin)
router.get('/admin/purchases', adminAuth, async (req, res) => {
    try {
        const { userId, courseId, status, startDate, endDate } = req.query;
        let query = {};
        
        if (userId) query.userId = userId;
        if (courseId) query.courseId = courseId;
        if (status) query.status = status;
        
        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) query.date.$lte = new Date(endDate);
        }
        
        const purchases = await Purchase.find(query)
            .populate('userId', 'fullName email')
            .populate('courseId', 'title price')
            .sort({ date: -1 });
            
        res.json(purchases);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Update purchase status (admin)
router.put('/admin/purchases/:id', adminAuth, async (req, res) => {
    try {
        const { status } = req.body;
        
        if (!status || !['completed', 'pending', 'failed', 'refunded'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }
        
        const purchase = await Purchase.findById(req.params.id);
        if (!purchase) {
            return res.status(404).json({ message: 'Purchase not found' });
        }
        
        purchase.status = status;
        await purchase.save();
        
        // If refunded, update course student count
        if (status === 'refunded' && purchase.status !== 'refunded') {
            const course = await Course.findById(purchase.courseId);
            if (course) {
                course.totalStudents = Math.max(0, course.totalStudents - 1);
                await course.save();
            }
        }
        
        res.json(purchase);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;