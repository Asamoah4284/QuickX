const Admin = require('../models/Admin');
const Course = require('../models/Course');
const Book = require('../models/Book');
const User = require('../models/User');
const Enrollment = require('../models/Enrollment');
const Transaction = require('../models/Transaction');
const Review = require('../models/Review');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { serializeUser } = require('../utils/serializeUser');
const { enrichAdminBookThumbnails, syncStorefrontBookPriceToOfferGroup } = require('../utils/bookOfferHelpers');
const { normalizeModulesPreviewFlags } = require('../utils/lessonAccess');

// Admin Login
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Find admin
        const admin = await Admin.findOne({ email });
        if (!admin) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check password
        const isMatch = await admin.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Update last login
        admin.lastLogin = new Date();
        await admin.save();

        // Generate token
        const token = jwt.sign(
            { id: admin._id, role: admin.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            admin: {
                id: admin._id,
                email: admin.email,
                fullName: admin.fullName,
                role: admin.role,
                permissions: admin.permissions
            }
        });
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Create Course
exports.createCourse = async (req, res) => {
    try {
        // Log received data for debugging
        console.log('Received course data:', req.body);
        
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
                    courseType: !courseType ? 'Course type is required' : undefined
                }
            });
        }

        // Validate courseType value
        if (!['forex', 'crypto', 'webdev'].includes(courseType)) {
            return res.status(400).json({ 
                message: 'Invalid course type', 
                details: { courseType: 'Course type must be forex, crypto, or webdev' }
            });
        }

        // Create the course
        const course = new Course({
            title,
            description,
            shortDescription,
            price: Number(price),
            level,
            tags: tags || [],
            instructor,
            instructorModel,
            modules: normalizeModulesPreviewFlags(modules || []),
            thumbnail: thumbnail || null,
            courseType,
            source: 'admin',
            listingStatus: 'published',
            isPublished: true
        });

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
};

// Update Course
exports.updateCourse = async (req, res) => {
    try {
        const { id } = req.params;
        let courseData = req.body;
        
        // Add file path if thumbnail was uploaded
        if (req.file) {
            courseData.thumbnail = `/uploads/course-thumbnails/${req.file.filename}`;
        }
        
        // Keep lesson preview flags consistent (isPreview is the only source of truth)
        if (typeof courseData.modules === 'string') {
            try {
                courseData.modules = JSON.parse(courseData.modules);
            } catch {
                return res.status(400).json({ message: 'Invalid modules payload' });
            }
        }
        if (Array.isArray(courseData.modules)) {
            normalizeModulesPreviewFlags(courseData.modules);
        }

        // Update the course
        const course = await Course.findByIdAndUpdate(
            id,
            courseData,
            { new: true, runValidators: true }
        );
        
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }
        
        res.json(course);
    } catch (error) {
        console.error('Error updating course:', error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ 
                message: 'Validation error', 
                errors: Object.values(error.errors).map(err => err.message)
            });
        }
        res.status(500).json({ message: 'Error updating course', error: error.message });
    }
};

// Delete Course
exports.deleteCourse = async (req, res) => {
    try {
        const { id } = req.params;
        const course = await Course.findByIdAndDelete(id);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }
        res.json({ message: 'Course deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting course', error: error.message });
    }
};

// Get All Courses
exports.getAllCourses = async (req, res) => {
    try {
        const courses = await Course.find().sort({ createdAt: -1 });
        res.json(courses);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching courses', error: error.message });
    }
};

// Get Course by ID
exports.getCourseById = async (req, res) => {
    try {
        const { id } = req.params;
        const course = await Course.findById(id);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }
        res.json(course);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching course', error: error.message });
    }
};

// Book Management Functions

