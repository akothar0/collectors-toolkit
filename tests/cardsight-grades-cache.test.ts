import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveGradeId,
  resetGradeCacheForTests,
  seedGradeCacheForTests,
} from '../src/lib/cardsight/grades';

test('resolveGradeId returns null when company or grade missing', async () => {
  resetGradeCacheForTests();
  assert.equal(await resolveGradeId(null, 10), null);
  assert.equal(await resolveGradeId('PSA', null), null);
});

test('resolveGradeId uses seeded cache without calling CardSight', async () => {
  resetGradeCacheForTests();
  seedGradeCacheForTests(
    [
      { company: 'PSA', grade: 10 },
      { company: 'BGS', grade: 9.5 },
    ],
    'shared-grade-id'
  );

  assert.equal(await resolveGradeId('PSA', 10), 'shared-grade-id');
  assert.equal(await resolveGradeId('bgs', 9.5), 'shared-grade-id');
  assert.equal(await resolveGradeId('SGC', 10), null);
});
