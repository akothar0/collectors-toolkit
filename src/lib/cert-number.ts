/** Strip non-digits from a cert number read by OCR or entered manually. */
export function normalizeCertNumber(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const digits = value.replace(/\D/g, '');
  return digits.length > 0 ? digits : null;
}

export function getPSACertUrl(certNumber: string | null | undefined) {
  const digits = normalizeCertNumber(certNumber);
  if (!digits) {
    return null;
  }

  return `https://www.psacard.com/cert/${digits}/psa`;
}
