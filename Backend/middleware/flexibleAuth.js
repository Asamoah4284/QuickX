const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin');

const flexibleAuth = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    // Check if token exists
    if (!token) {
      return res.status(401).json({ message: 'No authentication token, access denied' });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if this is an admin token (has 'role' field) or user token
    if (decoded.role && (decoded.role === 'admin' || decoded.role === 'superadmin')) {
      // This is an admin token - look up admin
      const admin = await Admin.findById(decoded.id).select('-password');
      
      if (!admin) {
        return res.status(401).json({ message: 'Token is valid, but admin not found' });
      }
      
      // Add admin to request object with user-compatible structure
      req.user = admin;
      req.userId = admin._id;
      req.userType = 'admin';
    } else {
      // This is a user token - look up user
      const user = await User.findById(decoded.userId).select('-password');
      
      if (!user) {
        return res.status(401).json({ message: 'Token is valid, but user not found' });
      }
      
      // Add user to request object
      req.user = user;
      req.userId = user._id;
      req.userType = 'user';
    }
    
    next();
  } catch (error) {
    console.error('Flexible auth error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token, access denied' });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired, please login again' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = flexibleAuth; 