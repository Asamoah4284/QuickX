const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Event = require('../models/Event');
const EventTicket = require('../models/EventTicket');
const Payment = require('../models/Payment');
const User = require('../models/User');
const Admin = require('../models/Admin');
const auth = require('../middleware/auth');

/**
 * Middleware: Allow either web Admin (Admin collection) or mobile Admin (User with role==='admin')
 */
const requireAdmin = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 1. Check if token belongs to Admin model (web admin)
        if (decoded.id) {
            const admin = await Admin.findById(decoded.id).select('-password');
            if (admin) {
                req.admin = admin;
                req.isAdmin = true;
                return next();
            }
        }

        // 2. Check if token belongs to User model (mobile user with admin role)
        const userId = decoded.userId || decoded.id;
        if (userId) {
            const user = await User.findById(userId).select('-password');
            if (user && user.role === 'admin') {
                req.user = user;
                req.isAdmin = true;
                return next();
            }
        }

        return res.status(403).json({ message: 'Admin access required' });
    } catch (error) {
        return res.status(401).json({ message: 'Invalid or expired token', error: error.message });
    }
};

/**
 * Optional user auth helper: Extracts user if token is present, continues otherwise.
 */
const optionalUserAuth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token || token === 'local') return next();

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Check Admin model first
        if (decoded.id) {
            const admin = await Admin.findById(decoded.id).select('-password');
            if (admin) {
                req.admin = admin;
                req.isAdmin = true;
            }
        }

        // Check User model
        const userId = decoded.userId || decoded.id;
        if (userId && !req.admin) {
            const user = await User.findById(userId).select('-password');
            if (user) {
                req.user = user;
                if (user.role === 'admin') req.isAdmin = true;
            }
        }
    } catch {
        // Ignore token errors for public routes
    }
    next();
};

function generateTicketNumber() {
    const timeHex = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `QX-EVT-${timeHex}-${rand}`;
}

// -------------------------------------------------------------
// PUBLIC / USER ROUTES
// -------------------------------------------------------------

/**
 * GET /api/events
 * Fetch list of events with filtering (status, free/paid, type, search)
 */
router.get('/', optionalUserAuth, async (req, res) => {
    try {
        const {
            status = 'published',
            isFree,
            category,
            eventType,
            search,
            timeFilter = 'all', // 'upcoming', 'past', 'all'
            limit = 50
        } = req.query;

        const query = {};

        // Only admins can see drafts/cancelled unless specified
        if (status && status !== 'all') {
            query.status = status;
        } else if (!req.isAdmin && (!req.user || req.user.role !== 'admin')) {
            query.status = 'published';
        }

        if (isFree !== undefined && isFree !== '') {
            query.isFree = isFree === 'true';
        }

        if (category && category !== 'all') {
            query.category = new RegExp(`^${category}$`, 'i');
        }

        if (eventType && eventType !== 'all') {
            query.eventType = eventType;
        }

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { venue: { $regex: search, $options: 'i' } },
                { tags: { $in: [new RegExp(search, 'i')] } }
            ];
        }

        const now = new Date();
        if (timeFilter === 'upcoming') {
            query.startDate = { $gte: now };
        } else if (timeFilter === 'past') {
            query.startDate = { $lt: now };
        }

        const events = await Event.find(query)
            .sort({ startDate: 1 })
            .limit(Number(limit))
            .lean();

        // If user is authenticated, check which events they have tickets for
        if (req.user) {
            const userTickets = await EventTicket.find({
                userId: req.user._id,
                eventId: { $in: events.map((e) => e._id) },
                status: 'confirmed'
            }).select('eventId ticketNumber').lean();

            const ticketMap = new Map();
            userTickets.forEach((t) => ticketMap.set(String(t.eventId), t.ticketNumber));

            const enhanced = events.map((e) => ({
                ...e,
                hasTicket: ticketMap.has(String(e._id)),
                myTicketNumber: ticketMap.get(String(e._id)) || null
            }));

            return res.json({ events: enhanced });
        }

        res.json({ events });
    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({ message: 'Error fetching events', error: error.message });
    }
});

