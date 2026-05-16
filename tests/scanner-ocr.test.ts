import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseScannerOcrResponse } from '../src/lib/scanner-ocr';

test('parseScannerOcrResponse reads output_text JSON', () => {
  const result = parseScannerOcrResponse({
    output_text: '{"certNumber":"113364366","gradingCompany":"PSA"}',
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
