const webpush = require('web-push');
const Notification = require('../models/Notification');
const PushSubscription = require('../models/PushSubscription');

let vapidConfigured = false;

function configureWebPush() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:ops@quickxlearn.com';
  if (!publicKey || !privateKey) {
    vapidConfigured = false;
    return false;
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

configureWebPush();

function notificationDeepLink(doc) {
  if (doc?.tutorId) return `/instructors/${doc.tutorId}/community`;
  return '/membership';
}

async function sendPushToUser(userId, payload) {
  if (!vapidConfigured && !configureWebPush()) return;

  const subs = await PushSubscription.find({ userId }).lean();
  if (!subs.length) return;

  const body = JSON.stringify(payload);
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys,
          },
          body
        );
      } catch (err) {
        const status = err?.statusCode || err?.status;
        if (status === 404 || status === 410) {
          await PushSubscription.deleteOne({ _id: sub._id }).catch(() => {});
        } else {
          console.error('web-push send failed:', err?.message || err);
        }
      }
    })
  );
}

async function createNotification({
  userId,
  type,
  actorId = null,
  tutorId = null,
  entityType = '',
  entityId = null,
  title = '',
  body = '',
}) {
  if (!userId) return null;
  if (actorId && String(userId) === String(actorId)) return null;

  try {
    const doc = await Notification.create({
      userId,
      type,
      actorId,
      tutorId,
      entityType,
      entityId,
      title,
      body,
    });

    // Fire-and-forget so API latency is not blocked by push delivery
    sendPushToUser(userId, {
      title: title || 'Quick-X',
      body: body || '',
      url: notificationDeepLink(doc),
      notificationId: String(doc._id),
      tutorId: tutorId ? String(tutorId) : null,
      tag: `qx-${doc._id}`,
    }).catch((err) => console.error('push fan-out:', err?.message || err));

    return doc;
  } catch (err) {
    console.error('createNotification:', err.message);
    return null;
  }
}

async function notifyMany(userIds, payload) {
  const unique = [...new Set((userIds || []).map((id) => String(id)).filter(Boolean))];
  await Promise.all(unique.map((userId) => createNotification({ ...payload, userId })));
}

module.exports = {
  createNotification,
  notifyMany,
  sendPushToUser,
  configureWebPush,
};
