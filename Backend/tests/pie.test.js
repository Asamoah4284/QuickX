const test = require('node:test');
const assert = require('node:assert/strict');
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test';
const { settlementAmounts } = require('../controllers/ptradingController');

const deps = [
    { _id: 'a', amount: 300 },
    { _id: 'b', amount: 100 },
];

test('win: members get principal plus profit minus the fee, split by what they put in', () => {
    const r = settlementAmounts(deps, 10, 20); // +10% on 400 = 40 profit, 20% fee = 8
    assert.equal(r.pool, 400);
    assert.equal(r.gross, 40);
    assert.equal(r.fee, 8);
    assert.equal(r.payouts.get('a').payout, 324);
    assert.equal(r.payouts.get('b').payout, 108);
});

test('loss: members share what is left and no fee is taken', () => {
    const r = settlementAmounts(deps, -25, 20);
    assert.equal(r.fee, 0);
    assert.equal(r.payouts.get('a').payout, 225);
    assert.equal(r.payouts.get('b').payout, 75);
});

test('break-even returns exactly what was put in', () => {
    const r = settlementAmounts(deps, 0, 20);
    assert.equal(r.payouts.get('a').payout, 300);
    assert.equal(r.payouts.get('b').payout, 100);
});

test('a total loss pays nothing and never goes negative', () => {
    const r = settlementAmounts(deps, -100, 20);
    assert.equal(r.payouts.get('a').payout, 0);
    assert.equal(r.payouts.get('b').payout, 0);
});

test('payouts never add up to more than the pool plus net profit', () => {
    const odd = [{ _id: 'x', amount: 33.33 }, { _id: 'y', amount: 33.33 }, { _id: 'z', amount: 33.34 }];
    const r = settlementAmounts(odd, 7.77, 15);
    const total = [...r.payouts.values()].reduce((s, p) => s + p.payout, 0);
    assert.ok(total <= r.toShare + 0.02);
});

const { checkLevels } = require('../routes/signalRoutes');

test('signal levels: a buy needs stop below and targets above the entry', () => {
    assert.doesNotThrow(() => checkLevels('buy', 1.085, 1.08, [1.09, 1.095]));
    assert.throws(() => checkLevels('buy', 1.085, 1.09, [1.095]), /stop loss must be below/);
    assert.throws(() => checkLevels('buy', 1.085, 1.08, [1.07]), /Target 1 must be above/);
});

test('signal levels: a sell needs stop above and targets below the entry', () => {
    assert.doesNotThrow(() => checkLevels('sell', 2350, 2360, [2340]));
    assert.throws(() => checkLevels('sell', 2350, 2340, [2330]), /stop loss must be above/);
});
