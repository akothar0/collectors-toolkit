import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assessPricingEligibility,
  assessWantListPricingEligibility,
  mapSportToCardSightSegment,
} from '../src/lib/pricing/eligibility';

test('mapSportToCardSightSegment matches supported sports case-insensitively', () => {
  assert.equal(mapSportToCardSightSegment('baseball'), 'Baseball');
  assert.equal(mapSportToCardSightSegment('FOOTBALL'), 'Football');
  assert.equal(mapSportToCardSightSegment('Tennis'), null);
});

test('assessPricingEligibility blocks unsupported sport without other checks', () => {
  const result = assessPricingEligibility({
    sport: 'Tennis',
    player: 'Novak Djokovic',
    year: 2023,
    setName: 'Wimbledon',
    conditionType: 'raw',
  });

  assert.equal(result.ready, false);
  if (!result.ready) {
    assert.equal(result.status, 'unsupported_sport');
    assert.match(result.message, /Tennis/i);
  }
});

test('assessPricingEligibility requires player year and set', () => {
  const result = assessPricingEligibility({
    sport: 'Baseball',
    player: null,
    year: null,
    setName: null,
    conditionType: 'raw',
  });

  assert.equal(result.ready, false);
  if (!result.ready) {
    assert.equal(result.status, 'incomplete_identity');
    assert.ok(result.missingFields?.includes('player'));
    assert.ok(result.missingFields?.includes('year'));
    assert.ok(result.missingFields?.includes('set'));
  }
});

test('assessPricingEligibility is ready for complete baseball raw card', () => {
  const result = assessPricingEligibility({
    sport: 'Baseball',
    player: 'Juan Soto',
    year: 2018,
    setName: 'Topps Update',
    cardNumber: 'US175',
    conditionType: 'raw',
  });

  assert.equal(result.ready, true);
  if (result.ready) {
    assert.equal(result.segment, 'Baseball');
  }
});

test('assessPricingEligibility requires grading company and grade for graded cards', () => {
  const result = assessPricingEligibility({
    sport: 'Basketball',
    player: 'Luka Doncic',
    year: 2018,
    setName: 'Panini Prizm',
    cardNumber: '280',
    conditionType: 'graded',
    gradingCompany: null,
    grade: null,
  });

  assert.equal(result.ready, false);
  if (!result.ready) {
    assert.equal(result.status, 'incomplete_identity');
    assert.ok(result.missingFields?.includes('grading company'));
    assert.ok(result.missingFields?.includes('grade'));
  }
});

test('assessWantListPricingEligibility requires player year and set', () => {
  const result = assessWantListPricingEligibility({
    player: null,
    description: '  ',
    year: null,
    setName: null,
  });

  assert.equal(result.ready, false);
});
