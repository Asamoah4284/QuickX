/**
 * Makes the community free, once. Runs at server start.
 *
 * - The Community plan goes off sale (people who bought it keep their record; it no longer matters).
 * - All-Access stops listing Community.
 * - The community gets a room for each plan, readable only by that plan's members.
 *
 * Guarded by PlatformSetting.communityFreeV1, so it never runs again and later edits in
 * admin (turning a plan back on, renaming or archiving a room) are left alone.
 */
const Product = require('../models/Product');
const DiscussionRoom = require('../models/DiscussionRoom');
const PlatformSetting = require('../models/PlatformSetting');
const { FEATURES } = require('../constants/features');
const { getOwnerId } = require('./ownerService');

const PLAN_ROOMS = [
    { requires: FEATURES.SIGNALS, name: 'Signals room', description: 'Talk through the signals with other Signals members.' },
    { requires: FEATURES.COURSES, name: 'Courses room', description: 'Questions and notes on the course lessons.' },
    { requires: FEATURES.MENTORSHIP, name: 'Mentorship room', description: 'Closer guidance from Maxwell for Mentorship members.' },
];

async function makeCommunityFreeOnce() {
    const settings = await PlatformSetting.findOne();
    if (settings?.communityFreeV1) return { ran: false };

    // Rooms belong to the owner. Without one there is no community yet; try again next start.
    const ownerId = await getOwnerId();
    if (!ownerId) return { ran: false, waiting: true };

    const offSale = await Product.updateMany(
        { grants: [FEATURES.COMMUNITY], isActive: true },
        { $set: { isActive: false } }
    );

    const bundles = await Product.find({ grants: FEATURES.COMMUNITY, 'grants.1': { $exists: true } });
    for (const bundle of bundles) {
        bundle.grants = bundle.grants.filter((g) => g !== FEATURES.COMMUNITY);
        bundle.highlights = bundle.highlights.filter((h) => !/^community$/i.test(String(h).trim()));
        if (!bundle.highlights.some((h) => /room/i.test(h))) bundle.highlights.push('Every room in the community');
        await bundle.save();
    }

    let rooms = 0;
    for (const room of PLAN_ROOMS) {
        const exists = await DiscussionRoom.exists({ tutorId: ownerId, requires: room.requires });
        if (exists) continue;
        await DiscussionRoom.create({ tutorId: ownerId, kind: 'general', ...room });
        rooms += 1;
    }

    await PlatformSetting.updateOne({}, { $set: { communityFreeV1: true } }, { upsert: true });
    return { ran: true, offSale: offSale.modifiedCount, bundles: bundles.length, rooms };
}

module.exports = { makeCommunityFreeOnce, PLAN_ROOMS };
