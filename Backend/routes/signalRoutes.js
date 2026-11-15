const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const requireFeature = require('../middleware/requireFeature');
const Signal = require('../models/Signal');
const { SIGNAL_STATUSES, OPEN_STATUSES } = require('../models/Signal');
const { FEATURES } = require('../constants/features');
const { listUserIdsWithFeature } = require('../services/entitlementService');
const { notifyMany } = require('../services/notificationService');

const CLOSED_STATUSES = SIGNAL_STATUSES.filter((s) => !OPEN_STATUSES.includes(s));

function serialize(s) {
    return {
        id: String(s._id),
        pair: s.pair,
        direction: s.direction,
        orderType: s.orderType,
        entry: s.entry,
        stopLoss: s.stopLoss,
        takeProfits: s.takeProfits,
        timeframe: s.timeframe,
        note: s.note,
        chartImage: s.chartImage,
        status: s.status,
        resultPips: s.resultPips,
        updates: (s.updates || []).map((u) => ({ text: u.text, at: u.at })),
        createdAt: s.createdAt,
        closedAt: s.closedAt,
    };
}

/** Summary of finished signals. (Pure — unit tested.) */
function computeStats(closed) {
    const decided = closed.filter((s) => s.status !== 'cancelled');
    const wins = decided.filter((s) => s.status === 'tp_hit' || (s.status === 'closed' && Number(s.resultPips) > 0)).length;
    const losses = decided.filter((s) => s.status === 'sl_hit' || (s.status === 'closed' && Number(s.resultPips) < 0)).length;
    const counted = wins + losses;
    const totalPips = decided.reduce((sum, s) => sum + (Number(s.resultPips) || 0), 0);
    return {
        total: decided.length,
        wins,
        losses,
        winRate: counted ? Math.round((wins / counted) * 100) : null,
        totalPips: Math.round(totalPips * 10) / 10,
    };
}

async function loadStats() {
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const closed = await Signal.find({ status: { $in: CLOSED_STATUSES }, closedAt: { $gte: since } })
        .select('status resultPips')
        .lean();
    return { ...computeStats(closed), periodDays: 90 };
}

function notifySubscribers({ title, body, signalId }) {
    // Fire-and-forget: posting a signal must not wait on push delivery.
    listUserIdsWithFeature(FEATURES.SIGNALS)
        .then((userIds) => notifyMany(userIds, { type: 'signal', entityType: 'signal', entityId: signalId, title, body }))
        .catch((err) => console.error('signal notify:', err.message));
}

function describe(s) {
    const tps = (s.takeProfits || []).join(' / ');
    return `${s.direction.toUpperCase()} ${s.pair} @ ${s.entry} · SL ${s.stopLoss} · TP ${tps}`;
}

// ── Public teaser: track record only, never live levels ──────────────────────

