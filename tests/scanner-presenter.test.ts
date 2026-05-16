import assert from 'node:assert/strict';
import test from 'node:test';
import {
  confidenceLabel,
  formatAutographGradeLabel,
  formatPopCount,
  getGraderLabel,
  getVerifiedCategoryLabel,
  getVerifiedSubtitle,
  getVerifiedTitle,
  hasPsaPopulationStats,
  needsCertConfirmation,
} from '../src/lib/scanner-presenter';
import { inferConfidence as inferOcrConfidence } from '../src/lib/scanner-ocr';
import type { ScannerResult } from '../src/lib/scanner';

const verifiedScan: ScannerResult = {
  scanId: 'scan-1',
  imageUrl: 'https://example.com/slab.jpg',
  ocrCertNumber: '113364366',
  ocrGradingCompany: 'PSA',
  ocrConfidence: 'high',
  certLookupSuccess: true,
  certNumber: '113364366',
  gradingCompany: 'PSA',
  itemStatus: 'Y',
  cardId: 'card-1',
  cardPlayer: 'CHRISTIAN PULISIC',
  cardYear: 2016,
  cardManufacturer: 'PANINI SELECT EMERGING STAR SIGNATURES',
  cardSport: 'SOCCER CARDS',
  cardSet: 'PANINI SELECT EMERGING STAR SIGNATURES',
  cardParallel: 'EMERGING STAR SIGNATURE',
  cardNumber: 'ES-CP',
  officialGrade: 9,
  gradeDescription: 'MINT 9',
  qualifierCode: null,
  autographGrade: null,
  isDualCert: false,
  popAtGrade: 32,
  popWithQualifier: 0,
  popHigher: 4,
};

test('getVerifiedTitle formats player and year', () => {
  assert.equal(getVerifiedTitle(verifiedScan), '2016 Christian Pulisic');
});

test('getVerifiedSubtitle includes set and card number', () => {
  assert.match(getVerifiedSubtitle(verifiedScan) ?? '', /ES-CP/);
});

test('formatPopCount formats population integers', () => {
  assert.equal(formatPopCount(32), '32');
  assert.equal(formatPopCount(1200), '1,200');
  assert.equal(formatPopCount(null), null);
});

test('getVerifiedCategoryLabel title-cases PSA category', () => {
  assert.equal(getVerifiedCategoryLabel(verifiedScan), 'Soccer Cards');
});

test('hasPsaPopulationStats is true when PSA pop fields exist', () => {
  assert.equal(hasPsaPopulationStats(verifiedScan), true);
  assert.equal(
    hasPsaPopulationStats({ ...verifiedScan, popAtGrade: null, popHigher: null }),
    false
  );
  assert.equal(hasPsaPopulationStats({ ...verifiedScan, gradingCompany: 'BGS' }), false);
});

test('confidenceLabel reflects grading company when verified', () => {
  assert.equal(confidenceLabel('high', 'BGS'), 'BGS verified');
  assert.equal(getGraderLabel('SGC'), 'SGC');
});

test('formatAutographGradeLabel returns null without autograph grade', () => {
  assert.equal(formatAutographGradeLabel(null), null);
  assert.equal(formatAutographGradeLabel(10), 'Auto grade 10');
});

test('needsCertConfirmation is true until PSA verifies', () => {
  assert.equal(needsCertConfirmation(verifiedScan), false);
  assert.equal(needsCertConfirmation({ ...verifiedScan, certLookupSuccess: false }), true);
});

test('inferConfidence is medium for any plausible grader OCR read', () => {
  assert.equal(inferOcrConfidence('113364366', 'PSA'), 'medium');
  assert.equal(inferOcrConfidence('11336436', 'PSA'), 'medium');
  assert.equal(inferOcrConfidence('0012345678', 'BGS'), 'medium');
});