// Create Book
exports.createBook = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        // Log received data for debugging
        console.log('Received book data:', JSON.stringify(req.body));
        
        // Extract data from request body
        const { 
            title, 
            author, 
            description, 
            price, 
            type, 
            fileUrl, 
            stock, 
            isbn, 
            deliveryFee, 
            watermarkTemplate,
            thumbnail,
            published,
            whatYoullLearn,
            afterReadingOutcomes,
            hardcopyPrice
        } = req.body;

        const normalizeStringArray = (value) => {
            if (!value) return [];
            if (Array.isArray(value)) {
                return value.map((item) => String(item || '').trim()).filter(Boolean);
            }
            return String(value)
                .split(/\r?\n|,/)
                .map((item) => item.trim())
                .filter(Boolean);
        };

        // Validate required fields
        if (!title || !author || !description) {
            return res.status(400).json({ 
                message: 'Missing required fields',
                details: {
                    title: !title ? 'Title is required' : undefined,
                    author: !author ? 'Author is required' : undefined,
                    description: !description ? 'Description is required' : undefined
                }
            });
        }

        // For ebooks, fileUrl is required
        if (type === 'ebook' && !fileUrl) {
            return res.status(400).json({ 
                message: 'File URL is required for ebooks'
            });
        }
        
        // Create new book
        const newBook = new Book({
            title,
            author,
            description,
            price: parseFloat(price) || 0,
            type: type || 'ebook',
            fileUrl: type === 'ebook' ? fileUrl : undefined,
            stock: type === 'hardcopy' ? (parseInt(stock) || 0) : undefined,
            thumbnail,
            isbn,
            deliveryFee: type === 'hardcopy' ? (parseFloat(deliveryFee) || 0) : undefined,
            watermarkTemplate,
            published: published || new Date(),
            whatYoullLearn: normalizeStringArray(whatYoullLearn),
            afterReadingOutcomes: normalizeStringArray(afterReadingOutcomes),
            hardcopyPrice:
                (type || 'ebook') === 'ebook' && hardcopyPrice != null && hardcopyPrice !== ''
                    ? Number(hardcopyPrice)
                    : undefined,
        });

        await newBook.save();
        
        res.status(201).json(newBook);
    } catch (error) {
        console.error('Create book error:', error);
        res.status(500).json({ 
            message: 'Error creating book', 
            error: error.message,
            details: error.errors ? Object.keys(error.errors).map(key => {
                return { field: key, message: error.errors[key].message };
            }) : null
        });
    }
};

// Update Book
exports.updateBook = async (req, res) => {
    try {
        // Extract data from request body
        const { 
            title, 
            author, 
            description, 
            price, 
            type, 
            fileUrl, 
            stock, 
            isbn, 
            deliveryFee, 
            watermarkTemplate,
            thumbnail, // Get thumbnail directly from request body
            published,
            whatYoullLearn,
            afterReadingOutcomes,
            hardcopyPrice
        } = req.body;

        const normalizeStringArray = (value) => {
            if (!value) return [];
            if (Array.isArray(value)) {
                return value.map((item) => String(item || '').trim()).filter(Boolean);
            }
            return String(value)
                .split(/\r?\n|,/)
                .map((item) => item.trim())
                .filter(Boolean);
        };
        
        // Find book
        let book = await Book.findById(req.params.id);
        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }
        
        // Update fields
        if (title) book.title = title;
        if (author) book.author = author;
        if (description) book.description = description;
        if (price) book.price = parseFloat(price);
        if (type) book.type = type;
        if (fileUrl) book.fileUrl = fileUrl;
        if (stock !== undefined) book.stock = parseInt(stock);
        if (isbn) book.isbn = isbn;
        if (deliveryFee !== undefined) book.deliveryFee = parseFloat(deliveryFee);
        if (watermarkTemplate) book.watermarkTemplate = watermarkTemplate;
        if (thumbnail) book.thumbnail = thumbnail; // Update with new thumbnail URL
        if (published) book.published = published;
        if (whatYoullLearn !== undefined) book.whatYoullLearn = normalizeStringArray(whatYoullLearn);
        if (afterReadingOutcomes !== undefined) {
            book.afterReadingOutcomes = normalizeStringArray(afterReadingOutcomes);
        }
        if (hardcopyPrice !== undefined) {
            book.hardcopyPrice =
                hardcopyPrice === '' || hardcopyPrice == null ? null : Number(hardcopyPrice);
        }
        if (book.type === 'hardcopy') {
            book.hardcopyPrice = null;
        }
        
        await book.save();
        await syncStorefrontBookPriceToOfferGroup(book);
        
        res.json(book);
    } catch (error) {
        console.error('Update book error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Delete Book
exports.deleteBook = async (req, res) => {
    try {
        // Find book
        const book = await Book.findById(req.params.id);
        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }
        
        // Remove book
        await book.remove();
        
        res.json({ message: 'Book removed' });
    } catch (error) {
        console.error('Delete book error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get All Books
exports.getAllBooks = async (req, res) => {
    try {
        const books = await Book.find().sort({ createdAt: -1 });
        const enriched = await enrichAdminBookThumbnails(books);
        res.json(enriched);
    } catch (error) {
        console.error('Get all books error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get Book by ID
exports.getBookById = async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);
        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }
        
        res.json(book);
    } catch (error) {
        console.error('Get book by ID error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
