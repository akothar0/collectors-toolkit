import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildLegacyPhotoUrls,
  mapCollectionPhotoRows,
} from '../src/lib/collection-photos';

test('mapCollectionPhotoRows sorts by position before mapping', () => {
  const photos = mapCollectionPhotoRows([
    {
      id: 'photo-2',
      image_url: 'https://example.com/back.jpg',
      position: 1,
      created_at: '2024-01-02T00:00:00Z',
    },
    {
      id: 'photo-1',
      image_url: 'https://example.com/front.jpg',
      position: 0,
      created_at: '2024-01-01T00:00:00Z',
    },
  ]);

  assert.deepEqual(photos, [
    { id: 'photo-1', imageUrl: 'https://example.com/front.jpg', position: 0 },
    { id: 'photo-2', imageUrl: 'https://example.com/back.jpg', position: 1 },
  ]);
});

test('buildLegacyPhotoUrls keeps non-empty front and back images in order', () => {
  assert.deepEqual(
    buildLegacyPhotoUrls('https://example.com/front.jpg', 'https://example.com/back.jpg'),
    ['https://example.com/front.jpg', 'https://example.com/back.jpg']
  );
  assert.deepEqual(buildLegacyPhotoUrls('https://example.com/front.jpg', null), [
    'https://example.com/front.jpg',
  ]);
});
