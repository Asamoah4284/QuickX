/**
 * Unit tests for the access rules that do not need a database.
 * Run from Backend/:  npm test
 */
const test = require('node:test');
const assert = require('node:assert/strict');

const { extendedEndsAt, planGrant } = require('../services/entitlementService');
const { priceAfterDiscount } = require('../services/productService');
const { computeStats } = require('../routes/signalRoutes');
const { DEFAULT_PRODUCTS } = require('../models/Product');
const {
    ALL_FEATURES,
    PAID_FEATURES,
    LEGACY_PLAN_FEATURES,
    toLegacyFeatureNames,
    fromLegacyFeatureName,
    legacyPlanIdForFeatures,
} = require('../constants/features');
const lessonAccess = require('../utils/lessonAccess');

const DAY = 24 * 60 * 60 * 1000;
const now = new Date('2026-11-15T12:00:00Z');

test('buying time on a lapsed or new entitlement starts from now', () => {
    assert.equal(extendedEndsAt(null, 30, now).getTime(), now.getTime() + 30 * DAY);
    const lapsed = new Date(now.getTime() - 5 * DAY);
    assert.equal(extendedEndsAt(lapsed, 30, now).getTime(), now.getTime() + 30 * DAY);
});

test('buying time on an active entitlement adds to what is left', () => {
    const current = new Date(now.getTime() + 10 * DAY);
    assert.equal(extendedEndsAt(current, 30, now).getTime(), now.getTime() + 40 * DAY);
});

test('replaying the same payment does not extend twice', () => {
    const existing = { endsAt: new Date(now.getTime() + 30 * DAY), appliedRefs: ['tx-1'] };
    const replay = planGrant(existing, { days: 30, ref: 'tx-1', now });
    assert.equal(replay.apply, false);
    assert.equal(replay.endsAt.getTime(), existing.endsAt.getTime());

    const second = planGrant(existing, { days: 30, ref: 'tx-2', now });
    assert.equal(second.apply, true);
    assert.equal(second.endsAt.getTime(), now.getTime() + 60 * DAY);
});

test('migrating with an absolute expiry never shortens existing access', () => {
    const longer = { endsAt: new Date(now.getTime() + 90 * DAY), appliedRefs: [] };
    const until = new Date(now.getTime() + 20 * DAY);
    assert.equal(planGrant(longer, { until, ref: 'legacy-sub:1', now }).endsAt.getTime(), longer.endsAt.getTime());
    assert.equal(planGrant(null, { until, ref: 'legacy-sub:1', now }).endsAt.getTime(), until.getTime());
});

test('coupon discounts are percentages, clamped and rounded to pesewas', () => {
    assert.equal(priceAfterDiscount(99, 0), 99);
    assert.equal(priceAfterDiscount(99, 10), 89.1);
    assert.equal(priceAfterDiscount(49.99, 33), 33.49);
    assert.equal(priceAfterDiscount(99, 100), 0);
    assert.equal(priceAfterDiscount(99, 250), 0);
    assert.equal(priceAfterDiscount(99, -5), 99);
});

test('default catalogue: one product per paid feature plus a bundle granting all of them', () => {
    for (const feature of PAID_FEATURES) {
        const single = DEFAULT_PRODUCTS.filter((p) => p.grants.length === 1 && p.grants[0] === feature);
        assert.equal(single.length, 1, `exactly one single-feature product for ${feature}`);
    }
    const bundle = DEFAULT_PRODUCTS.find((p) => p.key === 'all-access');
    assert.deepEqual([...bundle.grants].sort(), [...PAID_FEATURES].sort());
    const separately = DEFAULT_PRODUCTS.filter((p) => p.grants.length === 1).reduce((sum, p) => sum + p.price, 0);
    assert.ok(bundle.price < separately, 'bundle is cheaper than buying the features separately');
});

