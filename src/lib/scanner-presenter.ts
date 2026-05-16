import type { OcrConfidence, ScannerResult } from '@/lib/scanner';

export function formatCatalogText(value: string | null | undefined) {
  if (!value?.trim()) {
    return '';
  }

  const trimmed = value.trim();
  const letters = trimmed.replace(/[^A-Za-z]/g, '');
  if (letters.length > 0 && letters === letters.toUpperCase()) {
    return trimmed.toLowerCase().replace(/\b[a-z]/g, (char) => char.toUpperCase());
  }

  return trimmed;
}

export function formatGradeValue(grade: number | null) {
  if (grade === null) {
    return '—';
  }

  return Number.isInteger(grade) ? grade.toFixed(0) : grade.toFixed(1);
}

export function confidenceLabel(confidence: OcrConfidence) {
  if (confidence === 'high') {
    return 'PSA verified';
  }

  if (confidence === 'medium') {
    return 'Confirm cert number';
  }

  return 'Could not read cert';
}

export function getVerifiedTitle(scan: ScannerResult) {
  if (!scan.certLookupSuccess || !scan.cardPlayer) {
    return null;
  }

  const year = scan.cardYear ? `${scan.cardYear} ` : '';
  return `${year}${formatCatalogText(scan.cardPlayer)}`.trim();
}

export function getVerifiedSubtitle(scan: ScannerResult) {
  if (!scan.certLookupSuccess) {
    return null;
  }

  const parts = [
    formatCatalogText(scan.cardManufacturer),
    scan.cardNumber,
    formatCatalogText(scan.cardParallel),
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(' · ') : formatCatalogText(scan.cardSport);
}

export function needsCertConfirmation(scan: ScannerResult) {
  return !scan.certLookupSuccess;
}
