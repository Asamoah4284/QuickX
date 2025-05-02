const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const contentProtection = {
    // Generate unique watermark for content
    generateWatermark: (userId, contentId) => {
        const timestamp = Date.now();
        return crypto
            .createHash('sha256')
            .update(`${userId}-${contentId}-${timestamp}`)
            .digest('hex')
            .substring(0, 16);
    },

    // Middleware to protect video streams
    videoProtection: async (req, res, next) => {
        try {
            // Check for valid authentication token
            const token = req.header('Authorization')?.replace('Bearer ', '');
            if (!token) {
                return res.status(401).json({ message: 'Authentication required' });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;

            // Validate video access permission
            const videoId = req.params.videoId;
            const user = await User.findById(decoded.userId)
                .populate('purchasedCourses');

            const hasAccess = user.purchasedCourses.some(course => 
                course.topics.some(topic => topic.videoUrl.includes(videoId))
            );

            if (!hasAccess) {
                return res.status(403).json({ message: 'Access denied' });
            }

            // Add custom headers to prevent direct downloads
            res.setHeader('Content-Disposition', 'inline');
            res.setHeader('X-Content-Type-Options', 'nosniff');
            
            next();
        } catch (error) {
            res.status(401).json({ message: 'Invalid token' });
        }
    },

    // Middleware to protect ebook access
    ebookProtection: async (req, res, next) => {
        try {
            const token = req.header('Authorization')?.replace('Bearer ', '');
            if (!token) {
                return res.status(401).json({ message: 'Authentication required' });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;

            // Validate ebook access
            const bookId = req.params.bookId;
            const user = await User.findById(decoded.userId)
                .populate('purchasedBooks');

            const hasAccess = user.purchasedBooks.some(book => 
                book._id.toString() === bookId
            );

            if (!hasAccess) {
                return res.status(403).json({ message: 'Access denied' });
            }

            // Generate watermark
            req.watermark = contentProtection.generateWatermark(
                decoded.userId,
                bookId
            );

            next();
        } catch (error) {
            res.status(401).json({ message: 'Invalid token' });
        }
    }
};

module.exports = contentProtection;