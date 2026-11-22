/**
 * Removes one admin login. Refuses to remove the last superadmin, so the admin area can't be locked out.
 *
 * Usage (from Backend/):
 *   ADMIN_EMAIL=someone@example.com npm run remove:admin
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Admin = require('../models/Admin');

const EMAIL = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();

async function run() {
    if (!/^\S+@\S+\.\S+$/.test(EMAIL)) {
        console.error('Set ADMIN_EMAIL to the admin email address to remove.');
        process.exit(1);
    }
    if (!process.env.MONGODB_URI) {
        console.error('Missing MONGODB_URI in Backend/.env');
        process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI);
    const admin = await Admin.findOne({ email: EMAIL });
    if (!admin) {
        console.log('No admin with that email. Nothing to do.');
    } else if (admin.role === 'superadmin' && (await Admin.countDocuments({ role: 'superadmin' })) <= 1) {
        console.error('That is the only superadmin left. Create another one first, then remove this one.');
        process.exitCode = 1;
    } else {
        await Admin.deleteOne({ _id: admin._id });
        console.log('Removed admin:', EMAIL);
    }
    await mongoose.disconnect();
}

run().catch((err) => {
    console.error(err);
    process.exit(1);
});
