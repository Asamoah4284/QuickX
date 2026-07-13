const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Notification = require('../models/Notification');

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
