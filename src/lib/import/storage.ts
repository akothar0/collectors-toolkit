import { createServiceClient } from '@/lib/supabase';
import { fileExtension } from '@/lib/import/limits';

const IMPORT_FILES_BUCKET = 'import-files';
/** Signed URL lifetime for OpenAI vision fetches (seconds). */
const SIGNED_URL_TTL_SEC = 3600;

/**
 * Upload to private import-files bucket and return a short-lived signed URL.
 */
export async function uploadImportFileSigned(userId: string, file: File): Promise<string> {
  const supabase = createServiceClient();
  const ext = fileExtension(file.name) || 'bin';
  const path = `${userId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const bytes = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage.from(IMPORT_FILES_BUCKET).upload(path, bytes, {
    contentType: file.type || 'application/octet-stream',
    upsert: false,
  });

  if (uploadError) {
    throw new Error('Unable to upload import file.');
  }

  const { data, error: signError } = await supabase.storage
    .from(IMPORT_FILES_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SEC);

  if (signError || !data?.signedUrl) {
    throw new Error('Unable to create secure file URL.');
  }

  return data.signedUrl;
}
