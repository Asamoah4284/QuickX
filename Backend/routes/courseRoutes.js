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
        tutorId: course.source === 'user' ? (course.createdBy || course.instructor) : null,
        courseId: course._id,
        amount: gross,
        platformCommission,
        tutorEarning: course.source === 'user' ? tutorEarning : 0,
        status: 'completed',
        paymentReference
    };
}

// Get user's purchased courses
router.get('/user/purchased', auth, async (req, res) => {
    try {
        // Check if user is authenticated
        if (!req.user || !req.user._id) {
            return res.status(401).json({ message: 'Authentication required' });
        }

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

        res.json(Array.from(courseMap.values()));
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
        
        console.log(`Found ${courses.length} courses matching query`);
        console.log('Course types returned:', courses.map(c => c.courseType));
            
        res.json(courses);
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

        res.json({
            ...course.toObject(),
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
            return res.json(course);
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
        
        if (!purchase && !enrollment) {
            return res.status(403).json({ message: 'Access denied. Please purchase this course.' });
        }
        
        res.json({
            ...course.toObject(),
            enrollment
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
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

// Purchase course (authenticated)
router.post('/:id/purchase', auth, async (req, res) => {
    try {
        console.log('Processing course purchase:', {
            courseId: req.params.id,
            userId: req.user._id,
            body: req.body
        });

        const user = req.user;
        const course = await Course.findById(req.params.id);
        
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        // Check if user already purchased this course
        const existingPurchase = await Purchase.findOne({ 
            userId: user._id, 
            courseId: course._id,
            status: 'completed'
        });
        
        if (existingPurchase) {
            return res.status(400).json({ 
                message: 'You have already purchased this course',
                purchaseId: existingPurchase._id
            });
        }

        // Create a new purchase record
        const purchase = new Purchase({
            userId: user._id,
            courseId: course._id,
            amount: req.body.amount || course.price,
            status: 'completed',
            paymentMethod: req.body.paymentMethod || 'momo',
            transactionId: req.body.reference || req.body.transactionId,
            referralCode: req.body.referralCode || null
        });

        try {
            await purchase.save();
            console.log('Purchase record saved:', purchase);
        } catch (saveError) {
            console.error('Error saving purchase record:', saveError);
            throw new Error('Failed to save purchase record: ' + saveError.message);
        }
        
        // Update course student count
        try {
            course.totalStudents += 1;
            await course.save();
            console.log('Course student count updated');
        } catch (courseError) {
            console.error('Error updating course:', courseError);
            // Don't throw here, as the purchase is already saved
        }

        // If this is a forex course, add all forex ebooks to user's purchased books
        if (course.courseType === 'forex') {
            try {
                const Book = require('../models/Book');
                const forexBooks = await Book.find({ 
                    category: 'forex',
                    type: 'ebook'
                });

                // Add forex books to user's purchased books if not already purchased
                if (forexBooks.length > 0) {
                    const User = require('../models/User');
                    const userDoc = await User.findById(user._id);
                    
                    for (const book of forexBooks) {
                        if (!userDoc.purchasedBooks.includes(book._id)) {
                            userDoc.purchasedBooks.push(book._id);
                        }
                    }
                    
                    await userDoc.save();
                    console.log('Forex books added to user purchases');
                }
            } catch (forexError) {
                console.error('Error adding forex books:', forexError);
                // Don't throw here, as the main purchase is complete
            }
        }

        await Promise.all([
            Enrollment.findOneAndUpdate(
                { studentId: user._id, courseId: course._id },
                {
                    $setOnInsert: {
                        studentId: user._id,
                        courseId: course._id,
                        enrolledAt: new Date()
                    }
                },
                { upsert: true, new: true }
            ),
            User.findByIdAndUpdate(user._id, {
                $addToSet: { purchasedCourses: course._id }
            })
        ]);

        const transactionRecord = await buildTransactionRecord({
            course,
            userId: user._id,
            amount: req.body.amount || course.price,
            paymentReference: purchase.transactionId || req.body.reference || ''
        });
        await Transaction.create(transactionRecord);
        
        res.json({
            success: true,
            message: 'Course purchased successfully',
            purchase: {
                id: purchase._id,
                courseId: course._id,
                amount: purchase.amount,
                status: purchase.status,
                purchaseDate: purchase.createdAt
            }
        });
    } catch (error) {
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