import assert from 'node:assert/strict';
import test from 'node:test';
import { buildScanDetailRows, getScanHeadline, getScanStatus } from '../src/lib/scanner-presenter';
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
  cardPlayer: 'Shohei Ohtani',
  cardYear: 2018,
  cardManufacturer: 'Topps',
  cardSport: 'Baseball',
  cardSet: null,
  cardParallel: 'Refractor',
  cardNumber: '700',
  officialGrade: 10,
  gradeDescription: 'Gem Mint',
  qualifierCode: null,
  autographGrade: null,
  isDualCert: false,
  popAtGrade: 120,
  popWithQualifier: 4,
  popHigher: 300,
};

test('getScanStatus returns verified for PSA matches', () => {
  assert.equal(getScanStatus(verifiedScan), 'verified');
});

test('getScanHeadline formats verified card title', () => {
  assert.equal(getScanHeadline(verifiedScan), '2018 Topps Shohei Ohtani');
});

test('buildScanDetailRows includes cert and grade fields', () => {
  const rows = buildScanDetailRows(verifiedScan);
  assert.ok(rows.some((row) => row.label === 'Cert number' && row.value === '113364366'));
  assert.ok(rows.some((row) => row.label === 'Grade' && row.value.includes('PSA')));
});
