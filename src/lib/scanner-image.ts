export function fileToDataUrl(file: File) {
  return file.arrayBuffer().then((bytes) => {
    const buffer = Buffer.from(bytes);
    const mimeType = file.type || 'image/jpeg';
    return `data:${mimeType};base64,${buffer.toString('base64')}`;
  });
}

export function isPersistableImageUrl(imageUrl: string | null | undefined) {
  if (!imageUrl?.trim()) {
    return false;
  }

  return /^https?:\/\//i.test(imageUrl.trim());
}

export function resolveStoredScanImageUrl(uploadedImageUrl: string | null | undefined) {
  return isPersistableImageUrl(uploadedImageUrl) ? (uploadedImageUrl?.trim() ?? '') : '';
}
