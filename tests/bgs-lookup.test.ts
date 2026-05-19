import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseBGSLookupJson } from '../src/lib/cert-lookup/bgs';

const BECKETT_API_SAMPLE = {
  label: 'gold',
  item_id: '5957409',
  set_name: '2007 Bowman Chrome Prospects Refractors',
  sport_name: 'Baseball',
  card_key: 'BC238',
  player_name: 'Tim Lincecum AU',
  center_grade: '9.5',
  corners_grade: '9.0',
  edges_grade: '9.5',
  surface_grade: '9.5',
  autograph_grade: '10.0',
  final_grade: '9.5',
  pop_report: '142',
  grade_pop_report: '65',
  pop_higher: '4',
};

test('parseBGSLookupJson maps Beckett API payload (Tim Lincecum BGS 9.5)', () => {
  const result = parseBGSLookupJson('0005957409', BECKETT_API_SAMPLE);

  assert.ok(result);
  assert.equal(result?.certNumber, '5957409');
  assert.equal(result?.player, 'Tim Lincecum AU');
  assert.equal(result?.year, 2007);
  assert.match(result?.setName ?? '', /Bowman Chrome Prospects/i);
  assert.equal(result?.parallel, 'Refractors');
  assert.equal(result?.cardNumber, 'BC238');
  assert.equal(result?.grade, 9.5);
  assert.equal(result?.gradeDescription, 'GEM MINT');
  assert.equal(result?.autographGrade, 10);
  assert.equal(result?.subGrades?.centering, 9.5);
  assert.equal(result?.subGrades?.corners, 9);
  assert.equal(result?.popAtGrade, 65);
  assert.equal(result?.popHigher, 4);
  assert.equal(result?.source, 'beckett_scrape');
});

test('parseBGSLookupJson returns null for error payloads', () => {
  const result = parseBGSLookupJson('999', { error: 'not found' });
  assert.equal(result, null);
});
