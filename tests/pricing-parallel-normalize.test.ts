import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeParallelForPricing } from '../src/lib/pricing/parallel-normalize';

test('normalizeParallelForPricing drops autograph markers', () => {
  assert.equal(normalizeParallelForPricing('AU'), null);
  assert.equal(normalizeParallelForPricing('auto'), null);
  assert.equal(normalizeParallelForPricing('Autograph'), null);
});

test('normalizeParallelForPricing keeps real parallels', () => {
  assert.equal(normalizeParallelForPricing('Refractor'), 'Refractor');
  assert.equal(normalizeParallelForPricing(' Gold '), 'Gold');
});
