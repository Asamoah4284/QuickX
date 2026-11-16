/**
 * Move everything the old mentor account owns (courses, community, Pies, events, books...)
 * to Maxwell's account, and make Maxwell the owner of the site.
 *
 * Preview first (changes nothing):
 *   node scripts/moveContentToOwner.js --from richard@example.com --to maxwell@example.com
 *
 * Then do it:
 *   node scripts/moveContentToOwner.js --from richard@example.com --to maxwell@example.com --apply
 *
 * --from / --to take an email, a phone number (0241234567) or a user id.
 *
 * Options:
 *   --apply          Make the changes. Without it, the script only shows what it would change.
 *   --with-messages  Also hand over the old account's private chats (Maxwell joins those
 *                    conversations in place of the old account). Off by default.
 *   --demote-from    Turn the old account into a normal member account afterwards.
 *   --undo <file>    Put everything back, using the undo file a previous --apply saved.
 *
 * Not moved: the old account's own purchases, plans, wallet, course enrolments, likes,
 * votes, notifications it received and phone logins. Those belong to that person.
 *
 * Every --apply saves an undo file in scripts/move-backups/. Safe to run twice.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// Field moves: in each collection, every document whose `field` is the old account
// gets the new account instead. `where` narrows the match.
const MOVES = [
    // The site's content
    { model: 'Course', field: 'createdBy' },
    { model: 'Course', field: 'instructor', where: { instructorModel: 'User' } },
    { model: 'Book', field: 'createdBy' },
    { model: 'BookOfferGroup', field: 'createdBy' },
    { model: 'Event', field: 'createdBy' },
    { model: 'TradingPie', field: 'ownerId' },
    { model: 'TradingPie', field: 'tutorId' },

    // The community and mentoring: everything filed under the mentor
    { model: 'DiscussionRoom', field: 'tutorId' },
    { model: 'CommunityPost', field: 'tutorId' },
    { model: 'CommunityQuestion', field: 'tutorId' },
    { model: 'CommunityPoll', field: 'tutorId' },
    { model: 'CommunityResource', field: 'tutorId' },
    { model: 'CommunityReport', field: 'tutorId' },
    { model: 'CommunityBlock', field: 'tutorId' },
    { model: 'LiveSession', field: 'tutorId' },
    { model: 'Conversation', field: 'tutorId' },
    { model: 'Booking', field: 'tutorId' },
    { model: 'Notification', field: 'tutorId' },
    { model: 'GamificationEvent', field: 'tutorId' },
    { model: 'UserBadge', field: 'tutorId' },
    { model: 'TutorSubscription', field: 'tutorId' },
    { model: 'Transaction', field: 'tutorId' },
    { model: 'Payout', field: 'tutorId' },

    // What the old account wrote as the mentor
    { model: 'CommunityPost', field: 'authorId' },
    { model: 'CommunityQuestion', field: 'authorId' },
    { model: 'CommunityAnswer', field: 'authorId' },
    { model: 'CommunityComment', field: 'authorId' },
    { model: 'CommunityPoll', field: 'createdBy' },
    { model: 'CommunityResource', field: 'uploadedBy' },
    { model: 'Notification', field: 'actorId' },
];

const MESSAGE_MOVES = [
    { model: 'Conversation', field: 'participantIds', array: true },
    { model: 'Message', field: 'senderId' },
];

function loadModels() {
    const dir = path.join(__dirname, '..', 'models');
    for (const file of fs.readdirSync(dir)) if (file.endsWith('.js')) require(path.join(dir, file));
}

function args() {
    const list = process.argv.slice(2);
    const get = (name) => {
        const i = list.indexOf(name);
        return i >= 0 ? list[i + 1] : undefined;
    };
    return {
        from: get('--from'),
        to: get('--to'),
        undo: get('--undo'),
        apply: list.includes('--apply'),
        withMessages: list.includes('--with-messages'),
        demoteFrom: list.includes('--demote-from'),
    };
}

async function findUser(value) {
    const User = mongoose.model('User');
    const text = String(value || '').trim();
    if (!text) return null;
    if (mongoose.Types.ObjectId.isValid(text) && text.length === 24) return User.findById(text).lean();
    if (text.includes('@')) return User.findOne({ email: text.toLowerCase() }).lean();
    const local = text.replace(/\D/g, '').replace(/^233/, '0');
    return User.findOne({ phone: { $in: [text, local, `+233${local.slice(1)}`, `233${local.slice(1)}`] } }).lean();
}

const describe = (u) => `${u.fullName} <${u.email || u.phone || 'no contact'}> id ${u._id} role ${u.role}`;

/** Change one field from `fromId` to `toId`. Records what changed in `log` for undo. */
async function moveField(move, fromId, toId, apply, log) {
    const Model = mongoose.model(move.model);
    const filter = { ...(move.where || {}), [move.field]: fromId };
    const ids = await Model.find(filter).distinct('_id');
    if (!ids.length || !apply) return { count: ids.length, merged: 0 };

    const entry = { model: move.model, field: move.field, array: Boolean(move.array), ids: ids.map(String), deleted: [] };
    log.push(entry);

    if (move.array) {
        // Swap the id inside the array; drop it if the new account is already there.
        for (const id of ids) {
            const doc = await Model.findById(id).select(move.field).lean();
            const list = (doc[move.field] || []).map(String);
            const next = list.includes(String(toId)) ? list.filter((x) => x !== String(fromId)) : list.map((x) => (x === String(fromId) ? String(toId) : x));
            await Model.collection.updateOne({ _id: id }, { $set: { [move.field]: next.map((x) => new mongoose.Types.ObjectId(x)) } });
        }
        return { count: ids.length, merged: 0 };
    }

    try {
        await Model.collection.updateMany({ _id: { $in: ids } }, { $set: { [move.field]: toId } });
        return { count: ids.length, merged: 0 };
    } catch (err) {
        if (err.code !== 11000) throw err;
    }

    // A unique index clashed: the new account already has the same record. Move what can be
    // moved one by one, and remove the old account's copy where the new one already exists.
    let merged = 0;
    for (const id of ids) {
        try {
            await Model.collection.updateOne({ _id: id, [move.field]: fromId }, { $set: { [move.field]: toId } });
        } catch (err) {
            if (err.code !== 11000) throw err;
            const doc = await Model.collection.findOne({ _id: id });
            if (doc) {
                entry.deleted.push(doc);
                await Model.collection.deleteOne({ _id: id });
                merged += 1;
            }
        }
    }
    entry.ids = entry.ids.filter((x) => !entry.deleted.some((d) => String(d._id) === x));
    return { count: ids.length, merged };
}

