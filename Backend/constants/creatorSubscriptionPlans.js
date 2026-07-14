/**
 * Creator subscription tiers (GHS defaults) — keep in sync with InstructorProfile plans.
 * Actual charged price comes from each tutor's TutorProfile.subscriptionPricing.
 */
const CREATOR_SUBSCRIPTION_PLAN_DEFAULTS = {
  '1m': 49,
  '2m': 89, // legacy
  '3m': 129,
  '1y': 399,
};

const PLAN_PRICE_FIELD = {
  '1m': 'month1',
  '2m': 'month2',
  '3m': 'month3',
  '1y': 'year1',
};

function getCreatorSubscriptionPlanPrice(planId) {
  if (planId == null || planId === '') return null;
  const p = CREATOR_SUBSCRIPTION_PLAN_DEFAULTS[String(planId)];
  return p != null ? p : null;
}

/**
 * Resolve the price a student must pay for a tutor's plan.
 * Prefers tutor custom pricing; falls back to platform defaults.
 * For 3m, also accepts legacy month2 when month3 is unset.
 */
async function getExpectedCreatorSubscriptionPrice(tutorId, planId) {
  const id = String(planId || '');
  const fallback = getCreatorSubscriptionPlanPrice(id);
  if (fallback == null) return null;

  try {
    const TutorProfile = require('../models/TutorProfile');
    const profile = await TutorProfile.findOne({ userId: tutorId })
      .select('subscriptionPricing')
      .lean();
    const pricing = profile?.subscriptionPricing || {};
    const field = PLAN_PRICE_FIELD[id];

    if (id === '3m') {
      const month3 = Number(pricing.month3);
      if (Number.isFinite(month3) && month3 >= 0) return month3;
      const month2 = Number(pricing.month2);
      if (Number.isFinite(month2) && month2 >= 0) return month2;
      return fallback;
    }

    if (field) {
      const custom = Number(pricing[field]);
      if (Number.isFinite(custom) && custom >= 0) return custom;
    }
  } catch (err) {
    console.error('getExpectedCreatorSubscriptionPrice:', err.message);
  }

  return fallback;
}

module.exports = {
  CREATOR_SUBSCRIPTION_PLAN_DEFAULTS,
  CREATOR_SUBSCRIPTION_PLAN_PRICES: CREATOR_SUBSCRIPTION_PLAN_DEFAULTS,
  getCreatorSubscriptionPlanPrice,
  getExpectedCreatorSubscriptionPrice,
};
