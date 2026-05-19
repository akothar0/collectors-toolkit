import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSetNameForSearch } from '../src/lib/pricing/set-normalize';

test('normalizeSetNameForSearch returns null for blank input', () => {
  assert.equal(normalizeSetNameForSearch(null), null);
  assert.equal(normalizeSetNameForSearch('   '), null);
});

test('normalizeSetNameForSearch collapses whitespace and normalizes phrases', () => {
  assert.equal(
    normalizeSetNameForSearch('  2018   Topps   Update Series  '),
    '2018 Topps Update'
  );
});