async function setOwner(toId, apply, log) {
    const PlatformSetting = mongoose.model('PlatformSetting');
    const settings = await PlatformSetting.findOne().sort({ createdAt: -1 }).lean();
    const before = settings?.ownerUserId ? String(settings.ownerUserId) : null;
    if (before === String(toId)) return 'Maxwell is already set as the site owner.';
    if (!apply) return `Would set the site owner to Maxwell (now: ${before || 'not set'}).`;
    if (settings) await PlatformSetting.collection.updateOne({ _id: settings._id }, { $set: { ownerUserId: toId } });
    else await PlatformSetting.create({ ownerUserId: toId });
    log.push({ setting: 'ownerUserId', before });
    return 'Set the site owner to Maxwell.';
}

async function moveTutorProfile(fromId, toId, apply, log) {
    const TutorProfile = mongoose.model('TutorProfile');
    const [oldProfile, newProfile] = await Promise.all([TutorProfile.findOne({ userId: fromId }).lean(), TutorProfile.findOne({ userId: toId }).lean()]);
    if (!oldProfile) return 'The old account has no tutor profile.';
    if (newProfile) return 'Both accounts have a tutor profile. Kept Maxwell\'s and left the old one as it is.';
    if (!apply) return 'Would move the tutor profile (bio, photo, links) to Maxwell.';
    await TutorProfile.collection.updateOne({ _id: oldProfile._id }, { $set: { userId: toId } });
    log.push({ model: 'TutorProfile', field: 'userId', array: false, ids: [String(oldProfile._id)], deleted: [] });
    return 'Moved the tutor profile to Maxwell.';
}

async function promoteTo(to, apply, log) {
    if (to.role === 'tutor' && to.creatorStatus === 'approved') return null;
    if (!apply) return 'Would mark Maxwell\'s account as the approved mentor.';
    await mongoose.model('User').collection.updateOne({ _id: to._id }, { $set: { role: 'tutor', creatorStatus: 'approved' } });
    log.push({ user: String(to._id), role: to.role, creatorStatus: to.creatorStatus });
    return 'Marked Maxwell\'s account as the approved mentor.';
}

async function demote(from, apply, log) {
    if (!apply) return 'Would turn the old account into a normal member account.';
    await mongoose.model('User').collection.updateOne({ _id: from._id }, { $set: { role: 'student', creatorStatus: 'not_applied' } });
    log.push({ user: String(from._id), role: from.role, creatorStatus: from.creatorStatus });
    return 'Turned the old account into a normal member account.';
}

