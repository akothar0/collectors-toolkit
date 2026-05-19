import assert from 'node:assert/strict';
import test from 'node:test';
import {
  bookmarkletRowsToParsedItems,
  parseBookmarkletPayload,
} from '../src/lib/import/bookmarklet';
import {
  assertParsedRowCount,
  capParsedRows,
  IMPORT_MAX_FILES,
  IMPORT_MAX_PARSED_ROWS,
  IMPORT_MAX_SAVE_ITEMS,
  validateImportFiles,
} from '../src/lib/import/limits';
import { fileToDataUrl } from '../src/lib/import/file-data-url';

test('fileToDataUrl converts uploads into inline data URLs', async () => {
  const file = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'shot.png', { type: 'image/png' });
  const url = await fileToDataUrl(file);
  assert.equal(url, 'data:image/png;base64,iVBORw==');
});

test('parseBookmarkletPayload parses URI-encoded JSON array', () => {
  const items = [{ title: '2020 Mike Trout PSA 10', price: 100, date: 'Jan 1, 2024' }];
  const encoded = encodeURIComponent(JSON.stringify(items));
  const rows = parseBookmarkletPayload(encoded);
  assert.equal(rows.length, 1);
  const parsed = bookmarkletRowsToParsedItems(rows);
  assert.equal(parsed[0]?.rawTitle, '2020 Mike Trout PSA 10');
  assert.equal(parsed[0]?.rawSource, 'eBay');
});

test('parseBookmarkletPayload supports legacy base64 payloads', () => {
  const items = [{ title: 'Legacy Card Title Here!!', price: '50.00', date: null }];
  const b64 = Buffer.from(JSON.stringify(items), 'utf-8').toString('base64');
  const rows = parseBookmarkletPayload(b64);
  assert.equal(rows.length, 1);
});

test('parseBookmarkletPayload rejects invalid data', () => {
  assert.throws(() => parseBookmarkletPayload('not-valid-json!!!'), /Invalid bookmarklet/);
});

test('validateImportFiles rejects too many files', () => {
  const files = Array.from({ length: IMPORT_MAX_FILES + 1 }, (_, i) => {
    return new File(['x'], `shot-${i}.jpg`, { type: 'image/jpeg' });
  });
  const result = validateImportFiles(files, 'ebay_screenshot');
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.status, 413);
  }
});

test('validateImportFiles rejects oversized images', () => {
  const big = new File([new Uint8Array(11 * 1024 * 1024)], 'big.jpg', { type: 'image/jpeg' });
  const result = validateImportFiles([big], 'ebay_screenshot');
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.status, 413);
  }
});

test('capParsedRows and assertParsedRowCount enforce batch size', () => {
  const rows = Array.from({ length: IMPORT_MAX_PARSED_ROWS + 5 }, () => ({ rawTitle: 'x' }));
  const check = assertParsedRowCount(rows.length);
  assert.equal(check.ok, false);
  const capped = capParsedRows(rows);
  assert.equal(capped.length, IMPORT_MAX_PARSED_ROWS);
});

test('IMPORT_MAX_SAVE_ITEMS is 200', () => {
  assert.equal(IMPORT_MAX_SAVE_ITEMS, 200);
});
