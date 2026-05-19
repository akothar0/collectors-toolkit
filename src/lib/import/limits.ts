export const IMPORT_DAILY_LIMIT = 100;
export const IMPORT_MAX_FILES = 10;
export const IMPORT_MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const IMPORT_MAX_PDF_BYTES = 15 * 1024 * 1024;
export const IMPORT_MAX_PARSED_ROWS = 200;
export const IMPORT_MAX_SAVE_ITEMS = 200;
export const IMPORT_MAX_PASTE_CHARS = 50_000;

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']);
const IMAGE_EXT = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif']);

export function fileExtension(name: string) {
  return name.split('.').pop()?.toLowerCase() ?? '';
}

export function validateImportFiles(files: File[], source: 'ebay_screenshot' | 'fanatics_pdf') {
  if (files.length === 0) {
    return { ok: false as const, status: 400, message: 'No files provided.' };
  }

  if (files.length > IMPORT_MAX_FILES) {
    return {
      ok: false as const,
      status: 413,
      message: `Too many files. Maximum is ${IMPORT_MAX_FILES} per import.`,
    };
  }

  for (const file of files) {
    const ext = fileExtension(file.name);
    if (source === 'fanatics_pdf') {
      if (file.type !== 'application/pdf' && ext !== 'pdf') {
        return { ok: false as const, status: 400, message: 'Fanatics import requires PDF files.' };
      }
      if (file.size > IMPORT_MAX_PDF_BYTES) {
        return {
          ok: false as const,
          status: 413,
          message: `PDF "${file.name}" exceeds the 15 MB limit.`,
        };
      }
    } else {
      const typeOk = !file.type || IMAGE_TYPES.has(file.type) || file.type.startsWith('image/');
      const extOk = IMAGE_EXT.has(ext);
      if (!typeOk && !extOk) {
        return { ok: false as const, status: 400, message: 'Screenshots must be image files (JPEG, PNG, WebP, or GIF).' };
      }
      if (file.size > IMPORT_MAX_IMAGE_BYTES) {
        return {
          ok: false as const,
          status: 413,
          message: `Image "${file.name}" exceeds the 10 MB limit.`,
        };
      }
    }
  }

  return { ok: true as const };
}

export function capParsedRows<T>(rows: T[]): T[] {
  return rows.slice(0, IMPORT_MAX_PARSED_ROWS);
}

export function assertParsedRowCount(count: number) {
  if (count > IMPORT_MAX_PARSED_ROWS) {
    return {
      ok: false as const,
      status: 422,
      message: `Too many purchases found (${count}). Maximum is ${IMPORT_MAX_PARSED_ROWS} per batch.`,
    };
  }
  return { ok: true as const };
}
