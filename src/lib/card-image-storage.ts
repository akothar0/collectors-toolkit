import { createServiceClient } from '@/lib/supabase';

export const CARD_IMAGES_BUCKET = 'card-images';
export const CARD_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const CARD_IMAGE_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
] as const;

type StorageBucketClient = {
  upload: (
    path: string,
    body: ArrayBuffer,
    options: { contentType: string; upsert: boolean }
  ) => Promise<{ error: { message: string } | null }>;
  getPublicUrl: (path: string) => { data: { publicUrl: string } };
};

type StorageClient = {
  storage: {
    from: (bucket: string) => StorageBucketClient;
  };
};

export class CardImageUploadError extends Error {
  code: 'storage_config' | 'upload_failed';

  constructor(code: 'storage_config' | 'upload_failed', message: string) {
    super(message);
    this.name = 'CardImageUploadError';
    this.code = code;
  }
}

export function isCardImageStorageConfigurationError(error: unknown) {
  if (error instanceof CardImageUploadError) {
    return error.code === 'storage_config';
  }

  if (!(error instanceof Error)) {
    return false;
  }

  return /bucket not found|is not configured/i.test(error.message);
}

function classifyCardImageUploadError(error: unknown) {
  if (error instanceof CardImageUploadError) {
    return error;
  }

  if (isCardImageStorageConfigurationError(error)) {
    return new CardImageUploadError(
      'storage_config',
      `Supabase storage bucket "${CARD_IMAGES_BUCKET}" is not configured.`
    );
  }

  if (error instanceof Error) {
    return new CardImageUploadError('upload_failed', `Unable to upload image: ${error.message}`);
  }

  return new CardImageUploadError('upload_failed', 'Unable to upload image.');
}

function fileExtension(name: string) {
  return name.split('.').pop()?.toLowerCase() ?? 'jpg';
}

export async function uploadPublicCardImageForClient(
  supabase: StorageClient,
  userId: string,
  imageFile: File
) {
  const extension = fileExtension(imageFile.name);
  const path = `${userId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const bytes = await imageFile.arrayBuffer();
  const bucket = supabase.storage.from(CARD_IMAGES_BUCKET);

  const { error } = await bucket.upload(path, bytes, {
    contentType: imageFile.type || 'image/jpeg',
    upsert: false,
  });

  if (error) {
    throw classifyCardImageUploadError(new Error(error.message));
  }

  const { data } = bucket.getPublicUrl(path);
  if (!data?.publicUrl) {
    throw new CardImageUploadError('upload_failed', 'Unable to resolve uploaded image URL.');
  }

  return data.publicUrl;
}

export async function uploadPublicCardImage(userId: string, imageFile: File) {
  try {
    return await uploadPublicCardImageForClient(createServiceClient(), userId, imageFile);
  } catch (error) {
    throw classifyCardImageUploadError(error);
  }
}

export async function uploadPublicCardImages(userId: string, imageFiles: File[]) {
  return Promise.all(imageFiles.map((imageFile) => uploadPublicCardImage(userId, imageFile)));
}
