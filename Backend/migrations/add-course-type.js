const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

const Course = require('../models/Course');

// Function to update existing courses
async function addCourseTypeField() {
  try {
    // Find all courses without a courseType field
    const courses = await Course.find({ courseType: { $exists: false } });
    console.log(`Found ${courses.length} courses without courseType field`);

    // Default all existing courses to 'forex' type
    // You can modify this logic if you have a way to determine which should be crypto
    for (const course of courses) {
      course.courseType = 'forex';
      await course.save();
      console.log(`Updated course: ${course.title}`);
    }

    console.log('Migration completed');
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

// Run the migration
addCourseTypeField(); 