/**
 * Creates the platform admin, or resets its password. Safe to run more than once.
 *
 * Usage (from Backend/):
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a long password' npm run seed:admin
 *
 * There is no default password on purpose: a known password on a live site lets anyone in.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Admin = require('../models/Admin');

const EMAIL = String(process.env.ADMIN_EMAIL || '').trim();
const PASSWORD = String(process.env.ADMIN_PASSWORD || '');
const FULL_NAME = process.env.ADMIN_NAME || 'Platform Admin';

async function run() {
    if (!/^\S+@\S+\.\S+$/.test(EMAIL)) {
        console.error('Set ADMIN_EMAIL to the admin email address.');
        process.exit(1);
    }
    if (PASSWORD.length < 12) {
        console.error('Set ADMIN_PASSWORD to a password of at least 12 characters.');
        process.exit(1);
    }
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

    console.log('Done. Sign in on the admin login page with this email and password.');
    await mongoose.disconnect();
    process.exit(0);
}

run().catch((err) => {
    console.error(err);
    process.exit(1);
});
