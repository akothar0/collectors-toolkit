export function fileToDataUrl(file: File) {
  return file.arrayBuffer().then((bytes) => {
    const buffer = Buffer.from(bytes);
    const mimeType = file.type || 'image/jpeg';
    return `data:${mimeType};base64,${buffer.toString('base64')}`;
  });
}

export function resolveStoredScanImageUrl(uploadedImageUrl: string | null | undefined, fallbackImageUrl: string | null | undefined) {
  return uploadedImageUrl?.trim() || fallbackImageUrl?.trim() || '';
}
