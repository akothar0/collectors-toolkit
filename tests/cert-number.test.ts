import assert from 'node:assert/strict';
import test from 'node:test';
import { buildTrailingDigitCandidates, getPSACertUrl, normalizeCertNumber } from '../src/lib/cert-number';

test('normalizeCertNumber strips non-digits', () => {
  assert.equal(normalizeCertNumber('PSA #113364366'), '113364366');
  assert.equal(normalizeCertNumber('11336436'), '11336436');
});

test('buildTrailingDigitCandidates expands short OCR reads', () => {
  const candidates = buildTrailingDigitCandidates('11336436');
  assert.deepEqual(candidates, [
    '113364360',
    '113364361',
    '113364362',
    '113364363',
    '113364364',
    '113364365',
    '113364366',
    '113364367',
    '113364368',
    '113364369',
  ]);
});

test('getPSACertUrl builds the public PSA page link', () => {
  assert.equal(getPSACertUrl('113364366'), 'https://www.psacard.com/cert/113364366/psa');
});
