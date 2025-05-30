const helmet = require('helmet');

// Security headers middleware
const securityHeaders = (req, res, next) => {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Enable XSS filter
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Strict Transport Security
    if (process.env.NODE_ENV === 'production') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    
    // Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Content Security Policy
    res.setHeader('Content-Security-Policy', 
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "font-src 'self' https://fonts.gstatic.com; " +
        "img-src 'self' data: https: blob:; " +
        "connect-src 'self' https://api.paystack.co https://*.amazonaws.com; " +
        "frame-ancestors 'none';"
    );
    
    next();
};

// Request size limiting
const requestSizeLimiter = (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (contentLength > maxSize) {
        return res.status(413).json({ 
            message: 'Request entity too large. Maximum size is 10MB.' 
        });
    }
    
    next();
};

// Prevent parameter pollution
const preventParamPollution = (req, res, next) => {
    // Convert arrays to first value for all query parameters
    Object.keys(req.query).forEach(key => {
        if (Array.isArray(req.query[key])) {
            req.query[key] = req.query[key][0];
        }
    });
    
    next();
};

module.exports = {
    securityHeaders,
    requestSizeLimiter,
    preventParamPollution
}; 