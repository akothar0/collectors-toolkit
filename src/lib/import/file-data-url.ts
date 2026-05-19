export async function fileToDataUrl(file: File): Promise<string> {
  const mimeType = file.type || 'application/octet-stream';
  const bytes = Buffer.from(await file.arrayBuffer());
  return `data:${mimeType};base64,${bytes.toString('base64')}`;
}
