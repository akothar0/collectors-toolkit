/** Strip non-digits from a cert number read by OCR or entered manually. */
export function normalizeCertNumber(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const digits = value.replace(/\D/g, '');
  return digits.length > 0 ? digits : null;
}

/**
 * PSA OCR sometimes drops the last digit (e.g. 11336436 vs 113364366).
 * When lookup fails on a 7–8 digit cert, try appending each trailing digit 0–9.
 */
export function buildTrailingDigitCandidates(certNumber: string) {
  const digits = normalizeCertNumber(certNumber);
  if (!digits || digits.length < 7 || digits.length > 8) {
    return [];
  }

  return Array.from({ length: 10 }, (_, digit) => `${digits}${digit}`);
}

export function getPSACertUrl(certNumber: string | null | undefined) {
  const digits = normalizeCertNumber(certNumber);
  if (!digits) {
    return null;
  }

  return `https://www.psacard.com/cert/${digits}/psa`;
}
