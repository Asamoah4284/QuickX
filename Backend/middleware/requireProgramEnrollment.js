const Program = require('../models/Program');
const ProgramEnrollment = require('../models/ProgramEnrollment');

/**
 * Express middleware: after `auth`, requires body.courseType to match an active program enrollment.
 */
async function requireProgramEnrollmentForBodyCourseType(req, res, next) {
    try {
        const courseType = req.body?.courseType;
        if (!courseType || !['forex', 'crypto', 'webdev'].includes(courseType)) {
            return res.status(400).json({ message: 'Valid courseType is required' });
        }

        const programs = await Program.find({ courseType, isActive: true }).select('_id');
        const programIds = programs.map((p) => p._id);
        if (programIds.length === 0) {
            return res.status(403).json({ message: 'No active program for this track' });
        }

        const now = new Date();
        const enrollment = await ProgramEnrollment.findOne({
            userId: req.user._id,
            programId: { $in: programIds },
            status: 'active',
            $or: [{ endsAt: null }, { endsAt: { $gt: now } }]
        }).populate('programId');

        if (!enrollment) {
            return res.status(403).json({
                message: 'Active program enrollment required to create courses in this track'
            });
        }

        req.programEnrollment = enrollment;
        next();
    } catch (err) {
        console.error('requireProgramEnrollmentForBodyCourseType:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}

module.exports = { requireProgramEnrollmentForBodyCourseType };
