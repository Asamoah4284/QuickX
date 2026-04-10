/**
 * Creator subscription tiers (GHS) — keep in sync with SUBSCRIPTION_PLANS in InstructorProfile.jsx.
 */
const CREATOR_SUBSCRIPTION_PLAN_PRICES = {
  '1m': 49,
  '2m': 89,
  '3m': 129,
  '1y': 399,
};

function getCreatorSubscriptionPlanPrice(planId) {
  if (planId == null || planId === '') return null;
  const p = CREATOR_SUBSCRIPTION_PLAN_PRICES[String(planId)];
  return p != null ? p : null;
}

module.exports = {
  CREATOR_SUBSCRIPTION_PLAN_PRICES,
  getCreatorSubscriptionPlanPrice,
};
