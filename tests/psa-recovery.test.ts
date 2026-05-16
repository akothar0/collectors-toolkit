import assert from 'node:assert/strict';
import test from 'node:test';
import { buildTrailingDigitCandidates } from '../src/lib/cert-number';

test('truncated OCR cert 11336436 can recover 113364366 via trailing digit search', () => {
  const candidates = buildTrailingDigitCandidates('11336436');
  assert.ok(candidates.includes('113364366'));
});
