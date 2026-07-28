const TutorSubscription = require('../models/TutorSubscription');
const {
  planDurationDays,
  normalizePlanId,
  planHasFeature,
  getPlanFeatures,
  FEATURES,
} = require('../constants/creatorSubscriptionPlans');

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
 * Idempotent on transactionId. Stores canonical plan ids (basic/premium/…).
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

  const canonicalPlanId = normalizePlanId(planId) || String(planId);
  const days = planDurationDays(canonicalPlanId);
  const now = new Date();

  let sub = await TutorSubscription.findOne({
    studentId,
    tutorId,
    status: 'active',
  }).sort({ endsAt: -1 });

  if (sub && sub.endsAt > now) {
    sub.endsAt = addDays(sub.endsAt, days);
    sub.planId = canonicalPlanId;
    if (paymentId) sub.paymentId = paymentId;
    if (transactionId) sub.transactionId = transactionId;
    await sub.save();
    return sub;
  }

  try {
    return await TutorSubscription.create({
      studentId,
      tutorId,
      planId: canonicalPlanId,
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

/** True if student has an active sub that includes the given feature. */
async function hasSubscriptionFeature(studentId, tutorId, feature) {
  if (!studentId || !tutorId || !feature) return false;
  if (String(studentId) === String(tutorId)) return true;
  const sub = await getActiveSubscription(studentId, tutorId);
  if (!sub) return false;
  return planHasFeature(sub.planId, feature);
}

/**
 * Enroll a subscriber in every published course belonging to the tutor
 * so courses appear in Dashboard → My Courses.
 */
async function enrollStudentInTutorPublishedCourses(studentId, tutorId) {
  const Course = require('../models/Course');
  const Enrollment = require('../models/Enrollment');
  if (!studentId || !tutorId) return [];

  const courses = await Course.find({
    $and: [
      { $or: [{ createdBy: tutorId }, { instructor: tutorId }] },
      { $or: [{ source: { $ne: 'user' } }, { listingStatus: 'published' }] },
    ],
  }).select('_id');

  if (!courses.length) return [];

  const courseIds = courses.map((c) => c._id);
  const existing = await Enrollment.find({
    studentId,
    courseId: { $in: courseIds },
  }).select('courseId');

  const have = new Set(existing.map((e) => String(e.courseId)));
  const missing = courseIds.filter((id) => !have.has(String(id)));
  if (!missing.length) return existing;

  try {
    await Enrollment.insertMany(
      missing.map((courseId) => ({
        studentId,
        courseId,
        enrolledAt: new Date(),
        progressPercent: 0,
        completedLessonIds: [],
      })),
      { ordered: false }
    );
  } catch (err) {
    if (err?.code !== 11000 && !err?.writeErrors) throw err;
  }

  return Enrollment.find({ studentId, courseId: { $in: courseIds } });
}

/** Active paid tutor subscriptions for a student (community access list). */
async function listActiveSubscriptionsForStudent(studentId) {
  const now = new Date();
  await TutorSubscription.updateMany(
    { studentId, status: 'active', endsAt: { $lte: now } },
    { $set: { status: 'expired' } }
  );

  return TutorSubscription.find({
    studentId,
    status: 'active',
    endsAt: { $gt: now },
  })
    .populate('tutorId', 'fullName profilePicture')
    .sort({ endsAt: -1 });
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
  FEATURES,
  planDurationDays,
  createOrExtendFromPayment,
  getActiveSubscription,
  hasActiveSubscription,
  hasSubscriptionFeature,
  getPlanFeatures,
  planHasFeature,
  normalizePlanId,
  enrollStudentInTutorPublishedCourses,
  listActiveSubscriptionsForStudent,
  listSubscribersForTutor,
  expireIfNeeded,
};
