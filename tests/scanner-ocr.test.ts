import assert from 'node:assert/strict';
import { test } from 'node:test';
import { extractCertDigits, inferConfidence, parseScannerOcrResponse } from '../src/lib/scanner-ocr';

test('parseScannerOcrResponse reads output_text JSON', () => {
  const result = parseScannerOcrResponse({
    output_text: '{"certNumber":"113364366","gradingCompany":"PSA"}',
  });

  assert.deepEqual(result, {
    certNumber: '113364366',
    gradingCompany: 'PSA',
  });
});

test('parseScannerOcrResponse reads structured content.parsed object', () => {
  const result = parseScannerOcrResponse({
    output: [
      {
        type: 'message',
        content: [
          {
            type: 'output_text',
            parsed: { certNumber: '113364366', gradingCompany: 'PSA' },
          },
        ],
      },
    ],
  });

  assert.deepEqual(result, {
    certNumber: '113364366',
    gradingCompany: 'PSA',
  });
});

test('parseScannerOcrResponse normalizes numeric cert values from the model', () => {
  const result = parseScannerOcrResponse({
    output: [
      {
        type: 'message',
        content: [
          {
            type: 'output_text',
            parsed: { certNumber: 113364366, gradingCompany: 'PSA' },
          },
        ],
      },
    ],
  });

  assert.deepEqual(result, {
    certNumber: '113364366',
    gradingCompany: 'PSA',
  });
});

test('parseScannerOcrResponse reads JSON from output content when output_text is empty', () => {
  const result = parseScannerOcrResponse({
    output_text: '',
    output: [
      {
        type: 'message',
        content: [
          {
            type: 'output_text',
            text: '{"certNumber":"113364366","gradingCompany":"PSA"}',
          },
        ],
      },
    ],
  });

  assert.deepEqual(result, {
    certNumber: '113364366',
    gradingCompany: 'PSA',
  });
});

test('parseScannerOcrResponse returns null when no structured text exists', () => {
  assert.equal(parseScannerOcrResponse({ output_text: '', output: [] }), null);
});

test('extractCertDigits strips non-digits', () => {
  assert.equal(extractCertDigits('#113364366'), '113364366');
});

test('inferConfidence stays medium until PSA validates the read', () => {
  assert.equal(inferConfidence('113364366', 'PSA'), 'medium');
  assert.equal(inferConfidence('11336436', 'PSA'), 'medium');
  assert.equal(inferConfidence('1234567', 'PSA'), 'medium');
  assert.equal(inferConfidence('1234', 'PSA'), 'low');
});