test('old tiers map onto features, and back to the names the old client reads', () => {
    assert.deepEqual(LEGACY_PLAN_FEATURES.basic, ['courses']);
    assert.deepEqual([...LEGACY_PLAN_FEATURES.premium].sort(), ['community', 'courses', 'signals']);
    assert.deepEqual([...LEGACY_PLAN_FEATURES.diamond].sort(), [...ALL_FEATURES].sort());

    assert.deepEqual(toLegacyFeatureNames(['signals']), ['signals']);
    assert.ok(!toLegacyFeatureNames(['signals']).includes('community'), 'signals-only members get no community');
    assert.deepEqual(toLegacyFeatureNames(['courses']).sort(), ['download', 'videos']);
    assert.equal(fromLegacyFeatureName('ask'), 'community');
    assert.equal(fromLegacyFeatureName('download'), 'courses');
    assert.equal(fromLegacyFeatureName('nope'), null);

    assert.equal(legacyPlanIdForFeatures(['courses']), 'basic');
    assert.equal(legacyPlanIdForFeatures(['signals']), 'premium');
    assert.equal(legacyPlanIdForFeatures(ALL_FEATURES), 'diamond');
    assert.equal(legacyPlanIdForFeatures([]), null);
});

test('signal stats count wins, losses and pips; cancelled signals are ignored', () => {
    const stats = computeStats([
        { status: 'tp_hit', resultPips: 40 },
        { status: 'tp_hit', resultPips: 25.5 },
        { status: 'sl_hit', resultPips: -20 },
        { status: 'closed', resultPips: 10 },
        { status: 'closed', resultPips: 0 },
        { status: 'cancelled', resultPips: null },
    ]);
    assert.deepEqual(stats, { total: 5, wins: 3, losses: 1, winRate: 75, totalPips: 55.5 });
    assert.equal(computeStats([]).winRate, null);
});

test('a lesson is only a free preview when isPreview is true', () => {
    assert.equal(lessonAccess.isLessonPreview({ isPreview: false, free: true }), false);
    assert.equal(lessonAccess.isLessonPreview({ free: true }), false);
    assert.equal(lessonAccess.isLessonPreview({ isPreview: true }), true);
    assert.deepEqual(lessonAccess.previewFlags(false), { isPreview: false, free: false, isLocked: true });
});

const { commissionFor, withdrawalSource } = require('../services/walletService');

test('referral commission is 5% of what was actually paid, rounded to pesewas', () => {
    assert.equal(commissionFor(100), 5);
    assert.equal(commissionFor(49.99), 2.5);
    assert.equal(commissionFor(0), 0);
    assert.equal(commissionFor(-10), 0);
    assert.equal(commissionFor('abc'), 0);
});

test('a withdrawal returns to the balance it came from, including older requests', () => {
    assert.equal(withdrawalSource({ source: 'wallet' }), 'wallet');
    assert.equal(withdrawalSource({ source: 'referral', remarks: 'QuickX Wallet withdrawal' }), 'referral');
    assert.equal(withdrawalSource({ remarks: 'QuickX Wallet withdrawal' }), 'wallet');
    assert.equal(withdrawalSource({}), 'referral');
});

test('community only stores http(s) links, and members can only attach images', () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test';
    const { safeUrl, cleanMedia } = require('../routes/communityRoutes');
    assert.equal(safeUrl('https://example.com/a.png'), 'https://example.com/a.png');
    assert.equal(safeUrl('javascript:alert(1)'), '');
    assert.equal(safeUrl('data:text/html,<script>'), '');
    assert.equal(safeUrl('not a url'), '');
    assert.equal(safeUrl(''), '');

    const member = cleanMedia(
        [
            { type: 'image', url: 'https://cdn.example.com/chart.png', name: 'chart' },
            { type: 'video', url: 'https://cdn.example.com/clip.mp4' },
            { type: 'image', url: 'javascript:alert(1)' },
        ],
        ['image']
    );
    assert.equal(member.rejected, true);
    assert.deepEqual(member.media, [{ url: 'https://cdn.example.com/chart.png', type: 'image', name: 'chart' }]);

    const mentor = cleanMedia([{ type: 'video', url: 'https://cdn.example.com/clip.mp4' }], ['image', 'video', 'document', 'link']);
    assert.equal(mentor.rejected, false);
    assert.equal(mentor.media.length, 1);
    assert.deepEqual(cleanMedia('nope', ['image']), { media: [], rejected: false });
});
