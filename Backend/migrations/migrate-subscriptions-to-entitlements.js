/**
 * Carry active Basic / Premium / Diamond subscribers over to the new per-feature
 * access, with the same expiry date:
 *   basic   -> courses
 *   premium -> courses, community, signals
 *   diamond -> courses, community, signals, mentorship
 *
 * The server also runs this on startup; this script exists so it can be previewed.
 *
 * Usage (from Backend/):
 *   node migrations/migrate-subscriptions-to-entitlements.js --dry-run
 *   node migrations/migrate-subscriptions-to-entitlements.js
 */
const mongoose = require('mongoose');
require('dotenv').config();

const DRY_RUN = process.argv.includes('--dry-run');

async function run() {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 30000 });
    console.log(`Connected. Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'APPLY'}`);

    const { migrateLegacySubscriptions } = require('../services/entitlementService');
    const result = await migrateLegacySubscriptions({ dryRun: DRY_RUN, log: (line) => console.log(line) });

    console.log('');
    console.log(`Active subscriptions found:  ${result.active}`);
    console.log(`${DRY_RUN ? 'Would carry over' : 'Carried over'}:            ${result.migrated}`);
    console.log(`Skipped (unknown plan):      ${result.skipped}`);
    console.log(`Already carried over:        ${result.active - result.migrated - result.skipped}`);
    await mongoose.disconnect();
}

run().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
});
