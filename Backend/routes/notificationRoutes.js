const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Notification = require('../models/Notification');
const PushSubscription = require('../models/PushSubscription');

router.get('/vapid-public-key', (req, res) => {
  const publicKey = process.env.VAPID_PUBLIC_KEY || '';
  if (!publicKey) {
    return res.status(503).json({ message: 'Push notifications are not configured' });
  }
  res.json({ publicKey });
});

router.post('/push-subscribe', auth, async (req, res) => {
  try {
    const sub = req.body?.subscription;
    const endpoint = sub?.endpoint;
    const keys = sub?.keys;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ message: 'Invalid push subscription' });
    }

    const doc = await PushSubscription.findOneAndUpdate(
      { endpoint },
      {
        userId: req.user._id,
        endpoint,
        keys: {
          p256dh: keys.p256dh,
          auth: keys.auth,
        },
        userAgent: String(req.body?.userAgent || req.get('user-agent') || '').slice(0, 500),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ message: 'Subscribed', id: doc._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/push-subscribe', auth, async (req, res) => {
  try {
    const endpoint = req.body?.endpoint || req.query?.endpoint;
    if (endpoint) {
      await PushSubscription.deleteOne({ userId: req.user._id, endpoint });
    } else {
      await PushSubscription.deleteMany({ userId: req.user._id });
    }
    res.json({ message: 'Unsubscribed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 40, 100);
    const unreadOnly = req.query.unread === '1' || req.query.unread === 'true';
    const filter = { userId: req.user._id };
    if (unreadOnly) filter.readAt = null;

    const notifications = await Notification.find(filter)
      .populate('actorId', 'fullName profilePicture')
      .sort({ createdAt: -1 })
      .limit(limit);

    const unreadCount = await Notification.countDocuments({
      userId: req.user._id,
      readAt: null,
    });

    res.json({ notifications, unreadCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/read-all', auth, async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, readAt: null },
      { $set: { readAt: new Date() } }
    );
    res.json({ message: 'All marked read' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/:id/read', auth, async (req, res) => {
  try {
    const n = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { $set: { readAt: new Date() } },
      { new: true }
    );
    if (!n) return res.status(404).json({ message: 'Not found' });
    res.json({ notification: n });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
