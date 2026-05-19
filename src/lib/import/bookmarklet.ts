export type BookmarkletRow = { title?: unknown; price?: unknown; date?: unknown };

/** Decode bookmarklet payload from ?bd= or form field (URI-encoded JSON or legacy base64). */
export function parseBookmarkletPayload(raw: string): BookmarkletRow[] {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error('Empty bookmarklet data.');
  }

  // Current format: encodeURIComponent(JSON.stringify(items))
  try {
    const jsonText = trimmed.startsWith('[') || trimmed.startsWith('{') ? trimmed : decodeURIComponent(trimmed);
    const parsed = JSON.parse(jsonText) as unknown;
    if (Array.isArray(parsed)) {
      return parsed as BookmarkletRow[];
    }
    if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { items?: unknown }).items)) {
      return (parsed as { items: BookmarkletRow[] }).items;
    }
  } catch {
    // fall through to legacy base64
  }

  // Legacy: btoa(unescape(encodeURIComponent(JSON.stringify(items))))
  try {
    const decoded = Buffer.from(trimmed, 'base64').toString('utf-8');
    const parsed = JSON.parse(decoded) as unknown;
    if (Array.isArray(parsed)) {
      return parsed as BookmarkletRow[];
    }
  } catch {
    throw new Error('Invalid bookmarklet data.');
  }

  throw new Error('Invalid bookmarklet data.');
}

export function bookmarkletRowsToParsedItems(rows: BookmarkletRow[]) {
  return rows
    .map((r) => ({
      rawTitle: typeof r.title === 'string' ? r.title.trim() : '',
      rawPrice:
        typeof r.price === 'number' && Number.isFinite(r.price)
          ? r.price
          : typeof r.price === 'string' && r.price
            ? Number.parseFloat(r.price.replace(/[^0-9.]/g, '')) || null
            : null,
      rawDate: typeof r.date === 'string' && r.date ? r.date : null,
      rawSource: 'eBay',
    }))
    .filter((item) => item.rawTitle.length > 0);
}