async function undo(file) {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    const fromId = new mongoose.Types.ObjectId(data.from.id);
    const toId = new mongoose.Types.ObjectId(data.to.id);
    console.log(`Undoing the move from ${data.from.name} to ${data.to.name} made on ${data.at}`);
    for (const entry of data.log.slice().reverse()) {
        if (entry.setting === 'ownerUserId') {
            const PlatformSetting = mongoose.model('PlatformSetting');
            const settings = await PlatformSetting.findOne().sort({ createdAt: -1 });
            if (settings) await PlatformSetting.collection.updateOne({ _id: settings._id }, { $set: { ownerUserId: entry.before ? new mongoose.Types.ObjectId(entry.before) : null } });
            console.log('  site owner put back');
            continue;
        }
        if (entry.user) {
            await mongoose.model('User').collection.updateOne({ _id: new mongoose.Types.ObjectId(entry.user) }, { $set: { role: entry.role, creatorStatus: entry.creatorStatus } });
            console.log(`  account ${entry.user} role put back`);
            continue;
        }
        const Model = mongoose.model(entry.model);
        const ids = entry.ids.map((x) => new mongoose.Types.ObjectId(x));
        if (entry.array) {
            for (const id of ids) {
                const doc = await Model.collection.findOne({ _id: id });
                if (!doc) continue;
                const list = (doc[entry.field] || []).map(String).filter((x) => x !== String(toId));
                list.push(String(fromId));
                await Model.collection.updateOne({ _id: id }, { $set: { [entry.field]: list.map((x) => new mongoose.Types.ObjectId(x)) } });
            }
        } else if (ids.length) {
            await Model.collection.updateMany({ _id: { $in: ids } }, { $set: { [entry.field]: fromId } });
        }
        for (const doc of entry.deleted || []) {
            doc._id = new mongoose.Types.ObjectId(doc._id);
            await Model.collection.insertOne(restoreIds(doc)).catch(() => {});
        }
        console.log(`  ${entry.model}.${entry.field}: ${ids.length} put back${entry.deleted?.length ? `, ${entry.deleted.length} restored` : ''}`);
    }
    console.log('Done. Restart the backend so it picks up the owner again.');
}

/** JSON turns ObjectIds into strings; turn 24-hex strings back into ObjectIds. */
function restoreIds(value) {
    if (Array.isArray(value)) return value.map(restoreIds);
    if (value && typeof value === 'object') {
        for (const key of Object.keys(value)) value[key] = restoreIds(value[key]);
        return value;
    }
    if (typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value)) return new mongoose.Types.ObjectId(value);
    return value;
}

async function main() {
    const opts = args();
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!uri) throw new Error('MONGODB_URI is not set. Run this from the Backend folder with the .env file.');
    loadModels();
    await mongoose.connect(uri);

    if (opts.undo) return undo(opts.undo);

    if (!opts.from || !opts.to) {
        throw new Error('Say whose content to move: --from <email|phone|id> --to <email|phone|id>');
    }
    const [from, to] = await Promise.all([findUser(opts.from), findUser(opts.to)]);
    if (!from) throw new Error(`No account found for --from ${opts.from}`);
    if (!to) throw new Error(`No account found for --to ${opts.to}`);
    if (String(from._id) === String(to._id)) throw new Error('--from and --to are the same account.');

    console.log(opts.apply ? '\nMOVING CONTENT\n' : '\nPREVIEW (nothing will change; add --apply to do it)\n');
    console.log(`From: ${describe(from)}`);
    console.log(`To:   ${describe(to)}\n`);

    const log = [];
    const moves = [...MOVES, ...(opts.withMessages ? MESSAGE_MOVES : [])];
    let total = 0;
    for (const move of moves) {
        const { count, merged } = await moveField(move, from._id, to._id, opts.apply, log);
        total += count;
        if (count) console.log(`  ${move.model}.${move.field}: ${count}${merged ? ` (${merged} already on Maxwell's account, old copy removed)` : ''}`);
    }
    if (!total) console.log('  No content found on the old account.');

    if (!opts.withMessages) {
        const chats = await mongoose.model('Conversation').countDocuments({ participantIds: from._id });
        if (chats) console.log(`\n  ${chats} private chat(s) of the old account were left alone. Add --with-messages to hand them over too.`);
    }

    console.log('');
    for (const step of [moveTutorProfile(from._id, to._id, opts.apply, log), promoteTo(to, opts.apply, log), setOwner(to._id, opts.apply, log)]) {
        const note = await step;
        if (note) console.log(`  ${note}`);
    }
    if (opts.demoteFrom) console.log(`  ${await demote(from, opts.apply, log)}`);

    const envOwner = String(process.env.OWNER_USER_ID || '').trim();
    if (envOwner && envOwner !== String(to._id)) {
        console.log(`\n  WARNING: OWNER_USER_ID in .env is ${envOwner}. Change it to ${to._id} (or empty it), or the site keeps the old owner.`);
    }

    if (opts.apply) {
        const dir = path.join(__dirname, 'move-backups');
        fs.mkdirSync(dir, { recursive: true });
        const file = path.join(dir, `move-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
        fs.writeFileSync(
            file,
            JSON.stringify({ at: new Date().toISOString(), from: { id: String(from._id), name: from.fullName }, to: { id: String(to._id), name: to.fullName }, log }, null, 2)
        );
        console.log(`\nDone. Undo file saved: ${file}`);
        console.log('To put everything back: node scripts/moveContentToOwner.js --undo "<that file>"');
        console.log('Restart the backend so it picks up the new owner straight away.');
    } else {
        console.log('\nNothing was changed. Run again with --apply to make these changes.');
    }
}

main()
    .catch((err) => {
        console.error(`\nStopped: ${err.message}`);
        process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
