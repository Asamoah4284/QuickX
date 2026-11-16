const axios = require('axios');
const DeviceToken = require('../models/DeviceToken');

/** Sends notifications to the QuickX phone app through Expo's push service. */

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH_SIZE = 100; // Expo accepts up to 100 messages per request.

const isExpoToken = (token) => /^Expo(nent)?PushToken\[.+\]$/.test(String(token || ''));

/** Split a list into groups of `size`. (Pure, unit tested.) */
function chunk(list, size = BATCH_SIZE) {
    const out = [];
    for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
    return out;
}

/** One Expo message per device token. (Pure, unit tested.) */
function buildMessages(tokens, { title, body, url, data = {} }) {
    return tokens.filter(isExpoToken).map((to) => ({
        to,
        title: title || 'QuickX',
        body: body || '',
        sound: 'default',
        priority: 'high',
        channelId: 'default',
        data: { ...data, ...(url ? { url } : {}) },
    }));
}

/** Tokens Expo says no longer exist, so they can be deleted. (Pure, unit tested.) */
function deadTokens(messages, tickets) {
    const dead = [];
    (tickets || []).forEach((ticket, i) => {
        if (ticket?.status === 'error' && ticket?.details?.error === 'DeviceNotRegistered' && messages[i]) {
            dead.push(messages[i].to);
        }
    });
    return dead;
}

/** Send to every app install of these users. Never throws. */
async function sendToUsers(userIds, payload) {
    try {
        const rows = await DeviceToken.find({ userId: { $in: userIds } }).select('token').lean();
        const messages = buildMessages(rows.map((r) => r.token), payload);
        if (!messages.length) return 0;

        let sent = 0;
        for (const batch of chunk(messages)) {
            try {
                const { data } = await axios.post(EXPO_PUSH_URL, batch, {
                    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
                    timeout: 15000,
                });
                const dead = deadTokens(batch, data?.data);
                if (dead.length) await DeviceToken.deleteMany({ token: { $in: dead } });
                sent += batch.length - dead.length;
            } catch (err) {
                console.error('expo push batch failed:', err.response?.status || err.message);
            }
        }
        return sent;
    } catch (err) {
        console.error('expo push failed:', err.message);
        return 0;
    }
}

module.exports = { sendToUsers, chunk, buildMessages, deadTokens, isExpoToken };
