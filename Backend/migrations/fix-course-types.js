const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB with proper connection options
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 30000, // Increase timeout to 30 seconds
})
.then(() => {
  console.log('Connected to MongoDB');
  // Run the function only after connection is established
  fixCourseTypes();
})
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

const Course = require('../models/Course');

// Function to fix course types
async function fixCourseTypes() {
  try {
    // Find all courses
    const courses = await Course.find();
    console.log(`Found ${courses.length} total courses`);

    // Check if course is crypto by name/title
    let updatedCount = 0;
    
    for (const course of courses) {
      console.log(`Processing course: ${course.title}, current type: ${course.courseType}`);
      
      // If title contains "crypto" but type is not "crypto", update it
      if ((course.title.toLowerCase().includes('crypto')) && course.courseType !== 'crypto') {
        console.log(`Updating course type based on title: ${course.title}`);
        course.courseType = 'crypto';
        await course.save();
        console.log(`Updated course: ${course.title} to type: crypto`);
        updatedCount++;
      }
    }

    console.log(`Updated ${updatedCount} courses`);
    
    console.log('Course type migration completed successfully');
    
    // Explicitly disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error fixing course types:', error);
    // Disconnect even on error
    await mongoose.disconnect();
    process.exit(1);
  }
} 