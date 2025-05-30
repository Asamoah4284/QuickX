const express = require('express');
const mongoose = require('mongoose');
const s3Config = require('./config/s3Config');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const helmet = require('helmet');
const auth = require('./middleware/auth');
const flexibleAuth = require('./middleware/flexibleAuth');
const { securityHeaders, requestSizeLimiter, preventParamPollution } = require('./middleware/security');

const app = express();

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false, // We use our custom CSP
    crossOriginEmbedderPolicy: false
}));

// Apply custom security headers
app.use(securityHeaders);

// Request size limiting
app.use(requestSizeLimiter);

// Prevent parameter pollution
app.use(preventParamPollution);

// Rate limiting - general API limit
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    message: 'Too many authentication attempts, please try again later.',
    skipSuccessfulRequests: true,
});

// S3 URL generation rate limiter
const s3UrlLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // limit each user to 10 requests per windowMs
    message: 'Too many upload requests, please try again later'
});

// Apply rate limiting to all API routes
app.use('/api/', apiLimiter);

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Prevent NoSQL injection attacks
app.use(mongoSanitize());

// CORS configuration
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    
    'https://www.quickxlearn.com',
    'https://quickxlearn.com'
];

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204
};

// Use CORS middleware
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Database connection
console.log('Attempting to connect to MongoDB...');

mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    authSource: 'admin',
    connectTimeoutMS: 30000,
    socketTimeoutMS: 30000,
    serverSelectionTimeoutMS: 30000,
    retryWrites: true
})
.then(() => {
    console.log('MongoDB connection successful');
})
.catch(err => {
    console.error('MongoDB connection error:', err.message);
});

const db = mongoose.connection;
db.on('error', (err) => {
    console.error('MongoDB connection error:', err);
});
db.once('open', () => console.log('Connected to MongoDB'));

// Routes
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/courses', require('./routes/courseRoutes'));
app.use('/api/books', require('./routes/bookRoutes'));
app.use('/api/affiliate', require('./routes/affiliateRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api', require('./routes/couponRoutes'));
app.use('/api/mentorships', require('./routes/mentorshipRoutes'));
app.use('/api', require('./routes/referralRoutes'));
app.use('/api/withdrawals', require('./routes/withdrawalRoutes'));
app.use('/', require('./routes/advertisementRoutes'));

// Serve static files from 'public' folder
app.use(express.static(path.join(__dirname, 'public')));
app.get('/ads.txt', (req, res) => {
    res.sendFile(path.join(__dirname, 'ads.txt'));
});
  
app.get('/sitemap.xml', (req, res) => {
    res.sendFile(path.join(__dirname, 'sitemap.xml'));
});

app.get('/s3Url', flexibleAuth, s3UrlLimiter, async (req, res) => {
    try {
        // Log the request for audit purposes
        console.log(`S3 URL generated for ${req.userType}: ${req.user._id} at ${new Date().toISOString()}`);
        
        const uploadURL = await s3Config.generateImageUrl();
        res.json({ url: uploadURL });
    } catch (error) {
        console.error('S3 URL generation error:', error);
        res.status(500).json({ message: 'Failed to generate upload URL' });
    }
});

app.get('/s3VideoUrl', flexibleAuth, s3UrlLimiter, async (req, res) => {
    try {
        console.log(`S3 Video URL generated for ${req.userType}: ${req.user._id} at ${new Date().toISOString()}`);
        
        const uploadURL = await s3Config.generateVideoUrl();
        res.json({ url: uploadURL });
    } catch (error) {
        console.error('S3 Video URL generation error:', error);
        res.status(500).json({ message: 'Failed to generate upload URL' });
    }
});

app.get('/', async (req, res) => {
    res.send('Hello World');
});

// Add new endpoint to refresh video URL
app.get('/api/courses/:courseId/video-url', async (req, res) => {
    try {
        const { videoUrl } = req.query;
        if (!videoUrl) {
            return res.status(400).json({ error: 'Video URL is required' });
        }

        // Extract the key from the S3 URL
        const url = new URL(videoUrl);
        const key = url.pathname.substring(1); // Remove leading slash

        const params = {
            Bucket: process.env.AWS_BUCKET_NAME || 'quickxlearn',
            Key: key,
            Expires: 60 * 5, // 5 minutes
            ContentType: 'video/mp4'
        };

        const freshUrl = await s3Config.s3.getSignedUrlPromise('getObject', params);
        res.json({ url: freshUrl });
    } catch (error) {
        console.error('Error refreshing video URL:', error);
        res.status(500).json({ error: 'Failed to refresh video URL' });
    }
});

// Error handler middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    
    // Don't leak error details in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    res.status(err.status || 500).json({ 
        message: err.message || 'Server error',
        ...(isDevelopment && { stack: err.stack })
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
