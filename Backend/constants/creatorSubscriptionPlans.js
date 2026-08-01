/**
 * Creator subscription tiers — keep in sync with Frontend utils/creatorSubscriptionPlans.js
 *
 * basic   — videos only, 1 month
 * premium — videos + community + download + ask + trades + signals, 3 months
 * diamond — premium + mentorship, 1 year
 *
 * Legacy ids (premium_plus, 1m, 2m, 3m, 1y) still resolve for existing subscriptions.
 */

const FEATURES = {
  VIDEOS: 'videos',
  COMMUNITY: 'community',
  DOWNLOAD: 'download',
  ASK: 'ask',
  POST_TRADE: 'post_trade',
  SIGNALS: 'signals',
  MENTORED: 'mentored',
};

const PLAN_DEFINITIONS = {
  basic: {
    id: 'basic',
    label: 'Basic',
    title: 'Basic plan',
    durationDays: 30,
    periodNote: '1 month · watch videos only',
    priceField: 'basic',
    legacyPriceFields: ['month1'],
    defaultPrice: 49,
    features: [FEATURES.VIDEOS],
    benefitLabels: ['Watch course videos'],
  },
  premium: {
    id: 'premium',
    label: 'Premium',
    title: 'Premium plan',
    durationDays: 90,
    periodNote: '3 months · community, Q&A, signals & offline',
    priceField: 'premium',
    legacyPriceFields: ['month3', 'month2', 'premiumPlus'],
    defaultPrice: 99,
    features: [
      FEATURES.VIDEOS,
      FEATURES.COMMUNITY,
      FEATURES.DOWNLOAD,
      FEATURES.ASK,
      FEATURES.POST_TRADE,
      FEATURES.SIGNALS,
    ],
    benefitLabels: [
      'Watch course videos',
      'Join the community',
      'Ask questions',
      'Post trades',
      'Join signal page',
      'Download & watch offline',
    ],
  },
  diamond: {
    id: 'diamond',
    label: 'Diamond',
    title: 'Diamond plan',
    durationDays: 365,
    periodNote: '1 year · full access + mentorship',
    priceField: 'diamond',
    legacyPriceFields: ['year1'],
    defaultPrice: 599,
    badge: 'Best value',
    features: [
      FEATURES.VIDEOS,
      FEATURES.COMMUNITY,
      FEATURES.DOWNLOAD,
      FEATURES.ASK,
      FEATURES.POST_TRADE,
      FEATURES.SIGNALS,
      FEATURES.MENTORED,
    ],
    benefitLabels: [
      'Watch course videos',
      'Join the community',
      'Ask questions',
      'Post trades',
      'Join signal page',
      'Download & watch offline',
      '1-on-1 mentorship',
    ],
  },
};

/** Map old / removed plan ids → current tiers. */
const LEGACY_PLAN_ALIASES = {
  '1m': 'basic',
  '2m': 'premium',
  '3m': 'premium',
  '1y': 'diamond',
  premium_plus: 'premium',
};

const CANONICAL_PLAN_IDS = Object.keys(PLAN_DEFINITIONS);
const ACCEPTED_PLAN_IDS = [
  ...CANONICAL_PLAN_IDS,
  ...Object.keys(LEGACY_PLAN_ALIASES),
];

function normalizePlanId(planId) {
  const id = String(planId || '').trim();
  if (PLAN_DEFINITIONS[id]) return id;
  if (LEGACY_PLAN_ALIASES[id]) return LEGACY_PLAN_ALIASES[id];
  return null;
}

function getPlanDefinition(planId) {
  const canonical = normalizePlanId(planId);
  return canonical ? PLAN_DEFINITIONS[canonical] : null;
}

function planDurationDays(planId) {
  return getPlanDefinition(planId)?.durationDays || 30;
}

function planHasFeature(planId, feature) {
  const def = getPlanDefinition(planId);
  if (!def) return false;
  return def.features.includes(feature);
}

function getPlanFeatures(planId) {
  return getPlanDefinition(planId)?.features || [];
}

