import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getCertLookupCandidates,
  getPSACertUrl,
  isPlausibleCertNumber,
  normalizeCertNumber,
} from '../src/lib/cert-number';

test('normalizeCertNumber strips non-digits', () => {
  assert.equal(normalizeCertNumber('PSA #113364366'), '113364366');
  assert.equal(normalizeCertNumber('11336436'), '11336436');
});

test('isPlausibleCertNumber accepts variable-length PSA certs', () => {
  assert.equal(isPlausibleCertNumber('113364366'), true);
  assert.equal(isPlausibleCertNumber('11336436'), true);
  assert.equal(isPlausibleCertNumber('1234567'), true);
  assert.equal(isPlausibleCertNumber('9'), false);
  assert.equal(isPlausibleCertNumber('1234'), false);
});

test('getPSACertUrl builds the public PSA page link', () => {
  assert.equal(getPSACertUrl('113364366'), 'https://www.psacard.com/cert/113364366/psa');
});

test('getCertLookupCandidates tries without leading zeros after full digits', () => {
  assert.deepEqual(getCertLookupCandidates('0005957409'), ['0005957409', '5957409']);
  assert.deepEqual(getCertLookupCandidates('5957409'), ['5957409']);
  assert.deepEqual(getCertLookupCandidates('PSA #6808214'), ['6808214']);
});
