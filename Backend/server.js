const express = require('express');
const mongoose = require('mongoose');
const s3Config = require('./config/s3Config');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());

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

app.get('/s3Url', async (req, res) => {
    const uploadURL = await s3Config.generateImageUrl();
    res.json({ url: uploadURL });
});

app.get('/s3VideoUrl', async (req, res) => {
    const uploadURL = await s3Config.generateVideoUrl();
    res.json({ url: uploadURL });
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
    res.status(500).json({ 
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
