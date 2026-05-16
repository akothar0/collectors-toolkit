import { getPSACertUrl } from '@/lib/cert-number';
import type { OcrConfidence, ScannerResult } from '@/lib/scanner';

export type ScanStatus = 'verified' | 'partial' | 'needs_input';

export type ScanDetailRow = {
  label: string;
  value: string;
  href?: string | null;
};

export function formatCatalogText(value: string | null | undefined) {
  if (!value?.trim()) {
    return '—';
  }

  const trimmed = value.trim();
  const letters = trimmed.replace(/[^A-Za-z]/g, '');
  if (letters.length > 0 && letters === letters.toUpperCase()) {
    return trimmed
      .toLowerCase()
      .replace(/\b[a-z]/g, (char) => char.toUpperCase());
  }

  return trimmed;
}

export function getScanStatus(scan: ScannerResult): ScanStatus {
  if (scan.certLookupSuccess) {
    return 'verified';
  }

  if (scan.ocrCertNumber || scan.certNumber) {
    return 'partial';
  }

  return 'needs_input';
}

export function getScanHeadline(scan: ScannerResult) {
  if (scan.certLookupSuccess && scan.cardPlayer) {
    const year = scan.cardYear ? `${scan.cardYear} ` : '';
    return `${year}${formatCatalogText(scan.cardPlayer)}`.trim();
  }

  if (scan.ocrCertNumber || scan.certNumber) {
    return `Cert ${scan.certNumber ?? scan.ocrCertNumber}`;
  }

  return 'Slab scan ready for review';
}

export function getScanSubheadline(scan: ScannerResult) {
  if (scan.certLookupSuccess) {
    const pieces = [
      formatCatalogText(scan.cardManufacturer),
      scan.cardNumber,
      formatCatalogText(scan.cardParallel),
    ].filter((value) => value !== '—');

    return pieces.length > 0 ? pieces.join(' · ') : formatCatalogText(scan.cardSport);
  }

  const pieces = [scan.cardParallel, scan.cardNumber, scan.cardSport].filter(
    (value) => typeof value === 'string' && value.trim().length > 0
  );

  return pieces.length > 0 ? pieces.join(' · ') : null;
}

export function formatGradeValue(grade: number | null) {
  if (grade === null) {
    return '—';
  }

  return Number.isInteger(grade) ? grade.toFixed(0) : grade.toFixed(1);
}

export function formatGradeLabel(grade: number | null, company: string | null, qualifier: string | null) {
  if (grade === null || !company) {
    return 'Unverified';
  }

  const gradeText = formatGradeValue(grade);
  return qualifier ? `${company} ${gradeText} (${qualifier})` : `${company} ${gradeText}`;
}

export function confidenceLabel(confidence: OcrConfidence) {
  if (confidence === 'high') {
    return 'High confidence';
  }

  if (confidence === 'medium') {
    return 'Medium confidence';
  }

  return 'Low confidence';
}

export function buildScanDetailRows(scan: ScannerResult): ScanDetailRow[] {
  const cert = scan.certNumber ?? scan.ocrCertNumber;
  const certUrl = getPSACertUrl(cert);

  const rows: ScanDetailRow[] = [
    {
      label: 'Cert number',
      value: cert ?? '—',
      href: certUrl,
    },
    {
      label: 'Grading company',
      value: scan.gradingCompany ?? scan.ocrGradingCompany ?? '—',
    },
    { label: 'Grade', value: formatGradeLabel(scan.officialGrade, scan.gradingCompany, scan.qualifierCode) },
    { label: 'Grade label', value: formatCatalogText(scan.gradeDescription) },
    { label: 'Player', value: formatCatalogText(scan.cardPlayer) },
    { label: 'Year', value: scan.cardYear?.toString() ?? '—' },
    { label: 'Set / brand', value: formatCatalogText(scan.cardManufacturer ?? scan.cardSet) },
    { label: 'Card #', value: scan.cardNumber ?? '—' },
    { label: 'Parallel / variety', value: formatCatalogText(scan.cardParallel) },
    { label: 'Sport', value: formatCatalogText(scan.cardSport) },
  ];

  if (scan.psaSpecId) {
    rows.push({ label: 'PSA Spec ID', value: scan.psaSpecId });
  }

  if (scan.isDualCert) {
    rows.push({ label: 'Dual cert', value: 'Yes' });
  }

  if (scan.autographGrade !== null) {
    rows.push({
      label: 'Autograph grade',
      value: formatGradeValue(scan.autographGrade),
    });
  }

  return rows;
}

export function buildPopulationRows(scan: ScannerResult): ScanDetailRow[] {
  if (!scan.certLookupSuccess) {
    return [];
  }

  return [
    { label: 'Pop at this grade', value: scan.popAtGrade?.toLocaleString() ?? '—' },
    { label: 'Pop higher', value: scan.popHigher?.toLocaleString() ?? '—' },
    { label: 'Pop w/ qualifier', value: scan.popWithQualifier?.toLocaleString() ?? '—' },
  ];
}

export function getCertCorrectionMessage(scan: ScannerResult) {
  if (!scan.certCorrectedFrom || !scan.certNumber) {
    return null;
  }

  return `Label OCR read ${scan.certCorrectedFrom}, but PSA verified cert ${scan.certNumber}.`;
}
