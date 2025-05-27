const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const Purchase = require('../models/Purchase');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const multerS3 = require('multer-s3');
const path = require('path');
const { check, validationResult } = require('express-validator');
const { videoUpload, thumbnailUpload } = require('../config/s3Config');

const axios = require('axios');

// Get user's purchased courses
router.get('/user/purchased', auth, async (req, res) => {
    try {
        // Check if user is authenticated
        if (!req.user || !req.user._id) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        // Find all completed purchases for the user
        const purchases = await Purchase.find({ 
            userId: req.user._id,
            status: 'completed'
        }).populate({
            path: 'courseId',
            select: 'title description thumbnail price instructor',
            populate: {
                path: 'instructor',
                select: 'fullName'
            }
        });

        // Format the response
        const purchasedCourses = purchases
            .filter(purchase => purchase.courseId) // Filter out any null courseIds
            .map(purchase => ({
                id: purchase.courseId._id,
                title: purchase.courseId.title,
                description: purchase.courseId.description,
                thumbnail: purchase.courseId.thumbnail,
                price: purchase.courseId.price,
                instructor: purchase.courseId.instructor?.fullName || 'Unknown Instructor',
                purchaseDate: purchase.createdAt,
                progress: 0, // You can add actual progress tracking later
                lastAccessed: 'Recently' // You can add actual last accessed tracking later
            }));

        res.json(purchasedCourses);
    } catch (error) {
        console.error('Error fetching purchased courses:', error);
        res.status(500).json({ 
            message: 'Server error while fetching purchased courses',
            error: error.message 
        });
    }
});

// Get all courses (public)
router.get('/', async (req, res) => {
    try {
        const { category, search, courseType } = req.query;
        let query = {};
            
        if (category) {
            query.category = category;
        }
        
        if (search) {
            query.title = { $regex: search, $options: 'i' };
        }

        if (courseType) {
            query.courseType = courseType;
            console.log(`Filtering courses by courseType: ${courseType}`);
        }

        console.log('Course query:', query);
        const courses = await Course.find(query)
            .select('-topics.videoUrl')
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
            .populate('instructor', 'fullName');
            
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }
        
        res.json(course);
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

        // Check if user has purchased the course using the Purchase model
        const purchase = await Purchase.findOne({ 
            userId: user._id, 
            courseId: course._id,
            status: 'completed'
        });
        
        if (!purchase) {
            return res.status(403).json({ message: 'Access denied. Please purchase this course.' });
        }
        
        res.json(course);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Purchase course (authenticated)
router.post('/:id/purchase', auth, async (req, res) => {
    try {
        const user = req.user;
        const course = await Course.findById(req.params.id);
        
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        // Check if user already purchased this course
        const existingPurchase = await Purchase.findOne({ 
            userId: user._id, 
            courseId: course._id 
        });
        
        if (existingPurchase) {
            return res.status(400).json({ message: 'You have already purchased this course' });
        }

        // Create a new purchase record
        const purchase = new Purchase({
            userId: user._id,
            courseId: course._id,
            amount: course.price,
            status: 'completed',
            paymentMethod: 'direct', // This would be replaced with actual payment method
            transactionId: Date.now().toString() // This would be replaced with actual transaction ID
        });

        await purchase.save();
        
        // Update course student count
        course.totalStudents += 1;
        await course.save();

        // If this is a forex course, add all forex ebooks to user's purchased books
        if (course.courseType === 'forex') {
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
            }
        }
        
        res.json({ 
            message: 'Course purchased successfully',
            purchase: purchase
        });
    } catch (error) {
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
        if (courseType !== 'forex' && courseType !== 'crypto') {
            return res.status(400).json({
                message: 'Invalid course type',
                details: {
                    courseType: `'${courseType}' is not a valid course type. Must be 'forex' or 'crypto'`
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
            courseType // Use the validated courseType
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