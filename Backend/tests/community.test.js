const test = require('node:test');
const assert = require('node:assert/strict');

const { PAID_FEATURES, ALL_FEATURES } = require('../constants/features');
const { DEFAULT_PRODUCTS } = require('../models/Product');
const { PLAN_ROOMS } = require('../services/communityFreeService');

test('the community is free: nothing sells it', () => {
    assert.ok(!PAID_FEATURES.includes('community'));
    for (const p of DEFAULT_PRODUCTS) assert.ok(!p.grants.includes('community'), `${p.key} still grants community`);
});

test('old community entitlements still validate', () => {
    assert.ok(ALL_FEATURES.includes('community'));
});

test('All-Access grants every paid feature', () => {
    const all = DEFAULT_PRODUCTS.find((p) => p.key === 'all-access');
    assert.deepEqual([...all.grants].sort(), [...PAID_FEATURES].sort());
});

test('there is one plan room per paid feature', () => {
    assert.deepEqual(PLAN_ROOMS.map((r) => r.requires).sort(), [...PAID_FEATURES].sort());
});
