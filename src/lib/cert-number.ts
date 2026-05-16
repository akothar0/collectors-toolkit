/** Strip non-digits from a cert number read by OCR or entered manually. */
export function normalizeCertNumber(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const digits = value.replace(/\D/g, '');
  return digits.length > 0 ? digits : null;
}

/** PSA cert numbers vary in length; use a low floor to ignore obvious non-cert reads (e.g. a lone grade digit). */
export function isPlausibleCertNumber(value: string | null | undefined) {
  const digits = normalizeCertNumber(value);
  return Boolean(digits && digits.length >= 5);
}

export function getPSACertUrl(certNumber: string | null | undefined) {
  const digits = normalizeCertNumber(certNumber);
  if (!digits) {
    return null;
  }

  return `https://www.psacard.com/cert/${digits}/psa`;
}