/**
 * GET /api/events/my/tickets
 * Get tickets owned by the current logged-in user
 */
router.get('/my/tickets', auth, async (req, res) => {
    try {
        const tickets = await EventTicket.find({ userId: req.user._id })
            .populate('eventId')
            .sort({ createdAt: -1 })
            .lean();

        res.json({ tickets });
    } catch (error) {
        console.error('Error fetching user tickets:', error);
        res.status(500).json({ message: 'Error fetching your tickets', error: error.message });
    }
});

/**
 * GET /api/events/:id
 * Get single event details + user ticket status
 */
router.get('/:id', optionalUserAuth, async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid event ID' });
        }

        const event = await Event.findById(id).lean();
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        let userTicket = null;
        if (req.user) {
            userTicket = await EventTicket.findOne({
                eventId: event._id,
                userId: req.user._id,
                status: 'confirmed'
            }).lean();
        }

        res.json({
            event: {
                ...event,
                spotsRemaining: event.capacity > 0 ? Math.max(0, event.capacity - (event.ticketsSold || 0)) : 999999,
                hasTicket: Boolean(userTicket),
                ticket: userTicket
            }
        });
    } catch (error) {
        console.error('Error fetching event details:', error);
        res.status(500).json({ message: 'Error fetching event details', error: error.message });
    }
});

/**
 * POST /api/events/:id/register
 * Register for a FREE event
 */
router.post('/:id/register', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const { attendeeName, attendeeEmail, attendeePhone, notes } = req.body;

        const event = await Event.findById(id);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        if (event.status !== 'published') {
            return res.status(400).json({ message: 'This event is not open for registration' });
        }

        if (!event.isFree && event.price > 0) {
            return res.status(400).json({ message: 'This is a paid event. Please purchase a ticket to register.' });
        }

        // Capacity check
        if (event.capacity > 0 && event.ticketsSold >= event.capacity) {
            return res.status(400).json({ message: 'Sorry, this event is already fully booked!' });
        }

        // Check if user already registered
        const existingTicket = await EventTicket.findOne({
            eventId: event._id,
            userId: req.user._id,
            status: 'confirmed'
        });

        if (existingTicket) {
            return res.status(400).json({
                message: 'You are already registered for this event.',
                ticket: existingTicket
            });
        }

        const ticketNumber = generateTicketNumber();

        const ticket = new EventTicket({
            eventId: event._id,
            userId: req.user._id,
            ticketNumber,
            attendeeName: attendeeName || req.user.fullName || 'Attendee',
            attendeeEmail: attendeeEmail || req.user.email,
            attendeePhone: attendeePhone || req.user.phone || '',
            pricePaid: 0,
            isFree: true,
            status: 'confirmed',
            paymentMethod: 'free',
            notes: notes || ''
        });

        await ticket.save();

        // Increment tickets sold
        event.ticketsSold = (event.ticketsSold || 0) + 1;
        await event.save();

        res.status(201).json({
            message: 'Registration successful! Your ticket is confirmed.',
            ticket,
            event
        });
    } catch (error) {
        console.error('Error registering for event:', error);
        res.status(500).json({ message: 'Registration failed', error: error.message });
    }
});

/**
 * POST /api/events/:id/buy-ticket
 * Purchase ticket for a PAID event
 */
