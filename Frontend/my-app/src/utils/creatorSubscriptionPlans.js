/**
 * Creator subscription tiers — keep in sync with Backend/constants/creatorSubscriptionPlans.js
 */

export const FEATURES = {
  VIDEOS: 'videos',
  COMMUNITY: 'community',
  DOWNLOAD: 'download',
  ASK: 'ask',
  POST_TRADE: 'post_trade',
  SIGNALS: 'signals',
  MENTORED: 'mentored',
};

export const PLAN_DEFINITIONS = {
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
    durationDays: 30,
    periodNote: '1 month · community, Q&A, signals & offline',
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

const LEGACY_PLAN_ALIASES = {
  '1m': 'basic',
  '2m': 'premium',
  '3m': 'premium',
  '1y': 'diamond',
  premium_plus: 'premium',
};

export function normalizePlanId(planId) {
  const id = String(planId || '').trim();
  if (PLAN_DEFINITIONS[id]) return id;
  return LEGACY_PLAN_ALIASES[id] || null;
}

export function getPlanDefinition(planId) {
  const canonical = normalizePlanId(planId);
  return canonical ? PLAN_DEFINITIONS[canonical] : null;
}

export function planHasFeature(planId, feature) {
  const def = getPlanDefinition(planId);
  return Boolean(def?.features?.includes(feature));
}

function resolvePlanPrice(subscriptionPricing, def) {
  const pricing = subscriptionPricing || {};
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
  return def.defaultPrice;
}

/** Build checkout / profile plan cards from a tutor's subscriptionPricing. */
export function buildSubscriptionPlans(subscriptionPricing) {
  return ['basic', 'premium', 'diamond'].map((id) => {
    const def = PLAN_DEFINITIONS[id];
    return {
      id: def.id,
      label: def.label,
      title: def.title,
      price: resolvePlanPrice(subscriptionPricing, def),
      compareAt: null,
      periodNote: def.periodNote,
      badge: def.badge || null,
      features: def.features,
      benefitLabels: def.benefitLabels,
      durationDays: def.durationDays,
    };
  });
}
