import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parsePsaBrand } from '../src/lib/cert-lookup/psa-brand';

test('parsePsaBrand splits Panini product line', () => {
  assert.deepEqual(parsePsaBrand('PANINI SELECT EMERGING STAR SIGNATURES'), {
    manufacturer: 'PANINI',
    setName: 'SELECT EMERGING STAR SIGNATURES',
  });
});

test('parsePsaBrand handles single token brand', () => {
  assert.deepEqual(parsePsaBrand('TOPPS'), {
    manufacturer: 'TOPPS',
    setName: null,
  });
});
