import assert from 'node:assert/strict';
import test from 'node:test';
import { SCAN_LIMIT } from '../src/lib/scanner-limit';

test('scanner daily limit is set to 50', () => {
  assert.equal(SCAN_LIMIT, 50);
});
