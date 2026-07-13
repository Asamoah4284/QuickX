const TutorSubscription = require('../models/TutorSubscription');

const PLAN_DURATION_DAYS = {
  '1m': 30,
  '2m': 60,
  '3m': 90,
  '1y': 365,
};

function planDurationDays(planId) {
  return PLAN_DURATION_DAYS[String(planId)] || 30;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Mark expired rows when endsAt has passed. */
async function expireIfNeeded(sub) {
  if (!sub) return null;
  if (sub.status === 'active' && sub.endsAt && sub.endsAt <= new Date()) {
    sub.status = 'expired';
    await sub.save();
  }
  return sub;
}

/**
 * Create or extend an active subscription after successful payment.
 * Idempotent on transactionId.
 */
async function createOrExtendFromPayment({
  studentId,
  tutorId,
  planId,
  paymentId,
  transactionId,
}) {
  if (transactionId) {
    const existingByTx = await TutorSubscription.findOne({ transactionId });
    if (existingByTx) return existingByTx;
  }

  const days = planDurationDays(planId);
  const now = new Date();

  let sub = await TutorSubscription.findOne({
    studentId,
    tutorId,
    status: 'active',
  }).sort({ endsAt: -1 });

  if (sub && sub.endsAt > now) {
    sub.endsAt = addDays(sub.endsAt, days);
    sub.planId = planId;
    if (paymentId) sub.paymentId = paymentId;
    if (transactionId) sub.transactionId = transactionId;
    await sub.save();
    return sub;
  }

  try {
    return await TutorSubscription.create({
      studentId,
      tutorId,
      planId,
      startsAt: now,
      endsAt: addDays(now, days),
      status: 'active',
      paymentId: paymentId || null,
      transactionId: transactionId || '',
    });
  } catch (err) {
    if (err.code === 11000 && transactionId) {
      return TutorSubscription.findOne({ transactionId });
    }
    throw err;
  }
}

async function getActiveSubscription(studentId, tutorId) {
  const now = new Date();
  let sub = await TutorSubscription.findOne({
    studentId,
    tutorId,
    status: 'active',
    endsAt: { $gt: now },
  }).sort({ endsAt: -1 });

  if (!sub) {
    // Catch stale "active" rows past endsAt
    const stale = await TutorSubscription.findOne({
      studentId,
      tutorId,
      status: 'active',
    }).sort({ endsAt: -1 });
    if (stale) await expireIfNeeded(stale);
  }

  return sub;
}

async function hasActiveSubscription(studentId, tutorId) {
  if (!studentId || !tutorId) return false;
  if (String(studentId) === String(tutorId)) return true;
  const sub = await getActiveSubscription(studentId, tutorId);
  return Boolean(sub);
}

function courseTutorFilter(tutorId) {
  return {
    $or: [{ createdBy: tutorId }, { instructorModel: 'User', instructor: tutorId }],
  };
}

/** Course ids the student owns via enrollment, purchase record, or profile. */
async function getStudentCourseIds(studentId) {
  const Enrollment = require('../models/Enrollment');
  const Purchase = require('../models/Purchase');
  const User = require('../models/User');
  const ids = new Set();

  const enrollments = await Enrollment.find({ studentId }).select('courseId').lean();
  enrollments.forEach((row) => {
    if (row.courseId) ids.add(String(row.courseId));
  });

  const purchases = await Purchase.find({
    userId: studentId,
    status: 'completed',
    courseId: { $exists: true, $ne: null },
  })
    .select('courseId')
    .lean();
  purchases.forEach((row) => {
    if (row.courseId) ids.add(String(row.courseId));
  });

  const user = await User.findById(studentId).select('purchasedCourses').lean();
  (user?.purchasedCourses || []).forEach((courseId) => {
    if (courseId) ids.add(String(courseId));
  });

  return [...ids];
}

/** True if the student is enrolled in any course owned by this tutor. */
async function hasCourseEnrollmentWithTutor(studentId, tutorId) {
  if (!studentId || !tutorId) return false;
  const Course = require('../models/Course');

  const courseIds = await getStudentCourseIds(studentId);
  if (!courseIds.length) return false;

  const match = await Course.findOne({
    _id: { $in: courseIds },
    ...courseTutorFilter(tutorId),
  })
    .select('_id')
    .lean();

  return Boolean(match);
}

/** Subscription, course enrollment, or tutor viewing their own community. */
async function hasCommunityAccess(studentId, tutorId) {
  if (!studentId || !tutorId) return false;
  if (String(studentId) === String(tutorId)) return true;
  if (await hasActiveSubscription(studentId, tutorId)) return true;
  return hasCourseEnrollmentWithTutor(studentId, tutorId);
}

/** Tutor ids the student can access via subscription or course enrollment. */
async function listAccessibleTutorIdsForStudent(studentId) {
  const Course = require('../models/Course');
  const User = require('../models/User');
  const now = new Date();
  const tutorIds = new Set();

  await TutorSubscription.updateMany(
    { studentId, status: 'active', endsAt: { $lte: now } },
    { $set: { status: 'expired' } }
  );

  const subs = await TutorSubscription.find({
    studentId,
    status: 'active',
    endsAt: { $gt: now },
  })
    .populate('tutorId', 'fullName profilePicture role')
    .sort({ endsAt: -1 })
    .lean();

  for (const sub of subs) {
    if (sub.tutorId?._id) tutorIds.add(String(sub.tutorId._id));
  }

  const courseIds = await getStudentCourseIds(studentId);
  if (courseIds.length) {
    const courses = await Course.find({ _id: { $in: courseIds } })
      .select('createdBy instructor instructorModel')
      .lean();

    for (const course of courses) {
      const tid = course.createdBy || (course.instructorModel === 'User' ? course.instructor : null);
      if (tid) tutorIds.add(String(tid));
    }
  }

  const tutors = await User.find({
    _id: { $in: [...tutorIds] },
    role: 'tutor',
  })
    .select('fullName profilePicture')
    .lean();

  const tutorMap = new Map(tutors.map((t) => [String(t._id), t]));

  const communities = [];
  const seen = new Set();

  for (const sub of subs) {
    const tid = String(sub.tutorId?._id || '');
    if (!tid || seen.has(tid) || !tutorMap.has(tid)) continue;
    seen.add(tid);
    communities.push({
      tutorId: tid,
      accessType: 'subscription',
      endsAt: sub.endsAt,
      tutor: {
        id: tid,
        fullName: tutorMap.get(tid).fullName,
        profilePicture: tutorMap.get(tid).profilePicture,
      },
    });
  }

  for (const tid of tutorIds) {
    if (seen.has(tid) || !tutorMap.has(tid)) continue;
    seen.add(tid);
    communities.push({
      tutorId: tid,
      accessType: 'course',
      endsAt: null,
      tutor: {
        id: tid,
        fullName: tutorMap.get(tid).fullName,
        profilePicture: tutorMap.get(tid).profilePicture,
      },
    });
  }

  return communities;
}

async function listSubscribersForTutor(tutorId) {
  const now = new Date();
  await TutorSubscription.updateMany(
    { tutorId, status: 'active', endsAt: { $lte: now } },
    { $set: { status: 'expired' } }
  );

  return TutorSubscription.find({
    tutorId,
    status: 'active',
    endsAt: { $gt: now },
  })
    .populate('studentId', 'fullName email profilePicture')
    .sort({ endsAt: -1 });
}

module.exports = {
  PLAN_DURATION_DAYS,
  planDurationDays,
  createOrExtendFromPayment,
  getActiveSubscription,
  hasActiveSubscription,
  hasCourseEnrollmentWithTutor,
  hasCommunityAccess,
  listAccessibleTutorIdsForStudent,
  listSubscribersForTutor,
  expireIfNeeded,
};
