const ProgramEnrollment = require('../models/ProgramEnrollment');
const Program = require('../models/Program');

/**
 * Create program enrollment after successful payment. Idempotent on transactionId.
 */
async function createEnrollmentFromPayment({ userId, programId, transactionId, paymentId }) {
    const existing = await ProgramEnrollment.findOne({ transactionId });
    if (existing) {
        return existing;
    }

    const program = await Program.findById(programId);
    if (!program || !program.isActive) {
        throw new Error('Program not found or inactive');
    }

    let endsAt = null;
    if (program.billingPeriod === 'subscription') {
        endsAt = new Date();
        endsAt.setFullYear(endsAt.getFullYear() + 1);
    }

    try {
        return await ProgramEnrollment.create({
            userId,
            programId,
            status: 'active',
            transactionId,
            paymentId: paymentId || null,
            startsAt: new Date(),
            endsAt
        });
    } catch (err) {
        if (err.code === 11000) {
            return ProgramEnrollment.findOne({ transactionId });
        }
        throw err;
    }
}

/**
 * Returns true if user has an active enrollment for the given course track.
 */
async function hasActiveEnrollmentForCourseType(userId, courseType) {
    const programs = await Program.find({ courseType, isActive: true }).select('_id');
    const programIds = programs.map((p) => p._id);
    if (programIds.length === 0) return false;

    const now = new Date();
    const enrollment = await ProgramEnrollment.findOne({
        userId,
        programId: { $in: programIds },
        status: 'active',
        $or: [{ endsAt: null }, { endsAt: { $gt: now } }]
    });
    return !!enrollment;
}

module.exports = {
    createEnrollmentFromPayment,
    hasActiveEnrollmentForCourseType
};
