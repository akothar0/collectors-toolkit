import assert from 'node:assert/strict';
import test from 'node:test';
import { fileToDataUrl, isPersistableImageUrl, resolveStoredScanImageUrl } from '../src/lib/scanner-image';

test('resolveStoredScanImageUrl prefers the uploaded storage URL', () => {
  assert.equal(resolveStoredScanImageUrl('https://example.com/upload.jpg'), 'https://example.com/upload.jpg');
});

test('resolveStoredScanImageUrl drops non-durable client preview URLs', () => {
  assert.equal(resolveStoredScanImageUrl('blob:preview'), '');
  assert.equal(resolveStoredScanImageUrl('data:image/jpeg;base64,abc123'), '');
});

test('isPersistableImageUrl allows only http and https URLs', () => {
  assert.equal(isPersistableImageUrl('https://example.com/upload.jpg'), true);
  assert.equal(isPersistableImageUrl('http://example.com/upload.jpg'), true);
  assert.equal(isPersistableImageUrl('blob:preview'), false);
  assert.equal(isPersistableImageUrl('data:image/jpeg;base64,abc123'), false);
});

test('fileToDataUrl converts a file into a base64 data URL', async () => {
  const file = new File([new Uint8Array([0xff, 0xd8, 0xff])], 'sample.jpg', { type: 'image/jpeg' });
  const dataUrl = await fileToDataUrl(file);

  assert.match(dataUrl, /^data:image\/jpeg;base64,/);
});
