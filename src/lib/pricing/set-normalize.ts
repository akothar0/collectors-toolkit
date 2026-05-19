/** Light normalization before catalog search / scoring. */
export function normalizeSetNameForSearch(setName: string | null | undefined): string | null {
  const trimmed = setName?.trim();
  if (!trimmed) return null;

  return trimmed
    .replace(/\s+/g, ' ')
    .replace(/\bupdate series\b/gi, 'Update')
    .replace(/\bchrome\b/gi, 'Chrome')
    .trim();
}
