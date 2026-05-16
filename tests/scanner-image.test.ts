import assert from 'node:assert/strict';
import test from 'node:test';
import { fileToDataUrl, resolveStoredScanImageUrl } from '../src/lib/scanner-image';

test('resolveStoredScanImageUrl prefers the uploaded storage URL', () => {
  assert.equal(resolveStoredScanImageUrl('https://example.com/upload.jpg', 'blob:preview'), 'https://example.com/upload.jpg');
});

test('resolveStoredScanImageUrl falls back to the client preview when storage upload fails', () => {
  assert.equal(resolveStoredScanImageUrl('', 'blob:preview'), 'blob:preview');
});

test('fileToDataUrl converts a file into a base64 data URL', async () => {
  const file = new File([new Uint8Array([0xff, 0xd8, 0xff])], 'sample.jpg', { type: 'image/jpeg' });
  const dataUrl = await fileToDataUrl(file);

  assert.match(dataUrl, /^data:image\/jpeg;base64,/);
});
