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
  return getCertUrl('PSA', certNumber);
}

export function getCertUrl(gradingCompany: string | null | undefined, certNumber: string | null | undefined) {
  const digits = normalizeCertNumber(certNumber);
  if (!digits) {
    return null;
  }

  const company = (gradingCompany ?? 'PSA').trim().toUpperCase();

  if (company === 'PSA') {
    return `https://www.psacard.com/cert/${digits}/psa`;
  }

  if (company === 'BGS') {
    return `https://www.beckett.com/grading/card-lookup?item_type=BGS&item_id=${digits}`;
  }

  if (company === 'SGC') {
    return `https://www.gosgc.com/cert-code-lookup?cert=${digits}`;
  }

  if (company === 'CGC') {
    return `https://www.cgccards.com/certlookup/${digits}`;
  }

  return `https://www.cardgrade.io/verify/${digits}`;
}
