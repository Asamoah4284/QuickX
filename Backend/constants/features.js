/**
 * The four things a member can pay for. Every access check in the app asks
 * "does this user have feature X?", nothing else decides access.
 */
const FEATURES = {
    COURSES: 'courses', // all course videos + offline download
    SIGNALS: 'signals', // live trading signals feed
    COMMUNITY: 'community', // feed, Q&A, posting trades
    MENTORSHIP: 'mentorship', // 1-on-1 sessions + direct messages
};

const ALL_FEATURES = Object.values(FEATURES);

/**
 * What is sold. The community is free for everyone signed in, so it is not on this
 * list; it stays a feature only so older entitlements and records remain valid.
 */
const PAID_FEATURES = [FEATURES.COURSES, FEATURES.SIGNALS, FEATURES.MENTORSHIP];

function isFeature(value) {
    return ALL_FEATURES.includes(value);
}

/** Old Basic / Premium / Diamond tiers expressed as features (for carrying subscribers over). */
const LEGACY_PLAN_FEATURES = {
    basic: [FEATURES.COURSES],
    premium: [FEATURES.COURSES, FEATURES.COMMUNITY, FEATURES.SIGNALS],
    diamond: [...ALL_FEATURES],
};

/** Feature names the pre-revamp client still understands. */
const LEGACY_FEATURE_NAMES = {
    [FEATURES.COURSES]: ['videos', 'download'],
    [FEATURES.COMMUNITY]: ['community', 'ask', 'post_trade'],
    [FEATURES.SIGNALS]: ['signals'],
    [FEATURES.MENTORSHIP]: ['mentored'],
};

function toLegacyFeatureNames(features) {
    return [...new Set((features || []).flatMap((f) => LEGACY_FEATURE_NAMES[f] || []))];
}

/** Which new feature an old feature name belongs to. */
function fromLegacyFeatureName(name) {
    return ALL_FEATURES.find((f) => LEGACY_FEATURE_NAMES[f].includes(name)) || null;
}

/** Closest old tier label for a set of features (display only). */
function legacyPlanIdForFeatures(features) {
    const set = new Set(features || []);
    if (set.has(FEATURES.MENTORSHIP)) return 'diamond';
    if (set.has(FEATURES.COMMUNITY) || set.has(FEATURES.SIGNALS)) return 'premium';
    if (set.has(FEATURES.COURSES)) return 'basic';
    return null;
}

module.exports = {
    FEATURES,
    ALL_FEATURES,
    PAID_FEATURES,
    isFeature,
    LEGACY_PLAN_FEATURES,
    toLegacyFeatureNames,
    fromLegacyFeatureName,
    legacyPlanIdForFeatures,
};
