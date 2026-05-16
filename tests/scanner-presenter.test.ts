import assert from 'node:assert/strict';
import test from 'node:test';
import { getVerifiedSubtitle, getVerifiedTitle, needsCertConfirmation } from '../src/lib/scanner-presenter';
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

test('needsCertConfirmation is true until PSA verifies', () => {
  assert.equal(needsCertConfirmation(verifiedScan), false);
  assert.equal(needsCertConfirmation({ ...verifiedScan, certLookupSuccess: false }), true);
});

test('inferConfidence is medium for any plausible PSA OCR read', () => {
  assert.equal(inferOcrConfidence('113364366', 'PSA'), 'medium');
  assert.equal(inferOcrConfidence('11336436', 'PSA'), 'medium');
});
