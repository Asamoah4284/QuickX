const mongoose = require('mongoose');

/**
 * QuickX has one mentor. Courses, the community and bookings are stored against
 * his tutor User id; this resolves that id in one place.
 *
 * Order: OWNER_USER_ID env → PlatformSetting.ownerUserId → the only approved tutor.
 */
let cachedOwnerId = null;
let cachedAt = 0;
const CACHE_MS = 5 * 60 * 1000;

async function resolveOwnerId() {
    const fromEnv = String(process.env.OWNER_USER_ID || '').trim();
    if (mongoose.Types.ObjectId.isValid(fromEnv)) return fromEnv;

    const PlatformSetting = require('../models/PlatformSetting');
    const settings = await PlatformSetting.findOne().sort({ createdAt: -1 }).select('ownerUserId').lean();
    if (settings?.ownerUserId) return String(settings.ownerUserId);

    const User = require('../models/User');
    const tutors = await User.find({ role: 'tutor', creatorStatus: 'approved' }).select('_id').limit(2).lean();
    if (tutors.length === 1) return String(tutors[0]._id);
    if (tutors.length > 1) {
        // Several tutor accounts exist from the old marketplace: default to Maxwell.
        const ownerName = String(process.env.OWNER_NAME || 'Maxwell').trim();
        const escaped = ownerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const named = await User.find({
            role: 'tutor',
            creatorStatus: 'approved',
            fullName: new RegExp(escaped, 'i'),
        })
            .select('_id fullName')
            .limit(2)
            .lean();
        if (named.length === 1) return String(named[0]._id);
        console.warn(
            `ownerService: ${named.length} approved tutors match "${ownerName}". Set OWNER_USER_ID to pick the owner.`
        );
    }
    return null;
}

async function getOwnerId() {
    if (cachedOwnerId && Date.now() - cachedAt < CACHE_MS) return cachedOwnerId;
    const id = await resolveOwnerId();
    if (id) {
        cachedOwnerId = id;
        cachedAt = Date.now();
    }
    return id;
}

async function isOwner(userId) {
    if (!userId) return false;
    const ownerId = await getOwnerId();
    return Boolean(ownerId) && String(ownerId) === String(userId);
}

function clearOwnerCache() {
    cachedOwnerId = null;
    cachedAt = 0;
}

module.exports = { getOwnerId, isOwner, clearOwnerCache };
