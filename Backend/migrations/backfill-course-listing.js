/**
 * Run once: node migrations/backfill-course-listing.js
 * Sets source + listingStatus for legacy courses without breaking the catalog.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('../models/Course');

async function run() {
    await mongoose.connect(process.env.MONGODB_URI, {
        authSource: 'admin',
        serverSelectionTimeoutMS: 30000
    });

    const result = await Course.updateMany(
        {
            $or: [{ source: { $exists: false } }, { listingStatus: { $exists: false } }]
        },
        {
            $set: {
                source: 'admin',
                listingStatus: 'published'
            }
        }
    );

    console.log('backfill-course-listing:', result.modifiedCount, 'documents updated');
    await mongoose.disconnect();
}

run().catch((e) => {
    console.error(e);
    process.exit(1);
});
