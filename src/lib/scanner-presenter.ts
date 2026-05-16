import type { OcrConfidence, ScannerResult } from '@/lib/scanner';

export type ScanStatus = 'verified' | 'partial' | 'needs_input';

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
    const manufacturer = scan.cardManufacturer ? `${scan.cardManufacturer} ` : '';
    return `${year}${manufacturer}${scan.cardPlayer}`.trim();
  }

  if (scan.ocrCertNumber) {
    return `Cert ${scan.ocrCertNumber} detected`;
  }

  return 'Slab scan ready for review';
}

export function getScanSubheadline(scan: ScannerResult) {
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

export type ScanDetailRow = {
  label: string;
  value: string;
};

export function buildScanDetailRows(scan: ScannerResult): ScanDetailRow[] {
  const rows: ScanDetailRow[] = [
    { label: 'Cert number', value: scan.certNumber ?? scan.ocrCertNumber ?? '—' },
    {
      label: 'Grading company',
      value: scan.gradingCompany ?? scan.ocrGradingCompany ?? '—',
    },
    { label: 'Grade', value: formatGradeLabel(scan.officialGrade, scan.gradingCompany, scan.qualifierCode) },
    { label: 'Grade label', value: scan.gradeDescription ?? '—' },
    { label: 'Player', value: scan.cardPlayer ?? '—' },
    { label: 'Year', value: scan.cardYear?.toString() ?? '—' },
    { label: 'Set / brand', value: scan.cardManufacturer ?? scan.cardSet ?? '—' },
    { label: 'Card #', value: scan.cardNumber ?? '—' },
    { label: 'Parallel', value: scan.cardParallel ?? '—' },
    { label: 'Sport', value: scan.cardSport ?? '—' },
  ];

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
    { label: 'Pop at grade', value: scan.popAtGrade?.toLocaleString() ?? '—' },
    { label: 'Pop higher', value: scan.popHigher?.toLocaleString() ?? '—' },
    { label: 'Pop w/ qualifier', value: scan.popWithQualifier?.toLocaleString() ?? '—' },
  ];
}
