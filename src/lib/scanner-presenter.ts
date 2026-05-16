import type { LookupSource, OcrConfidence, ScannerResult } from '@/lib/scanner';

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

export function getGraderLabel(gradingCompany: string | null | undefined) {
  const company = (gradingCompany ?? '').trim().toUpperCase();
  if (company === 'PSA' || company === 'BGS' || company === 'SGC' || company === 'CGC') {
    return company;
  }

  return 'Cert';
}

export function confidenceLabel(confidence: OcrConfidence, gradingCompany?: string | null) {
  if (confidence === 'high') {
    return `${getGraderLabel(gradingCompany)} verified`;
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
    formatCatalogText(scan.cardSet ?? scan.cardManufacturer),
    scan.cardNumber,
    formatCatalogText(scan.cardParallel),
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(' · ') : formatCatalogText(scan.cardSport);
}

export function needsCertConfirmation(scan: ScannerResult) {
  return !scan.certLookupSuccess;
}

export function formatPopCount(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null;
  }

  return value.toLocaleString('en-US');
}

export function getVerifiedCategoryLabel(scan: ScannerResult) {
  if (!scan.certLookupSuccess || !scan.cardSport?.trim()) {
    return null;
  }

  const hasCatalogParts = Boolean(
    scan.cardSet?.trim() || scan.cardManufacturer?.trim() || scan.cardNumber?.trim() || scan.cardParallel?.trim()
  );
  if (!hasCatalogParts) {
    return null;
  }

  return formatCatalogText(scan.cardSport);
}

export function formatAutographGradeLabel(autographGrade: number | null | undefined) {
  if (autographGrade === null || autographGrade === undefined || !Number.isFinite(autographGrade)) {
    return null;
  }

  return `Auto grade ${formatGradeValue(autographGrade)}`;
}

export function formatSubGradesLabel(subGrades: ScannerResult['subGrades']) {
  if (!subGrades) {
    return null;
  }

  const parts: string[] = [];
  if (subGrades.centering !== undefined) {
    parts.push(`C ${formatGradeValue(subGrades.centering)}`);
  }
  if (subGrades.corners !== undefined) {
    parts.push(`CR ${formatGradeValue(subGrades.corners)}`);
  }
  if (subGrades.edges !== undefined) {
    parts.push(`E ${formatGradeValue(subGrades.edges)}`);
  }
  if (subGrades.surface !== undefined) {
    parts.push(`S ${formatGradeValue(subGrades.surface)}`);
  }

  return parts.length > 0 ? parts.join(' · ') : null;
}

export function hasPsaPopulationStats(scan: ScannerResult) {
  return scan.gradingCompany === 'PSA' && (scan.popAtGrade !== null || scan.popHigher !== null);
}

export function hasRegistryPopulationStats(scan: ScannerResult) {
  return scan.popAtGrade !== null || scan.popHigher !== null;
}

export function getRegistryVerificationLabel(lookupSource: LookupSource | null | undefined) {
  if (lookupSource === 'psa_api') {
    return 'PSA';
  }

  if (lookupSource === 'beckett_scrape') {
    return 'Beckett';
  }

  if (lookupSource === 'sgc_scrape') {
    return 'SGC';
  }

  if (lookupSource === 'cardgrade_io') {
    return 'CardGrade';
  }

  return null;
}

export function getVerificationHeadline(scan: ScannerResult) {
  const registry =
    getRegistryVerificationLabel(scan.lookupSource ?? undefined) ??
    (scan.certLookupSuccess ? getGraderLabel(scan.gradingCompany) : null);
  if (registry) {
    return `Verified on ${registry}`;
  }

  return `${getGraderLabel(scan.gradingCompany)} verified`;
}

export function getVerificationDetail(scan: ScannerResult) {
  const registry = getRegistryVerificationLabel(scan.lookupSource ?? undefined);
  if (registry) {
    return `Cert ${scan.certNumber ?? ''} matches the official ${registry} grading registry.`;
  }

  return 'This cert number matches an official grading registry.';
}

export function getCertRegistryLabel(gradingCompany: string | null | undefined) {
  const company = getGraderLabel(gradingCompany);
  if (company === 'PSA') {
    return 'PSA cert';
  }

  if (company === 'BGS') {
    return 'BGS cert';
  }

  if (company === 'SGC') {
    return 'SGC cert';
  }

  return 'Cert number';
}

export function getCertLinkLabel(gradingCompany: string | null | undefined) {
  const company = getGraderLabel(gradingCompany);
  if (company === 'Cert') {
    return 'View cert';
  }

  return `View on ${company}`;
}
