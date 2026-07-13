const Notification = require('../models/Notification');

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
    return await Notification.create({
      userId,
      type,
      actorId,
      tutorId,
      entityType,
      entityId,
      title,
      body,
    });
  } catch (err) {
    console.error('createNotification:', err.message);
    return null;
  }
}

async function notifyMany(userIds, payload) {
  const unique = [...new Set((userIds || []).map((id) => String(id)).filter(Boolean))];
  await Promise.all(unique.map((userId) => createNotification({ ...payload, userId })));
}

module.exports = { createNotification, notifyMany };
