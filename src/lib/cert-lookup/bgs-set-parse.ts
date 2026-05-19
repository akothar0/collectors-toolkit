const PARALLEL_SUFFIXES = [
  'Refractors',
  'Prizm',
  'Gold',
  'Silver',
  'Blue',
  'Green',
  'Red',
  'Orange',
  'Purple',
  'Black',
  'Mojo',
  'Shimmer',
  'Holo',
  'Wave',
  'Cracked Ice',
  'Die-Cut',
  'Die Cut',
] as const;

export function parseBgsSetName(setName: string | null): {
  setName: string | null;
  parallel: string | null;
} {
  if (!setName?.trim()) {
    return { setName: null, parallel: null };
  }

  const trimmed = setName.trim();

  for (const suffix of PARALLEL_SUFFIXES) {
    const pattern = new RegExp(`\\b${suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (!pattern.test(trimmed)) {
      continue;
    }

    const without = trimmed.replace(pattern, '').replace(/\s+/g, ' ').trim();
    return {
      setName: without || trimmed,
      parallel: suffix,
    };
  }

  return { setName: trimmed, parallel: null };
}
