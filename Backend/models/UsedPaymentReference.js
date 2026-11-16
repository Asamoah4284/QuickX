const mongoose = require('mongoose');

/**
 * One row per payment reference that has been turned into something (a Pie slice, for now).
 * The reference is the _id, so the database itself refuses to use the same payment twice.
 */
const usedPaymentReferenceSchema = new mongoose.Schema(
    {
        _id: { type: String, required: true },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        purpose: { type: String, required: true },
        itemId: { type: mongoose.Schema.Types.ObjectId, default: null },
        amount: { type: Number, required: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model('UsedPaymentReference', usedPaymentReferenceSchema);
