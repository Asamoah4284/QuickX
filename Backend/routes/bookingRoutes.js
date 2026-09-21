const express = require('express');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Booking = require('../models/Booking');
const User = require('../models/User');
const WalletTransaction = require('../models/WalletTransaction');

const router = express.Router();

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
  }
  next();
}

router.get('/', auth, async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json({
      bookings: bookings.map((b) => ({
        id: String(b._id),
        tutorId: String(b.tutorId),
        tutorName: b.tutorName,
        serviceId: b.serviceId,
        serviceName: b.serviceName,
        date: b.date,
        time: b.time,
        durationMins: b.durationMins,
        price: b.price,
        status: b.status,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to load bookings' });
  }
});

router.post(
  '/',
  auth,
  [
    body('tutorId').isMongoId(),
    body('tutorName').optional().isString(),
    body('serviceId').notEmpty(),
    body('serviceName').notEmpty(),
    body('date').notEmpty(),
    body('time').notEmpty(),
    body('durationMins').optional().isInt({ min: 15 }),
    body('price').isFloat({ min: 0 }),
  ],
  handleValidation,
  async (req, res) => {
    try {
      const price = Number(req.body.price);
      const user = await User.findById(req.user._id);
      const balance = Number(user.walletBalance || 0);
      if (balance < price) {
        return res.status(400).json({ message: 'Insufficient wallet balance', balance });
      }

      const nextBalance = Number((balance - price).toFixed(2));
      user.walletBalance = nextBalance;
      await user.save();

      const ref = `qx_booking_${Date.now()}`;
      await WalletTransaction.create({
        userId: req.user._id,
        type: 'payment',
        amount: -price,
        balanceAfter: nextBalance,
        label: `Session: ${req.body.serviceName}`,
        reference: ref,
        status: 'completed',
      });

      const booking = await Booking.create({
        userId: req.user._id,
        tutorId: req.body.tutorId,
        tutorName: req.body.tutorName || '',
        serviceId: req.body.serviceId,
        serviceName: req.body.serviceName,
        date: req.body.date,
        time: req.body.time,
        durationMins: Number(req.body.durationMins || 60),
        price,
        status: 'upcoming',
        walletTransactionRef: ref,
      });

      res.status(201).json({
        booking: {
          id: String(booking._id),
          tutorId: String(booking.tutorId),
          tutorName: booking.tutorName,
          serviceId: booking.serviceId,
          serviceName: booking.serviceName,
          date: booking.date,
          time: booking.time,
          durationMins: booking.durationMins,
          price: booking.price,
          status: booking.status,
        },
        walletBalance: nextBalance,
      });
    } catch (error) {
      res.status(500).json({ message: error.message || 'Failed to create booking' });
    }
  }
);

router.patch('/:id/cancel', auth, async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, userId: req.user._id });
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.status !== 'upcoming') {
      return res.status(400).json({ message: 'Only upcoming bookings can be cancelled' });
    }
    booking.status = 'cancelled';
    await booking.save();
    res.json({ booking: { id: String(booking._id), status: booking.status } });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to cancel booking' });
  }
});

module.exports = router;
