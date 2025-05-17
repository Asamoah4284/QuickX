const mongoose = require('mongoose');
const Admin = require('./models/Admin');
require('dotenv').config();

const createAdmin = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Create admin user
        const admin = new Admin({
            email: 'admin@quickx.com',
            password: 'admin123', // This will be hashed by the pre-save middleware
            fullName: 'QuickX Admin',
            role: 'superadmin',
            permissions: ['create_course', 'edit_course', 'delete_course', 'manage_users', 'manage_payments']
        });

        await admin.save();
        console.log('Admin user created successfully');
        console.log('Email: admin@quickx.com');
        console.log('Password: admin123');

    } catch (error) {
        console.error('Error creating admin:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
};

createAdmin(); 