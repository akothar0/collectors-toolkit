import type { GraderSessionPrefill } from '@/lib/collection';

export type CollectionSubGrades = {
  centering?: number;
  corners?: number;
  edges?: number;
  surface?: number;
};

export type CollectionCardDetail = {
  id: string;
  cardId: string | null;
  frontImageUrl: string | null;
  backImageUrl: string | null;
  player: string | null;
  year: number | null;
  setName: string | null;
  parallel: string | null;
  cardNumber: string | null;
  sport: string | null;
  conditionType: string;
  grade: number | null;
  gradeDescription: string | null;
  qualifierCode: string | null;
  gradingCompany: string | null;
  certNumber: string | null;
  autographGrade: number | null;
  subGrades: CollectionSubGrades | null;
  notes: string | null;
  purchasePrice: number | null;
  purchaseDate: string | null;
  purchaseSource: string | null;
  purchaseUrl: string | null;
  currentValue: number | null;
  valueUpdatedAt: string | null;
  valueSource: string | null;
  status: string;
  scanId: string | null;
  gradeSessionId: string | null;
  importItemId: string | null;
  createdAt: string;
  updatedAt: string;
  catalog: {
    id: string;
    player: string;
    year: number | null;
    setName: string | null;
    cardNumber: string | null;
    parallel: string | null;
    sport: string | null;
    isRookie: boolean;
    isAutograph: boolean;
  } | null;
  scanSession: {
    id: string;
    createdAt: string;
    certNumber: string | null;
    gradingCompany: string | null;
  } | null;
  gradeSession: {
    id: string;
    createdAt: string;
    predictedGrade: number | null;
    confidence: string | null;
  } | null;
  importItem: {
    id: string;
    createdAt: string;
    rawSource: string | null;
  } | null;
};

export type CollectionFormValues = {
  cardId: string | null;
  player: string;
  year: string;
  sport: string;
  setName: string;
  cardNumber: string;
  parallel: string;
  isRookie: boolean;
  isAutograph: boolean;
  conditionType: 'raw' | 'graded';
  gradingCompany: string;
  gradingCompanyOther: string;
  grade: number | null;
  certNumber: string;
  purchasePrice: string;
  purchaseDate: string;
  purchaseSource: string;
  purchaseUrl: string;
  notes: string;
  gradeSessionId: string | null;
  subGrades: GraderSessionPrefill['subGrades'];
  frontImageUrl: string | null;
};

export function detailToFormValues(detail: CollectionCardDetail): CollectionFormValues {
  const company = detail.gradingCompany ?? 'PSA';
  const isKnownCompany = ['PSA', 'BGS', 'SGC', 'CGC'].includes(company);

  return {
    cardId: detail.cardId,
    player: detail.player ?? '',
    year: detail.year != null ? String(detail.year) : '',
    sport: detail.sport ?? 'Baseball',
    setName: detail.setName ?? '',
    cardNumber: detail.cardNumber ?? '',
    parallel: detail.parallel ?? '',
    isRookie: detail.catalog?.isRookie ?? false,
    isAutograph: detail.catalog?.isAutograph ?? false,
    conditionType: detail.conditionType === 'graded' ? 'graded' : 'raw',
    gradingCompany: isKnownCompany ? company : 'Other',
    gradingCompanyOther: isKnownCompany ? '' : company,
    grade: detail.grade,
    certNumber: detail.certNumber ?? '',
    purchasePrice: detail.purchasePrice != null ? String(detail.purchasePrice) : '',
    purchaseDate: detail.purchaseDate ?? '',
    purchaseSource: detail.purchaseSource ?? '',
    purchaseUrl: detail.purchaseUrl ?? '',
    notes: detail.notes ?? '',
    gradeSessionId: detail.gradeSessionId,
    subGrades: detail.subGrades,
    frontImageUrl: detail.frontImageUrl,
  };
}

export function formValuesToPayload(values: CollectionFormValues) {
  const resolvedCompany =
    values.conditionType === 'graded'
      ? values.gradingCompany === 'Other'
        ? values.gradingCompanyOther.trim()
        : values.gradingCompany
      : null;

  return {
    cardId: values.cardId,
    player: values.player.trim(),
    year: values.year.trim() ? Number.parseInt(values.year, 10) : null,
    sport: values.sport,
    setName: values.setName.trim() || null,
    cardNumber: values.cardNumber.trim() || null,
    parallel: values.parallel.trim() || null,
    isRookie: values.isRookie,
    isAutograph: values.isAutograph,
    conditionType: values.conditionType,
    gradingCompany: resolvedCompany,
    grade: values.conditionType === 'graded' ? values.grade : null,
    certNumber: values.certNumber.trim() || null,
    subGrades: values.conditionType === 'raw' ? values.subGrades : null,
    gradeSessionId: values.gradeSessionId,
    frontImageUrl: values.frontImageUrl,
    purchasePrice: values.purchasePrice.trim() ? Number.parseFloat(values.purchasePrice) : null,
    purchaseDate: values.purchaseDate || null,
    purchaseSource: values.purchaseSource || null,
    purchaseUrl: values.purchaseUrl.trim() || null,
    notes: values.notes.trim() || null,
  };
}
