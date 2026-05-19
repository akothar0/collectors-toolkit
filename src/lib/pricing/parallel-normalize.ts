/** Parallel names that are autograph/condition markers, not CardSight print parallels. */
const NON_PARALLEL_TOKENS = new Set([
  'au',
  'auto',
  'autograph',
  'signed',
  'on-card auto',
  'on card auto',
  'sticker auto',
]);

/**
 * Returns a parallel name suitable for CardSight pricing filters, or null when the
 * value is an autograph marker (e.g. slab "AU") rather than a true parallel.
 */
export function normalizeParallelForPricing(value?: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  const lower = trimmed.toLowerCase();
  if (NON_PARALLEL_TOKENS.has(lower)) {
    return null;
  }

  return trimmed;
}
