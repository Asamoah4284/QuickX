/**
 * Make `isPreview` the only flag that opens a lesson.
 *
 * Older code treated a lesson as free if EITHER `free` or `isPreview` was true, and
 * un-ticking "Preview lesson" only cleared `isPreview`, so lessons stayed watchable.
 * This sets `free = isPreview` and `isLocked = !isPreview` on every lesson.
 *
 * Usage (from Backend/):
 *   node migrations/sync-lesson-preview-flag.js --dry-run   # list what would change
 *   node migrations/sync-lesson-preview-flag.js             # apply
 *
 * Lessons listed as "WILL LOCK" are currently watchable for free and will be locked.
 * If any of them should stay a preview, tick "Preview lesson" on it in the course
 * editor after running this.
 */
const mongoose = require('mongoose');
require('dotenv').config();

const Course = require('../models/Course');

const DRY_RUN = process.argv.includes('--dry-run');

async function run() {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 30000 });
    console.log(`Connected. Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'APPLY'}`);

    const courses = await Course.find({}).select('title modules');
    let lessonsChanged = 0;
    let lessonsLocked = 0;
    let coursesChanged = 0;

    for (const course of courses) {
        let dirty = false;
        (course.modules || []).forEach((mod) => {
            (mod.sections || []).forEach((sec) => {
                (sec.lessons || []).forEach((lesson) => {
                    const isPreview = lesson.isPreview === true;
                    const wantFree = isPreview;
                    const wantLocked = !isPreview;
                    if (lesson.free === wantFree && lesson.isLocked === wantLocked) return;

                    const wasOpen = lesson.free === true && !isPreview;
                    if (wasOpen) lessonsLocked += 1;
                    lessonsChanged += 1;
                    console.log(
                        `${wasOpen ? 'WILL LOCK ' : 'sync flags'} | ${course.title} | ${mod.title} > ${sec.title} > ${lesson.title}` +
                            ` | free ${lesson.free} -> ${wantFree}, isLocked ${lesson.isLocked} -> ${wantLocked}`
                    );

                    lesson.free = wantFree;
                    lesson.isLocked = wantLocked;
                    dirty = true;
                });
            });
        });

        if (dirty) {
            coursesChanged += 1;
            if (!DRY_RUN) {
                // Targeted update: skip full-document validation so unrelated legacy data cannot block the fix.
                await Course.updateOne({ _id: course._id }, { $set: { modules: course.toObject().modules } });
            }
        }
    }

    console.log('');
    console.log(`Courses scanned:           ${courses.length}`);
    console.log(`Courses ${DRY_RUN ? 'to change' : 'changed'}:          ${coursesChanged}`);
    console.log(`Lessons ${DRY_RUN ? 'to change' : 'changed'}:          ${lessonsChanged}`);
    console.log(`  of which free -> locked: ${lessonsLocked}`);
    await mongoose.disconnect();
}

run().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
});