router.get('/public', async (req, res) => {
    try {
        const [stats, recent, openCount] = await Promise.all([
            loadStats(),
            Signal.find({ status: { $in: CLOSED_STATUSES.filter((s) => s !== 'cancelled') } })
                .sort({ closedAt: -1 })
                .limit(8)
                .select('pair direction status resultPips closedAt createdAt')
                .lean(),
            Signal.countDocuments({ status: { $in: OPEN_STATUSES } }),
        ]);
        res.json({
            stats,
            openCount,
            recent: recent.map((s) => ({
                id: String(s._id),
                pair: s.pair,
                direction: s.direction,
                status: s.status,
                resultPips: s.resultPips,
                closedAt: s.closedAt,
            })),
        });
    } catch (err) {
        console.error('signals/public:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ── Members with the signals feature ─────────────────────────────────────────

router.get('/', auth, requireFeature(FEATURES.SIGNALS), async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));

        const [open, history, historyTotal, stats] = await Promise.all([
            Signal.find({ status: { $in: OPEN_STATUSES } }).sort({ createdAt: -1 }).lean(),
            Signal.find({ status: { $in: CLOSED_STATUSES } })
                .sort({ closedAt: -1, createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            Signal.countDocuments({ status: { $in: CLOSED_STATUSES } }),
            loadStats(),
        ]);

        res.json({
            open: open.map(serialize),
            history: history.map(serialize),
            historyTotal,
            page,
            limit,
            stats,
        });
    } catch (err) {
        console.error('signals list:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ── Admin ────────────────────────────────────────────────────────────────────

function readNumber(value, label) {
    const n = Number(value);
    if (value === '' || value === null || value === undefined || !Number.isFinite(n) || n <= 0) {
        const err = new Error(`${label} must be a positive number`);
        err.status = 400;
        throw err;
    }
    return n;
}

function readSignalBody(body) {
    const pair = String(body.pair || '').trim().toUpperCase();
    if (!pair || pair.length > 20) {
        const err = new Error('Pair is required');
        err.status = 400;
        throw err;
    }
    if (!['buy', 'sell'].includes(body.direction)) {
        const err = new Error('Direction must be buy or sell');
        err.status = 400;
        throw err;
    }
    const tpInput = Array.isArray(body.takeProfits) ? body.takeProfits : [body.takeProfits];
    const takeProfits = tpInput.filter((v) => v !== '' && v != null).map((v, i) => readNumber(v, `Take profit ${i + 1}`));
    if (!takeProfits.length || takeProfits.length > 5) {
        const err = new Error('Provide 1 to 5 take-profit levels');
        err.status = 400;
        throw err;
    }
    return {
        pair,
        direction: body.direction,
        orderType: String(body.orderType || 'market').trim().slice(0, 30),
        entry: readNumber(body.entry, 'Entry'),
        stopLoss: readNumber(body.stopLoss, 'Stop loss'),
        takeProfits,
        timeframe: String(body.timeframe || '').trim().slice(0, 10),
        note: String(body.note || '').trim().slice(0, 2000),
        chartImage: String(body.chartImage || '').trim().slice(0, 1000),
    };
}

router.get('/admin', adminAuth, async (req, res) => {
    try {
        const signals = await Signal.find({}).sort({ createdAt: -1 }).limit(200).lean();
        res.json({ signals: signals.map(serialize), stats: await loadStats() });
    } catch (err) {
        console.error('signals admin list:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/admin', adminAuth, async (req, res) => {
    try {
        const signal = await Signal.create({ ...readSignalBody(req.body || {}), createdBy: req.adminId });
        notifySubscribers({ title: `New signal: ${signal.pair}`, body: describe(signal), signalId: signal._id });
        res.status(201).json({ signal: serialize(signal) });
    } catch (err) {
        if (err.status === 400 || err.name === 'ValidationError') return res.status(400).json({ message: err.message });
        console.error('signals create:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

/** Edit levels, post an update, or close the signal with a result. */
router.patch('/admin/:id', adminAuth, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'Invalid id' });
        const signal = await Signal.findById(req.params.id);
        if (!signal) return res.status(404).json({ message: 'Signal not found' });

        const b = req.body || {};
        const editsLevels = ['pair', 'direction', 'entry', 'stopLoss', 'takeProfits'].some((k) => b[k] !== undefined);
        if (editsLevels) {
            Object.assign(signal, readSignalBody({ ...serialize(signal), ...b }));
        } else {
            if (b.note !== undefined) signal.note = String(b.note).trim().slice(0, 2000);
            if (b.chartImage !== undefined) signal.chartImage = String(b.chartImage).trim().slice(0, 1000);
            if (b.timeframe !== undefined) signal.timeframe = String(b.timeframe).trim().slice(0, 10);
        }

        let pushTitle = null;
        let pushBody = '';

        const updateText = String(b.update || '').trim().slice(0, 500);
        if (updateText) {
            signal.updates.push({ text: updateText });
            pushTitle = `${signal.pair} update`;
            pushBody = updateText;
        }

        if (b.status !== undefined && b.status !== signal.status) {
            if (!SIGNAL_STATUSES.includes(b.status)) return res.status(400).json({ message: 'Invalid status' });
            signal.status = b.status;
            signal.closedAt = OPEN_STATUSES.includes(b.status) ? null : new Date();
            const labels = { tp_hit: 'Take profit hit', sl_hit: 'Stop loss hit', closed: 'Closed', cancelled: 'Cancelled', active: 'Re-opened' };
            pushTitle = `${signal.pair}: ${labels[b.status]}`;
            pushBody = updateText || describe(signal);
        }
        if (b.resultPips !== undefined) {
            const pips = b.resultPips === null || b.resultPips === '' ? null : Number(b.resultPips);
            if (pips !== null && !Number.isFinite(pips)) return res.status(400).json({ message: 'Invalid result' });
            signal.resultPips = pips;
        }

        await signal.save();
        if (pushTitle) notifySubscribers({ title: pushTitle, body: pushBody, signalId: signal._id });
        res.json({ signal: serialize(signal) });
    } catch (err) {
        if (err.status === 400 || err.name === 'ValidationError') return res.status(400).json({ message: err.message });
        console.error('signals update:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

router.delete('/admin/:id', adminAuth, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'Invalid id' });
        const deleted = await Signal.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'Signal not found' });
        res.json({ success: true });
    } catch (err) {
        console.error('signals delete:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
module.exports.computeStats = computeStats;
