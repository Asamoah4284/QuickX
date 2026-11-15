/**
 * Compatibility layer for the pre-revamp "subscribe to a tutor" API.
 *
 * Access is decided by entitlements (see entitlementService). The functions here
 * keep their old names and shapes so the existing community routes and the old
 * client keep working until they are replaced. TutorSubscription rows are still
 * written for purchase history, but are never read to decide access.
 */
const TutorSubscription = require('../models/TutorSubscription');
const Entitlement = require('../models/Entitlement');
const {
  planDurationDays,
  normalizePlanId,
  planHasFeature,
  getPlanFeatures,
  FEATURES,
} = require('../constants/creatorSubscriptionPlans');
const {
  FEATURES: F,
  fromLegacyFeatureName,
  legacyPlanIdForFeatures,
} = require('../constants/features');
const entitlements = require('./entitlementService');
const { getOwnerId } = require('./ownerService');

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Old tier purchase: record it and grant the features that tier included. */
async function createOrExtendFromPayment({
  studentId,
  tutorId,
  planId,
  paymentId,
  transactionId,
}) {
  const canonicalPlanId = normalizePlanId(planId) || String(planId);
  const days = planDurationDays(canonicalPlanId);

  await entitlements.grantFromLegacyPlan({
    userId: studentId,
    planId: canonicalPlanId,
    days,
    ref: transactionId || undefined,
    paymentId,
  });

  if (transactionId) {
    const existingByTx = await TutorSubscription.findOne({ transactionId });
    if (existingByTx) return existingByTx;
  }

  const now = new Date();
  const current = await getActiveSubscription(studentId, tutorId);
  try {
    return await TutorSubscription.create({
      studentId,
      tutorId,
      planId: canonicalPlanId,
      startsAt: now,
      endsAt: current?.endsAt || addDays(now, days),
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

/** The member's current access, shaped like an old subscription row (or null). */
async function getActiveSubscription(studentId) {
  const rows = await entitlements.getActiveEntitlements(studentId);
  if (!rows.length) return null;
  const features = rows.map((r) => r.feature);
  return {
    planId: legacyPlanIdForFeatures(features),
    features,
    startsAt: new Date(Math.min(...rows.map((r) => new Date(r.startsAt || r.endsAt).getTime()))),
    endsAt: new Date(Math.max(...rows.map((r) => new Date(r.endsAt).getTime()))),
    status: 'active',
  };
}

async function hasActiveSubscription(studentId, tutorId) {
  if (!studentId) return false;
  if (tutorId && String(studentId) === String(tutorId)) return true;
  return entitlements.hasFeature(studentId, F.COURSES);
}

/** `feature` is an old feature name (videos, community, ask, …). */
async function hasSubscriptionFeature(studentId, tutorId, feature) {
  if (!studentId || !feature) return false;
  if (tutorId && String(studentId) === String(tutorId)) return true;
  const mapped = fromLegacyFeatureName(feature);
  return mapped ? entitlements.hasFeature(studentId, mapped) : false;
}

/** Add every published course to the member's "My courses" list. */
async function enrollStudentInTutorPublishedCourses(studentId) {
  const Course = require('../models/Course');
  const Enrollment = require('../models/Enrollment');
  if (!studentId) return [];

  const courses = await Course.find({
    $or: [{ source: { $ne: 'user' } }, { listingStatus: 'published' }],
    listingStatus: { $ne: 'archived' },
  }).select('_id');
  if (!courses.length) return [];

  const courseIds = courses.map((c) => c._id);
  const existing = await Enrollment.find({ studentId, courseId: { $in: courseIds } }).select('courseId');
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

/** One row (the owner's community) when the member has any active access. */
async function listActiveSubscriptionsForStudent(studentId) {
  const sub = await getActiveSubscription(studentId);
  if (!sub) return [];
  const ownerId = await getOwnerId();
  if (!ownerId) return [];
  const User = require('../models/User');
  const owner = await User.findById(ownerId).select('fullName profilePicture').lean();
  return [
    {
      _id: `access-${studentId}`,
      planId: sub.planId,
      features: sub.features,
      endsAt: sub.endsAt,
      tutorId: owner || { _id: ownerId },
    },
  ];
}

/** Members who can currently use the community. */
async function listSubscribersForTutor() {
  const rows = await Entitlement.find({ feature: F.COMMUNITY, endsAt: { $gt: new Date() } })
    .populate('userId', 'fullName email profilePicture')
    .sort({ endsAt: -1 });
  return rows
    .filter((r) => r.userId)
    .map((r) => ({
      _id: r._id,
      planId: 'premium',
      startsAt: r.startsAt,
      endsAt: r.endsAt,
      studentId: r.userId,
    }));
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
};
