const Program = require('../models/Program');

const DEFAULT_PROGRAMS = [
    {
        name: 'Forex Creator Program',
        slug: 'forex-creator',
        description: 'Publish and sell your own Forex courses on QuickX Learn.',
        courseType: 'forex',
        price: 299,
        currency: 'GHS',
        billingPeriod: 'one_time',
        isActive: true
    },
    {
        name: 'Crypto Creator Program',
        slug: 'crypto-creator',
        description: 'Publish and sell your own Cryptocurrency courses on QuickX Learn.',
        courseType: 'crypto',
        price: 299,
        currency: 'GHS',
        billingPeriod: 'one_time',
        isActive: true
    },
    {
        name: 'Web Development Creator Program',
        slug: 'webdev-creator',
        description: 'Publish and sell your own Web Development courses on QuickX Learn.',
        courseType: 'webdev',
        price: 349,
        currency: 'GHS',
        billingPeriod: 'one_time',
        isActive: true
    }
];

async function seedPrograms() {
    for (const p of DEFAULT_PROGRAMS) {
        const exists = await Program.findOne({ slug: p.slug });
        if (!exists) {
            await Program.create(p);
            console.log(`[seedPrograms] Created program: ${p.slug}`);
        }
    }

    const Course = require('../models/Course');
    const r = await Course.updateMany(
        { $or: [{ source: { $exists: false } }, { listingStatus: { $exists: false } }] },
        { $set: { source: 'admin', listingStatus: 'published' } }
    );
    if (r.modifiedCount > 0) {
        console.log(`[seedPrograms] Backfilled ${r.modifiedCount} courses with listing fields`);
    }
}

module.exports = { seedPrograms, DEFAULT_PROGRAMS };
