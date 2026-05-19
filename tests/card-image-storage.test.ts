import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CARD_IMAGES_BUCKET,
  CardImageUploadError,
  isCardImageStorageConfigurationError,
  uploadPublicCardImageForClient,
} from '../src/lib/card-image-storage';

test('uploadPublicCardImageForClient returns the public URL from storage', async () => {
  const file = new File([new Uint8Array([1, 2, 3])], 'card.heic', { type: 'image/heic' });
  let uploadedBucket = '';
  let uploadedPath = '';
  let uploadedContentType = '';

  const supabase = {
    storage: {
      from(bucket: string) {
        uploadedBucket = bucket;
        return {
          async upload(path: string, _body: ArrayBuffer, options: { contentType: string }) {
            uploadedPath = path;
            uploadedContentType = options.contentType;
            return { error: null };
          },
          getPublicUrl(path: string) {
            return { data: { publicUrl: `https://cdn.example.com/${path}` } };
          },
        };
      },
    },
  };

  const publicUrl = await uploadPublicCardImageForClient(supabase, 'user-123', file);

  assert.equal(uploadedBucket, CARD_IMAGES_BUCKET);
  assert.match(uploadedPath, /^user-123\/\d+-[0-9a-f-]+\.heic$/);
  assert.equal(uploadedContentType, 'image/heic');
  assert.equal(publicUrl, `https://cdn.example.com/${uploadedPath}`);
});

test('uploadPublicCardImageForClient classifies missing bucket as storage configuration', async () => {
  const file = new File([new Uint8Array([1, 2, 3])], 'card.jpg', { type: 'image/jpeg' });
  const supabase = {
    storage: {
      from() {
        return {
          async upload() {
            return { error: { message: 'Bucket not found' } };
          },
          getPublicUrl() {
            return { data: { publicUrl: '' } };
          },
        };
      },
    },
  };

  await assert.rejects(
    () => uploadPublicCardImageForClient(supabase, 'user-123', file),
    (error: unknown) => {
      assert.equal(error instanceof CardImageUploadError, true);
      assert.equal((error as CardImageUploadError).code, 'storage_config');
      assert.equal(isCardImageStorageConfigurationError(error), true);
      return true;
    }
  );
});

test('isCardImageStorageConfigurationError detects env and bucket misconfiguration messages', () => {
  assert.equal(isCardImageStorageConfigurationError(new Error('SUPABASE_SECRET_KEY is not configured')), true);
  assert.equal(isCardImageStorageConfigurationError(new Error('Bucket not found')), true);
  assert.equal(isCardImageStorageConfigurationError(new Error('random upload failure')), false);
});
