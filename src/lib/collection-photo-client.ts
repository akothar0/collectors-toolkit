import { readJsonResponse } from '@/lib/http-json';

export type PendingCollectionPhoto = {
  id: string;
  file: File;
  previewUrl: string;
};

export function makePendingCollectionPhotos(files: File[]) {
  return files.map((file) => ({
    id: crypto.randomUUID(),
    file,
    previewUrl: URL.createObjectURL(file),
  }));
}

export async function uploadCollectionPhotoFiles(files: File[]) {
  if (files.length === 0) {
    return [];
  }

  const formData = new FormData();
  for (const file of files) {
    formData.append('images', file);
  }

  const response = await fetch('/api/collection/image', {
    method: 'POST',
    body: formData,
  });
  const data = await readJsonResponse<{ imageUrls?: string[]; imageUrl?: string | null; error?: string }>(response);

  if (!response.ok) {
    throw new Error(data.error ?? 'Unable to upload photos.');
  }

  if (Array.isArray(data.imageUrls) && data.imageUrls.length > 0) {
    return data.imageUrls;
  }

  if (data.imageUrl) {
    return [data.imageUrl];
  }

  return [];
}
