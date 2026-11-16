const test = require('node:test');
const assert = require('node:assert/strict');

const { blockersFor } = require('../services/accountDeletionService');

const clear = { isOwner: false, pendingWithdrawal: false, activePieCount: 0, balance: 0, acceptLoss: false };
const codes = (opts) => blockersFor({ ...clear, ...opts }).map((b) => b.code);

test('nothing blocks an ordinary account with no money left', () => {
    assert.deepEqual(codes({}), []);
});

test('the owner account cannot be deleted', () => {
    assert.deepEqual(codes({ isOwner: true }), ['OWNER']);
});

test('a withdrawal in progress or money in an open Pie blocks deletion', () => {
    assert.deepEqual(codes({ pendingWithdrawal: true, activePieCount: 1 }), ['PENDING_WITHDRAWAL', 'ACTIVE_PIE']);
});

test('money left blocks deletion until the member agrees to give it up', () => {
    assert.deepEqual(codes({ balance: 12.5 }), ['HAS_BALANCE']);
    assert.equal(blockersFor({ ...clear, balance: 12.5 })[0].amount, 12.5);
    assert.deepEqual(codes({ balance: 12.5, acceptLoss: true }), []);
});

test('agreeing to lose the balance does not get past an open Pie', () => {
    assert.deepEqual(codes({ balance: 50, acceptLoss: true, activePieCount: 2 }), ['ACTIVE_PIE']);
});
