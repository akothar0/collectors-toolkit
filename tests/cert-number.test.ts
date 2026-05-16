import assert from 'node:assert/strict';
import test from 'node:test';
import { getPSACertUrl, normalizeCertNumber } from '../src/lib/cert-number';

test('normalizeCertNumber strips non-digits', () => {
  assert.equal(normalizeCertNumber('PSA #113364366'), '113364366');
  assert.equal(normalizeCertNumber('11336436'), '11336436');
});

test('getPSACertUrl builds the public PSA page link', () => {
  assert.equal(getPSACertUrl('113364366'), 'https://www.psacard.com/cert/113364366/psa');
});
