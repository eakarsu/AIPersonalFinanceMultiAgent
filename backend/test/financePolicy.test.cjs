const test = require('node:test');
const assert = require('node:assert/strict');
const { reconcileInputs, calculateSnapshot, validateTransition } = require('../domain/financePolicy');

const evidence = (record_ref, source_version = 'v1') => ({ source_system: 'ledger', record_ref, source_version, checksum: `sha:${record_ref}`, effective_at: '2026-07-01' });

test('reconciles and deterministically orders versioned inputs', () => {
  assert.deepEqual(reconcileInputs([evidence('b'), evidence('a')]).map((item) => item.record_ref), ['a', 'b']);
});

test('rejects conflicting versions of the same authoritative record', () => {
  assert.throws(() => reconcileInputs([evidence('a', 'v1'), evidence('a', 'v2')]), /source conflict/);
});

test('calculates bounded deterministic finance snapshot', () => {
  assert.deepEqual(calculateSnapshot({ assets: '100.25', liabilities: 40, income: 10, expenses: 3.55 }), { net_worth: 60.25, monthly_cashflow: 6.45, advisory: true });
});

test('rejects negative or non-finite financial values', () => {
  assert.throws(() => calculateSnapshot({ assets: 1, liabilities: -1, income: 2, expenses: 1 }), /invalid financial amounts/);
});

test('requires independent explained approval', () => {
  assert.throws(() => validateTransition('advisor_review', 'approved', { role: 'financial_reviewer', actorId: 'u1', createdBy: 'u1', explanation: 'reviewed', evidenceCount: 2 }), /independent/);
  assert.equal(validateTransition('advisor_review', 'approved', { role: 'financial_reviewer', actorId: 'u2', createdBy: 'u1', explanation: 'reviewed', evidenceCount: 2 }), true);
});

test('posting and reversal require external reconciliation evidence', () => {
  assert.throws(() => validateTransition('approved', 'posted', { role: 'account_owner', periodLock: true }), /provider receipt/);
  assert.throws(() => validateTransition('posted', 'reversed', { role: 'account_owner' }), /correction reference/);
});
