import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPriceFingerprint, buildPriceQueryText } from '../src/lib/pricing/fingerprint';

test('buildPriceFingerprint is stable for cardsight card and grade bucket', () => {
  const fingerprint = buildPriceFingerprint({
    cardsightCardId: '11111111-1111-4111-8111-111111111111',
    parallelId: 'parallel-1',
    conditionBucket: 'graded',
    gradingCompany: 'PSA',
    grade: 10,
  });

  assert.equal(
    fingerprint,
    'cardsight:11111111-1111-4111-8111-111111111111:parallel-1:graded:PSA:10'
  );
});

test('buildPriceQueryText includes player and grade context', () => {
  const query = buildPriceQueryText({
    cardsightCardId: '11111111-1111-4111-8111-111111111111',
    conditionBucket: 'graded',
    gradingCompany: 'PSA',
    grade: 9,
    year: 2011,
    setName: 'Topps Update',
    player: 'Mike Trout',
    cardNumber: 'US175',
  });

  assert.match(query, /2011/);
  assert.match(query, /Mike Trout/);
  assert.match(query, /PSA 9/);
});
