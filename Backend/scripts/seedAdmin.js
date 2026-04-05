/**
 * Idempotent: creates or updates the platform admin by email.
 *
 * Default credentials (change PASSWORD before production):
 *   email:    admin@gmail.com
 *   password: admin123
 *
 * Usage (from Backend/):
 *   npm run seed:admin
 *   node scripts/seedAdmin.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Admin = require('../models/Admin');

const EMAIL = 'admin@gmail.com';
const PASSWORD = 'admin123';
const FULL_NAME = 'Platform Admin';

async function run() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('Missing MONGODB_URI in Backend/.env');
        process.exit(1);
    }

    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    let admin = await Admin.findOne({ email: EMAIL.toLowerCase() });

    if (admin) {
        admin.email = EMAIL.toLowerCase();
        admin.fullName = FULL_NAME;
        admin.password = PASSWORD;
        admin.role = 'superadmin';
        await admin.save();
        console.log('Updated existing admin:', EMAIL);
    } else {
        admin = new Admin({
            email: EMAIL.toLowerCase(),
            password: PASSWORD,
            fullName: FULL_NAME,
            role: 'superadmin',
            permissions: [
                'create_course',
                'edit_course',
                'delete_course',
                'manage_users',
                'manage_payments',
            ],
        });
        await admin.save();
        console.log('Created admin:', EMAIL);
    }

    console.log('Done. Log in via the admin login page with this email and password.');
    await mongoose.disconnect();
    process.exit(0);
}

run().catch((err) => {
    console.error(err);
    process.exit(1);
});
