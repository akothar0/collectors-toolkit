import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  certLookupFailureMessage,
  normalizeLookupGradingCompany,
} from '../src/lib/cert-lookup/index';

test('normalizeLookupGradingCompany defaults unknown values to PSA', () => {
  assert.equal(normalizeLookupGradingCompany('psa'), 'PSA');
  assert.equal(normalizeLookupGradingCompany('BGS'), 'BGS');
  assert.equal(normalizeLookupGradingCompany(''), 'PSA');
  assert.equal(normalizeLookupGradingCompany('foo'), 'PSA');
});

test('certLookupFailureMessage is grader-specific', () => {
  assert.match(certLookupFailureMessage('PSA', '12345'), /PSA/);
  assert.match(certLookupFailureMessage('BGS', '12345'), /Beckett/);
  assert.match(certLookupFailureMessage('SGC', '12345'), /not supported/i);
});