const CREATOR_SUBSCRIPTION_PLAN_DEFAULTS = {
  basic: PLAN_DEFINITIONS.basic.defaultPrice,
  premium: PLAN_DEFINITIONS.premium.defaultPrice,
  diamond: PLAN_DEFINITIONS.diamond.defaultPrice,
  premium_plus: PLAN_DEFINITIONS.premium.defaultPrice,
  '1m': PLAN_DEFINITIONS.basic.defaultPrice,
  '2m': PLAN_DEFINITIONS.premium.defaultPrice,
  '3m': PLAN_DEFINITIONS.premium.defaultPrice,
  '1y': PLAN_DEFINITIONS.diamond.defaultPrice,
};

function getCreatorSubscriptionPlanPrice(planId) {
  const canonical = normalizePlanId(planId);
  if (!canonical) return null;
  return PLAN_DEFINITIONS[canonical].defaultPrice;
}

async function getExpectedCreatorSubscriptionPrice(tutorId, planId) {
  const def = getPlanDefinition(planId);
  if (!def) return null;

  try {
    const TutorProfile = require('../models/TutorProfile');
    const profile = await TutorProfile.findOne({ userId: tutorId })
      .select('subscriptionPricing')
      .lean();
    const pricing = profile?.subscriptionPricing || {};

    const hasOwn = (field) =>
      pricing[field] !== undefined && pricing[field] !== null && pricing[field] !== '';

    if (hasOwn(def.priceField)) {
      const primary = Number(pricing[def.priceField]);
      if (Number.isFinite(primary) && primary >= 0) return primary;
    }

    for (const field of def.legacyPriceFields || []) {
      if (!hasOwn(field)) continue;
      const legacy = Number(pricing[field]);
      if (Number.isFinite(legacy) && legacy >= 0) return legacy;
    }
  } catch (err) {
    console.error('getExpectedCreatorSubscriptionPrice:', err.message);
  }

  return def.defaultPrice;
}

const PLAN_RANK = { basic: 1, premium: 2, diamond: 3 };

function planRank(planId) {
  const id = normalizePlanId(planId);
  return id ? PLAN_RANK[id] || 0 : 0;
}

/**
 * Charge amount for subscribe / renew / upgrade.
 * Upgrades only charge list(target) − list(current). Renewals charge full list price.
 */
async function getExpectedCreatorSubscriptionCharge(tutorId, planId, studentId) {
  const listPrice = await getExpectedCreatorSubscriptionPrice(tutorId, planId);
  if (listPrice == null) return null;

  const targetId = normalizePlanId(planId);
  if (!studentId || !targetId) {
    return {
      amount: listPrice,
      listPrice,
      credit: 0,
      isUpgrade: false,
      fromPlanId: null,
      toPlanId: targetId,
    };
  }

  try {
    const { getActiveSubscription } = require('../services/tutorSubscriptionService');
    const sub = await getActiveSubscription(studentId, tutorId);
    const fromPlanId = sub ? normalizePlanId(sub.planId) : null;

    if (fromPlanId && planRank(targetId) > planRank(fromPlanId)) {
      const currentList = await getExpectedCreatorSubscriptionPrice(tutorId, fromPlanId);
      const credit = Math.max(0, Number(currentList) || 0);
      const amount = Math.max(0, Number(listPrice) - credit);
      return {
        amount,
        listPrice,
        credit: Math.min(credit, Number(listPrice)),
        isUpgrade: true,
        fromPlanId,
        toPlanId: targetId,
      };
    }
  } catch (err) {
    console.error('getExpectedCreatorSubscriptionCharge:', err.message);
  }

  return {
    amount: listPrice,
    listPrice,
    credit: 0,
    isUpgrade: false,
    fromPlanId: null,
    toPlanId: targetId,
  };
}

module.exports = {
  FEATURES,
  PLAN_DEFINITIONS,
  LEGACY_PLAN_ALIASES,
  CANONICAL_PLAN_IDS,
  ACCEPTED_PLAN_IDS,
  CREATOR_SUBSCRIPTION_PLAN_DEFAULTS,
  CREATOR_SUBSCRIPTION_PLAN_PRICES: CREATOR_SUBSCRIPTION_PLAN_DEFAULTS,
  PLAN_RANK,
  normalizePlanId,
  getPlanDefinition,
  planDurationDays,
  planRank,
  planHasFeature,
  getPlanFeatures,
  getCreatorSubscriptionPlanPrice,
  getExpectedCreatorSubscriptionPrice,
  getExpectedCreatorSubscriptionCharge,
};
