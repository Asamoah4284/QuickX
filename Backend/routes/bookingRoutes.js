const express = require('express');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const requireFeature = require('../middleware/requireFeature');
const Booking = require('../models/Booking');
const User = require('../models/User');
const { FEATURES } = require('../constants/features');
const { getOwnerId } = require('../services/ownerService');
const { createNotification } = require('../services/notificationService');

const router = express.Router();

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
  }
  next();
}

function serialize(b) {
  return {
    id: String(b._id),
    serviceName: b.serviceName,
    topic: b.serviceId,
    date: b.date,
    time: b.time,
    durationMins: b.durationMins,
    status: b.status,
    createdAt: b.createdAt,
  };
}

// ── Admin: all session requests ─────────────────────────────────────────────

router.get('/admin', adminAuth, async (req, res) => {
  try {
    const bookings = await Booking.find({})
      .sort({ createdAt: -1 })
      .limit(200)
      .populate('userId', 'fullName email phone')
      .lean();
    res.json({
      bookings: bookings.map((b) => ({
        ...serialize(b),
        member: b.userId
          ? { id: String(b.userId._id), fullName: b.userId.fullName, email: b.userId.email, phone: b.userId.phone || '' }
          : null,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to load bookings' });
  }
});

router.patch('/admin/:id', adminAuth, [body('status').isIn(['upcoming', 'completed', 'cancelled'])], handleValidation, async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    res.json({ booking: serialize(booking) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update booking' });
  }
});

// ── Members with Mentorship access ──────────────────────────────────────────

router.use(auth, requireFeature(FEATURES.MENTORSHIP));

router.get('/', async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(100).lean();
    res.json({ bookings: bookings.map(serialize) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to load bookings' });
  }
});

/** Sessions are included with Mentorship access — nothing is charged here. */
router.post(
  '/',
  [
    body('date').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Date must be YYYY-MM-DD'),
    body('time').matches(/^\d{2}:\d{2}$/).withMessage('Time must be HH:MM'),
    body('topic').optional().isString().isLength({ max: 500 }),
    body('durationMins').optional().isInt({ min: 15, max: 180 }),
  ],
  handleValidation,
  async (req, res) => {
    try {
      const ownerId = await getOwnerId();
      if (!ownerId) return res.status(503).json({ message: 'Mentorship is not set up yet' });

      const when = new Date(`${req.body.date}T${req.body.time}:00`);
      if (Number.isNaN(when.getTime()) || when.getTime() < Date.now()) {
        return res.status(400).json({ message: 'Pick a date and time in the future' });
      }

      const upcoming = await Booking.countDocuments({ userId: req.user._id, status: 'upcoming' });
      if (upcoming >= 3) {
        return res.status(400).json({ message: 'You already have 3 upcoming sessions. Cancel one to book another.' });
      }

      const owner = await User.findById(ownerId).select('fullName').lean();
      const booking = await Booking.create({
        userId: req.user._id,
        tutorId: ownerId,
        tutorName: owner?.fullName || '',
        serviceId: String(req.body.topic || '').trim(),
        serviceName: '1-on-1 session',
        date: req.body.date,
        time: req.body.time,
        durationMins: Number(req.body.durationMins || 60),
        price: 0,
        status: 'upcoming',
      });

      createNotification({
        userId: ownerId,
        type: 'direct_message',
        actorId: req.user._id,
        entityType: 'booking',
        entityId: booking._id,
        title: 'New session request',
        body: `${req.user.fullName} · ${booking.date} ${booking.time}`,
      }).catch(() => {});

      res.status(201).json({ booking: serialize(booking) });
    } catch (error) {
      res.status(500).json({ message: 'Failed to create booking' });
    }
  }
);

router.patch('/:id/cancel', async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, userId: req.user._id });
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.status !== 'upcoming') {
      return res.status(400).json({ message: 'Only upcoming bookings can be cancelled' });
    }
    booking.status = 'cancelled';
    await booking.save();
    res.json({ booking: serialize(booking) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to cancel booking' });
  }
});

module.exports = router;
