const PSA_MANUFACTURERS = [
  'PANINI',
  'TOPPS',
  'BOWMAN',
  'UPPER DECK',
  'DONRUSS',
  'FLEER',
  'LEAF',
  'SKYBOX',
  'SCORE',
  'PLAYOFF',
  'PACIFIC',
  'STADIUM CLUB',
  'FINEST',
  'HERITAGE',
  'ALLEN & GINTER',
  'ALLEN AND GINTER',
] as const;

export function parsePsaBrand(brand: string | null | undefined): {
  manufacturer: string | null;
  setName: string | null;
} {
  const trimmed = brand?.trim();
  if (!trimmed) {
    return { manufacturer: null, setName: null };
  }

  const upper = trimmed.toUpperCase();

  for (const token of PSA_MANUFACTURERS) {
    if (upper === token) {
      return { manufacturer: token, setName: null };
    }
    if (upper.startsWith(`${token} `)) {
      return {
        manufacturer: token,
        setName: trimmed.slice(token.length).trim() || null,
      };
    }
  }

  const firstSpace = trimmed.indexOf(' ');
  if (firstSpace > 0) {
    return {
      manufacturer: trimmed.slice(0, firstSpace).trim(),
      setName: trimmed.slice(firstSpace + 1).trim() || null,
    };
  }

  return { manufacturer: trimmed, setName: null };
}
