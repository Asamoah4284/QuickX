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

// CORS must run before rate limiting / routes so every response (incl. 429 & OPTIONS preflight) gets CORS headers
const corsOptions = {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

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

// Apply rate limiting to all API routes (OPTIONS preflight skipped so CORS stays reliable)
app.use('/api/', (req, res, next) => {
    if (req.method === 'OPTIONS') return next();
    return apiLimiter(req, res, next);
});

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Prevent NoSQL injection attacks
app.use(mongoSanitize());

// Database connection
console.log('Attempting to connect to MongoDB...');

mongoose.connect(process.env.MONGODB_URI, {
    authSource: 'admin',
    connectTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    serverSelectionTimeoutMS: 30000,
    retryWrites: true,
    maxPoolSize: 10,
    minPoolSize: 0,
    heartbeatFrequencyMS: 10000
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
const { seedPrograms } = require('./scripts/seedPrograms');
const Book = require('./models/Book');
const BookOfferGroup = require('./models/BookOfferGroup');
const {
    ensureOfferGroupPlanBooksEmbeds,
    migrateMarketplaceListings,
} = require('./utils/bookOfferHelpers');
db.once('open', async () => {
    console.log('Connected to MongoDB');
    try {
        const legacy = await Book.updateMany(
            { listingStatus: 'approved' },
            { $set: { listingStatus: 'published' } }
        );
        if (legacy.modifiedCount > 0) {
            console.log(`Migrated ${legacy.modifiedCount} book(s) listingStatus approved → published`);
        }
    } catch (e) {
        console.error('book listingStatus migration:', e.message);
    }
    try {
        const groups = await BookOfferGroup.find({});
        let filled = 0;
        for (const group of groups) {
            const before = JSON.stringify(group.options?.map((o) => o.planBooks));
            const updated = await ensureOfferGroupPlanBooksEmbeds(group);
            const after = JSON.stringify(updated.options?.map((o) => o.planBooks));
            if (before !== after) filled += 1;
        }
        if (filled > 0) {
            console.log(`Backfilled planBooks (PDF URLs) on ${filled} offer group(s)`);
        }
    } catch (e) {
        console.error('offer group planBooks migration:', e.message);
    }
    try {
        const listingFix = await migrateMarketplaceListings();
        if (listingFix > 0) {
            console.log(`Marketplace listings: synced storefront for ${listingFix} offer group(s)`);
        }
    } catch (e) {
        console.error('marketplace listing migration:', e.message);
    }
    try {
        await seedPrograms();
    } catch (e) {
        console.error('seedPrograms:', e.message);
    }
});

// Routes
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/courses', require('./routes/courseRoutes'));
app.use('/api/books', require('./routes/bookRoutes'));
app.use('/api/affiliate', require('./routes/affiliateRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api', require('./routes/couponRoutes'));
app.use('/api/mentorships', require('./routes/mentorshipRoutes'));
app.use('/api/programs', require('./routes/programRoutes'));
app.use('/api/instructor/courses', require('./routes/instructorCourseRoutes'));
app.use('/api/instructor/books', require('./routes/instructorBookRoutes'));
app.use('/api/instructor/book-offers', require('./routes/instructorOfferGroupRoutes'));
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
        const { contentType } = req.query;
        // Log the request for audit purposes
        console.log(`S3 URL generated for ${req.userType}: ${req.user._id} at ${new Date().toISOString()} (type: ${contentType})`);
        
        const uploadURL = await s3Config.generateImageUrl(contentType);
        console.log(`[API] Image upload URL requested by ${req.userType}: ${req.user?._id || 'unknown'} (type: ${contentType})`);
        res.json({ url: uploadURL });
    } catch (error) {
        console.error('S3 URL generation error:', error);
        res.status(500).json({ message: 'Failed to generate upload URL' });
    }
});

app.get('/s3VideoUrl', flexibleAuth, s3UrlLimiter, async (req, res) => {
    try {
        const { contentType } = req.query;
        console.log(
            `S3 Video URL generated for ${req.userType}: ${req.user._id} at ${new Date().toISOString()} (type: ${contentType || 'default'})`
        );

        const uploadURL = await s3Config.generateVideoUrl(contentType);
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
const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

/** Graceful shutdown so nodemon/dev restarts close HTTP + Mongo cleanly (fewer ECONNRESET mid-query logs). */
function gracefulShutdown(signal) {
    console.log(`\n${signal}: closing HTTP server and MongoDB connection...`);
    server.close((err) => {
        if (err) console.error('Error closing HTTP server:', err.message);
        mongoose
            .disconnect()
            .then(() => {
                console.log('MongoDB disconnected.');
                process.exit(0);
            })
            .catch((e) => {
                console.error('MongoDB close error:', e.message);
                process.exit(1);
            });
    });
    setTimeout(() => {
        console.error('Forced shutdown after timeout.');
        process.exit(1);
    }, 10000).unref();
}

process.once('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.once('SIGINT', () => gracefulShutdown('SIGINT'));
