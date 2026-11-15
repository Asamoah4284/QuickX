const mongoose = require('mongoose');

const SIGNAL_STATUSES = ['active', 'tp_hit', 'sl_hit', 'closed', 'cancelled'];
const OPEN_STATUSES = ['active'];

const signalSchema = new mongoose.Schema(
    {
        pair: { type: String, required: true, trim: true, uppercase: true },
        direction: { type: String, enum: ['buy', 'sell'], required: true },
        /** e.g. "market", "buy limit", "sell stop" */
        orderType: { type: String, trim: true, default: 'market' },
        entry: { type: Number, required: true },
        stopLoss: { type: Number, required: true },
        takeProfits: {
            type: [Number],
            validate: [(v) => Array.isArray(v) && v.length > 0 && v.length <= 5, 'Provide 1 to 5 take-profit levels'],
        },
        timeframe: { type: String, trim: true, default: '' },
        note: { type: String, trim: true, default: '' },
        chartImage: { type: String, trim: true, default: '' },
        status: { type: String, enum: SIGNAL_STATUSES, default: 'active', index: true },
        /** Outcome in pips once closed (positive = profit). */
        resultPips: { type: Number, default: null },
        closedAt: { type: Date, default: null },
        /** Running commentary: "TP1 hit, move SL to entry". */
        updates: [
            {
                text: { type: String, trim: true, required: true },
                at: { type: Date, default: Date.now },
            },
        ],
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
    },
    { timestamps: true }
);

signalSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Signal', signalSchema);
module.exports.SIGNAL_STATUSES = SIGNAL_STATUSES;
module.exports.OPEN_STATUSES = OPEN_STATUSES;
