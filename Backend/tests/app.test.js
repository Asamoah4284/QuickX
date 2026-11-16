const test = require('node:test');
const assert = require('node:assert/strict');

const { chunk, buildMessages, deadTokens, isExpoToken } = require('../services/expoPushService');
const { newReference, payerEmail, resolveCheckout } = require('../services/appCheckoutService');

// ── Expo push ──

test('chunk splits into groups of 100', () => {
    const list = Array.from({ length: 250 }, (_, i) => i);
    assert.deepEqual(chunk(list).map((c) => c.length), [100, 100, 50]);
});

test('buildMessages keeps only Expo tokens and adds the deep link', () => {
    const msgs = buildMessages(['ExponentPushToken[abc]', 'not-a-token', 'ExpoPushToken[def]'], {
        title: 'New signal',
        body: 'EURUSD buy',
        url: '/signals',
    });
    assert.equal(msgs.length, 2);
    assert.equal(msgs[0].to, 'ExponentPushToken[abc]');
    assert.equal(msgs[0].data.url, '/signals');
    assert.equal(isExpoToken('random'), false);
});

test('deadTokens returns only DeviceNotRegistered tokens', () => {
    const msgs = [{ to: 'ExpoPushToken[a]' }, { to: 'ExpoPushToken[b]' }, { to: 'ExpoPushToken[c]' }];
    const tickets = [
        { status: 'ok' },
        { status: 'error', details: { error: 'DeviceNotRegistered' } },
        { status: 'error', details: { error: 'MessageRateExceeded' } },
    ];
    assert.deepEqual(deadTokens(msgs, tickets), ['ExpoPushToken[b]']);
});

// ── App checkout ──

test('newReference is labelled and unique-looking', () => {
    assert.match(newReference('pie', 1700000000000, 0.123456), /^QX-APP-PIE-1700000000000-[a-z0-9]+$/);
});

test('payerEmail falls back to a phone placeholder', () => {
    assert.equal(payerEmail({ email: 'kofi@example.com' }), 'kofi@example.com');
    assert.equal(payerEmail({ email: '', phone: '+233 24 123 4567' }), '233241234567@phone.quickxlearn.com');
});

const user = { _id: 'u1' };
const future = new Date(Date.now() + 86400000);
const baseDeps = {
    quoteProduct: async () => ({ amount: 150, couponCode: '', product: { key: 'signals', name: 'Signals' } }),
    findEvent: async () => ({ _id: 'e1', title: 'Masterclass', status: 'published', price: 50, isFree: false, startDate: future, capacity: 0 }),
    hasTicket: async () => false,
    findPie: async () => ({ _id: 'p1', title: 'Gold' }),
    sliceProblem: async () => null,
    validatePurchaseIntent: async (body) => ({ itemType: body.itemType, itemId: 'b1', amount: body.amount }),
};

test('product amount comes from the server quote', async () => {
    const r = await resolveCheckout({ purpose: 'product', body: { key: 'signals', amount: 1 }, user }, baseDeps);
    assert.equal(r.amount, 150);
    assert.equal(r.metadata.product_key, 'signals');
});

test('a 100% coupon cannot open a Paystack page', async () => {
    const deps = { ...baseDeps, quoteProduct: async () => ({ amount: 0, couponCode: 'FREE', product: { key: 'signals', name: 'Signals' } }) };
    await assert.rejects(resolveCheckout({ purpose: 'product', body: { key: 'signals' }, user }, deps), /Redeem/);
});

test('event: price from the event, and ended, free or already-held tickets are refused', async () => {
    const ok = await resolveCheckout({ purpose: 'event', body: { id: 'e1' }, user }, baseDeps);
    assert.equal(ok.amount, 50);

    const past = { ...baseDeps, findEvent: async () => ({ ...(await baseDeps.findEvent()), startDate: new Date(Date.now() - 86400000) }) };
    await assert.rejects(resolveCheckout({ purpose: 'event', body: { id: 'e1' }, user }, past), /ended/);

    const free = { ...baseDeps, findEvent: async () => ({ ...(await baseDeps.findEvent()), isFree: true, price: 0 }) };
    await assert.rejects(resolveCheckout({ purpose: 'event', body: { id: 'e1' }, user }, free), /free/);

    const held = { ...baseDeps, hasTicket: async () => true };
    await assert.rejects(resolveCheckout({ purpose: 'event', body: { id: 'e1' }, user }, held), /already have a ticket/);
});

test('pie: uses the same slice rules as the website', async () => {
    const r = await resolveCheckout({ purpose: 'pie', body: { id: 'p1', amount: '75.456' }, user }, baseDeps);
    assert.equal(r.amount, 75.46);
    const full = { ...baseDeps, sliceProblem: async () => ({ message: 'This Pie is full' }) };
    await assert.rejects(resolveCheckout({ purpose: 'pie', body: { id: 'p1', amount: 50 }, user }, full), /full/);
});

test('books only accept book item types, and unknown purposes are refused', async () => {
    const r = await resolveCheckout({ purpose: 'book', body: { itemType: 'book', itemId: 'b1', amount: 80 }, user }, baseDeps);
    assert.equal(r.amount, 80);
    await assert.rejects(resolveCheckout({ purpose: 'book', body: { itemType: 'course', amount: 80 }, user }, baseDeps), /Unknown book order/);
    await assert.rejects(resolveCheckout({ purpose: 'wallet', body: {}, user }, baseDeps), /Unknown payment type/);
});
