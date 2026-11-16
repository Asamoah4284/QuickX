const Event = require('../models/Event');
const PlatformSetting = require('../models/PlatformSetting');

const DAY = 24 * 60 * 60 * 1000;

/**
 * Two sample sessions that have already ended, so the Events page is not empty on day one.
 * Replace or delete them from Admin > Events once real events are added.
 */
function sampleEvents(now = Date.now()) {
    return [
        {
            title: 'Live Forex Session: Reading Price Action',
            shortDescription: 'Maxwell walked through live charts: market structure, key levels and clean entries.',
            description: `A live online session with Maxwell Donkoh.

What we covered:
- Reading market structure on the higher timeframe
- Marking key support and resistance levels
- Planning an entry, stop loss and take profit before the trade
- Questions from members, answered live`,
            category: 'Trading',
            eventType: 'online',
            venue: 'Online (live stream)',
            location: '',
            meetingLink: '',
            startDate: new Date(now - 21 * DAY),
            endDate: new Date(now - 21 * DAY + 2 * 3600 * 1000),
            time: '7:00 PM - 9:00 PM GMT',
            coverImage: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1200&q=80',
            organizer: { name: 'QuickX', email: '', phone: '+233 55 903 7872', avatar: '' },
            isFree: true,
            price: 0,
            currency: 'GHS',
            capacity: 0,
            ticketsSold: 0,
            status: 'published',
            tags: ['Forex', 'Price Action', 'Live'],
            speakers: [{ name: 'Maxwell Donkoh', title: 'Forex mentor, QuickX', bio: '', avatar: '' }],
        },
        {
            title: 'Risk Management Masterclass',
            shortDescription: 'How to size positions, protect your account and trade with a plan.',
            description: `A masterclass with Maxwell Donkoh on protecting your trading account.

What we covered:
- How much to risk on each trade
- Working out lot size from your stop loss
- Risk to reward, and why it matters more than win rate
- Handling a losing streak without breaking your rules`,
            category: 'Masterclass',
            eventType: 'online',
            venue: 'Online (live stream)',
            location: '',
            meetingLink: '',
            startDate: new Date(now - 45 * DAY),
            endDate: new Date(now - 45 * DAY + 2 * 3600 * 1000),
            time: '6:30 PM - 8:30 PM GMT',
            coverImage: 'https://images.unsplash.com/photo-1642543492481-44e81e3914a7?auto=format&fit=crop&w=1200&q=80',
            organizer: { name: 'QuickX', email: '', phone: '+233 55 903 7872', avatar: '' },
            isFree: true,
            price: 0,
            currency: 'GHS',
            capacity: 0,
            ticketsSold: 0,
            status: 'published',
            tags: ['Forex', 'Risk Management', 'Masterclass'],
            speakers: [{ name: 'Maxwell Donkoh', title: 'Forex mentor, QuickX', bio: '', avatar: '' }],
        },
    ];
}

/**
 * Add the sample events once, only when there are no events at all.
 * A flag is saved so they never come back after the admin deletes them.
 */
async function seedSampleEventsOnce() {
    const settings = await PlatformSetting.findOne().select('sampleEventsSeeded').lean();
    if (settings?.sampleEventsSeeded) return 0;

    let created = 0;
    if ((await Event.countDocuments()) === 0) {
        const docs = await Event.insertMany(sampleEvents());
        created = docs.length;
    }
    await PlatformSetting.updateOne({}, { $set: { sampleEventsSeeded: true } }, { upsert: true });
    return created;
}

module.exports = { seedSampleEventsOnce, sampleEvents };

// `node scripts/seedEvents.js` runs it by hand.
if (require.main === module) {
    require('dotenv').config();
    const mongoose = require('mongoose');
    mongoose
        .connect(process.env.MONGODB_URI || process.env.MONGO_URI)
        .then(seedSampleEventsOnce)
        .then((n) => console.log(n ? `Added ${n} sample events.` : 'Sample events were already added before. Nothing to do.'))
        .catch((err) => console.error('Could not add sample events:', err.message))
        .finally(() => mongoose.disconnect());
}