router.post('/:id/buy-ticket', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            attendeeName,
            attendeeEmail,
            attendeePhone,
            paymentMethod = 'direct',
            transactionId,
            momoNumber,
            network
        } = req.body;

        const event = await Event.findById(id);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        if (event.status !== 'published') {
            return res.status(400).json({ message: 'This event is not open for ticket sales' });
        }

        // Capacity check
        if (event.capacity > 0 && event.ticketsSold >= event.capacity) {
            return res.status(400).json({ message: 'Sorry, this event is sold out!' });
        }

        // Check if user already has a ticket
        const existingTicket = await EventTicket.findOne({
            eventId: event._id,
            userId: req.user._id,
            status: 'confirmed'
        });

        if (existingTicket) {
            return res.status(400).json({
                message: 'You already have a ticket for this event.',
                ticket: existingTicket
            });
        }

        const pricePaid = event.isFree ? 0 : (Number(event.price) || 0);
        const ticketNumber = generateTicketNumber();
        const txId = transactionId || `qx_evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

        let paymentDoc = null;
        if (pricePaid > 0) {
            paymentDoc = new Payment({
                userId: req.user._id,
                itemType: 'event',
                itemId: event._id,
                originalAmount: pricePaid,
                finalAmount: pricePaid,
                paymentMethod: paymentMethod === 'direct' ? 'direct' : 'mobile_money',
                status: 'completed',
                transactionId: txId,
                paymentDetails: {
                    momoNumber: momoNumber || attendeePhone || req.user.phone || '',
                    network: network || 'MTN',
                    paidAt: new Date()
                }
            });
            await paymentDoc.save();
        }

        const ticket = new EventTicket({
            eventId: event._id,
            userId: req.user._id,
            ticketNumber,
            attendeeName: attendeeName || req.user.fullName || 'Attendee',
            attendeeEmail: attendeeEmail || req.user.email,
            attendeePhone: attendeePhone || momoNumber || req.user.phone || '',
            pricePaid,
            isFree: pricePaid === 0,
            status: 'confirmed',
            paymentMethod,
            transactionId: txId,
            paymentId: paymentDoc ? paymentDoc._id : null
        });

        await ticket.save();

        // Increment event tickets sold
        event.ticketsSold = (event.ticketsSold || 0) + 1;
        await event.save();

        res.status(201).json({
            message: 'Ticket purchased successfully!',
            ticket,
            payment: paymentDoc,
            event
        });
    } catch (error) {
        console.error('Error buying event ticket:', error);
        res.status(500).json({ message: 'Ticket purchase failed', error: error.message });
    }
});

// -------------------------------------------------------------
// ADMIN MANAGEMENT ROUTES
// -------------------------------------------------------------

/**
 * POST /api/events
 * Admin creates an event
 */
router.post('/', requireAdmin, async (req, res) => {
    try {
        const {
            title,
            description,
            shortDescription,
            category = 'General',
            eventType = 'online',
            venue = 'Virtual',
            location = '',
            meetingLink = '',
            startDate,
            endDate,
            time = '2:00 PM GMT',
            coverImage = '',
            organizer,
            isFree = false,
            price = 0,
            currency = 'GHS',
            capacity = 150,
            status = 'published',
            tags = [],
            speakers = []
        } = req.body;

        if (!title || !description || !startDate) {
            return res.status(400).json({ message: 'Title, description, and start date are required' });
        }

        const parsedIsFree = Boolean(isFree || Number(price) === 0);
        const finalPrice = parsedIsFree ? 0 : Math.max(0, Number(price) || 0);

        const newEvent = new Event({
            title: String(title).trim(),
            description: String(description).trim(),
            shortDescription: shortDescription ? String(shortDescription).trim() : String(description).substring(0, 200),
            category,
            eventType,
            venue: venue ? String(venue).trim() : (eventType === 'online' ? 'Virtual (Online)' : 'To Be Announced'),
            location: String(location || '').trim(),
            meetingLink: String(meetingLink || '').trim(),
            startDate: new Date(startDate),
            endDate: endDate ? new Date(endDate) : undefined,
            time: String(time).trim(),
            coverImage: String(coverImage || '').trim(),
            organizer: {
                name: organizer?.name || 'QuickX Learning',
                email: organizer?.email || 'events@quickxlearn.com',
                phone: organizer?.phone || '',
                avatar: organizer?.avatar || ''
            },
            isFree: parsedIsFree,
            price: finalPrice,
            currency: currency || 'GHS',
            capacity: Number(capacity) > 0 ? Number(capacity) : 150,
            status: status || 'published',
            tags: Array.isArray(tags) ? tags : [],
            speakers: Array.isArray(speakers) ? speakers : [],
            createdBy: req.user ? req.user._id : null,
            adminCreatedBy: req.admin ? req.admin._id : null
        });

        await newEvent.save();

        res.status(201).json({
            message: 'Event created successfully',
            event: newEvent
        });
    } catch (error) {
        console.error('Error creating event:', error);
        res.status(500).json({ message: 'Error creating event', error: error.message });
    }
});

/**
 * PUT /api/events/:id
 * Admin updates an event
 */
router.put('/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = { ...req.body };

        if (updateData.isFree !== undefined) {
            updateData.isFree = Boolean(updateData.isFree);
            if (updateData.isFree) updateData.price = 0;
        }

        if (updateData.price !== undefined && !updateData.isFree) {
            updateData.price = Math.max(0, Number(updateData.price) || 0);
        }

        if (updateData.startDate) {
            updateData.startDate = new Date(updateData.startDate);
        }
        if (updateData.endDate) {
            updateData.endDate = new Date(updateData.endDate);
        }

        const updated = await Event.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
        if (!updated) {
            return res.status(404).json({ message: 'Event not found' });
        }

        res.json({
            message: 'Event updated successfully',
            event: updated
        });
    } catch (error) {
        console.error('Error updating event:', error);
        res.status(500).json({ message: 'Error updating event', error: error.message });
    }
});

/**
 * DELETE /api/events/:id
 * Admin deletes an event
 */
router.delete('/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await Event.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Also clean up or mark tickets as cancelled
        await EventTicket.updateMany({ eventId: id }, { $set: { status: 'cancelled' } });

        res.json({ message: 'Event deleted successfully' });
    } catch (error) {
        console.error('Error deleting event:', error);
        res.status(500).json({ message: 'Error deleting event', error: error.message });
    }
});

/**
 * GET /api/events/:id/attendees
 * Admin views list of attendees for an event
 */
router.get('/:id/attendees', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const event = await Event.findById(id);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        const attendees = await EventTicket.find({ eventId: id })
            .populate('userId', 'fullName email phone avatar')
            .sort({ createdAt: -1 })
            .lean();

        res.json({
            event,
            totalAttendees: attendees.length,
            attendees
        });
    } catch (error) {
        console.error('Error fetching event attendees:', error);
        res.status(500).json({ message: 'Error fetching attendees', error: error.message });
    }
});

/**
 * GET /api/events/admin/stats
 * Admin dashboard metrics for events
 */
router.get('/admin/stats', requireAdmin, async (req, res) => {
    try {
        const totalEvents = await Event.countDocuments();
        const publishedEvents = await Event.countDocuments({ status: 'published' });
        const upcomingEvents = await Event.countDocuments({
            status: 'published',
            startDate: { $gte: new Date() }
        });
        const totalTickets = await EventTicket.countDocuments({ status: 'confirmed' });

        const revenueAgg = await EventTicket.aggregate([
            { $match: { status: 'confirmed' } },
            { $group: { _id: null, totalRevenue: { $sum: '$pricePaid' } } }
        ]);
        const totalRevenue = revenueAgg[0]?.totalRevenue || 0;

        res.json({
            totalEvents,
            publishedEvents,
            upcomingEvents,
            totalTickets,
            totalRevenue
        });
    } catch (error) {
        console.error('Error fetching event stats:', error);
        res.status(500).json({ message: 'Error fetching event stats', error: error.message });
    }
});

module.exports = router;
