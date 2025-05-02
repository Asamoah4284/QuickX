const axios = require('axios');
const User = require('../models/User');
const Course = require('../models/Course');
require('dotenv').config();

// Paystack secret key should be in .env
const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;

/**
 * Verify a Paystack payment for a single module purchase
 */
exports.verifyPayment = async (req, res) => {
  try {
    const { reference, moduleId, email } = req.body;

    if (!reference || !moduleId || !email) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required parameters: reference, moduleId, or email'
      });
    }

    // Verify payment with Paystack API
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Check if the verification was successful
    if (response.data.status && response.data.data.status === 'success') {
      // Find user by email or create a new one
      let user = await User.findOne({ email });
      
      if (!user) {
        // Create a new user if not found
        user = new User({
          email,
          purchasedCourses: [{ courseId: moduleId, purchaseDate: new Date() }]
        });
      } else {
        // Add course to user's purchased courses if not already there
        const alreadyPurchased = user.purchasedCourses.some(
          course => course.courseId.toString() === moduleId
        );
        
        if (!alreadyPurchased) {
          user.purchasedCourses.push({
            courseId: moduleId,
            purchaseDate: new Date()
          });
        }
      }

      await user.save();

      // Update course purchase count
      await Course.findByIdAndUpdate(
        moduleId,
        { $inc: { purchaseCount: 1 } },
        { new: true }
      );

      return res.status(200).json({
        status: 'success',
        message: 'Payment verified and course access granted',
        data: { 
          reference: response.data.data.reference,
          amount: response.data.data.amount / 100, // Convert from kobo to GHS
          courseId: moduleId
        }
      });
    } else {
      return res.status(400).json({
        status: 'error',
        message: 'Payment verification failed',
        data: response.data
      });
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Error verifying payment',
      error: error.message
    });
  }
};

/**
 * Verify a Paystack payment for a bundle purchase
 */
exports.verifyBundlePayment = async (req, res) => {
  try {
    const { reference, email } = req.body;

    if (!reference || !email) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required parameters: reference or email'
      });
    }

    // Verify payment with Paystack API
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Check if the verification was successful
    if (response.data.status && response.data.data.status === 'success') {
      // Get all available courses
      const allCourses = await Course.find({}, '_id');
      const courseIds = allCourses.map(course => course._id);

      // Find user by email or create a new one
      let user = await User.findOne({ email });
      
      if (!user) {
        // Create a new user with all courses
        user = new User({
          email,
          purchasedCourses: courseIds.map(id => ({
            courseId: id,
            purchaseDate: new Date()
          }))
        });
      } else {
        // Add all courses to user that are not already purchased
        courseIds.forEach(courseId => {
          const alreadyPurchased = user.purchasedCourses.some(
            course => course.courseId.toString() === courseId.toString()
          );
          
          if (!alreadyPurchased) {
            user.purchasedCourses.push({
              courseId,
              purchaseDate: new Date()
            });
          }
        });
      }

      await user.save();

      // Update purchase count for all courses
      await Course.updateMany(
        { _id: { $in: courseIds } },
        { $inc: { purchaseCount: 1 } }
      );

      return res.status(200).json({
        status: 'success',
        message: 'Bundle payment verified and access granted to all courses',
        data: { 
          reference: response.data.data.reference,
          amount: response.data.data.amount / 100 // Convert from kobo to GHS
        }
      });
    } else {
      return res.status(400).json({
        status: 'error',
        message: 'Bundle payment verification failed',
        data: response.data
      });
    }
  } catch (error) {
    console.error('Bundle payment verification error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Error verifying bundle payment',
      error: error.message
    });
  }
}; 