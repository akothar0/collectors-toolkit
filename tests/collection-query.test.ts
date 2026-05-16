import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCollectionQuery,
  composeGraderPrefillNotes,
  parseCollectionSortBy,
  parseCollectionSortDir,
} from '../src/lib/collection';

test('buildCollectionQuery serializes filters', () => {
  const query = buildCollectionQuery({
    sport: 'Baseball',
    gradingCompany: 'PSA',
    conditionType: 'graded',
    search: 'trout',
    sortBy: 'player',
    sortDir: 'asc',
  });

  assert.match(query, /sport=Baseball/);
  assert.match(query, /gradingCompany=PSA/);
  assert.match(query, /conditionType=graded/);
  assert.match(query, /search=trout/);
  assert.match(query, /sortBy=player/);
  assert.match(query, /sortDir=asc/);
});

test('buildCollectionQuery omits All sport', () => {
  const query = buildCollectionQuery({ sport: 'All' });
  assert.equal(query, '');
});

test('parseCollectionSortBy defaults to created_at', () => {
  assert.equal(parseCollectionSortBy(null), 'created_at');
  assert.equal(parseCollectionSortBy('player'), 'player');
});

test('parseCollectionSortDir defaults to desc', () => {
  assert.equal(parseCollectionSortDir(null), 'desc');
  assert.equal(parseCollectionSortDir('asc'), 'asc');
});

test('composeGraderPrefillNotes includes AI estimates', () => {
  const notes = composeGraderPrefillNotes({
    sessionId: 'abc',
    frontImageUrl: null,
    subGrades: null,
    conditionNotes: 'Sharp corners.',
    psaPrediction: 9,
    bgsPrediction: 9,
    cgcPrediction: 9,
    imageCount: 1,
  });

  assert.match(notes, /Sharp corners/);
  assert.match(notes, /AI estimates/);
  assert.match(notes, /not a slab grade/);
});
