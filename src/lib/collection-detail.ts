import type { GraderSessionPrefill } from '@/lib/collection';

/** Disambiguates collection_cards.import_item_id vs import_items.collection_card_id */
export const COLLECTION_CARD_DETAIL_SELECT = `
  id, card_id, front_image_url, back_image_url,
  override_player, override_year, override_set_name, override_parallel, override_card_number,
  sport, condition_type, grade, grade_description, qualifier_code, grading_company, cert_number,
  autograph_grade, sub_grades, notes,
  purchase_price, purchase_date, purchase_source, purchase_url,
  current_value, value_updated_at, value_source,
  status, scan_id, grade_session_id, import_item_id, created_at, updated_at,
  cards ( id, player, year, set_name, card_number, parallel, sport, is_rookie, is_autograph ),
  graded_scans ( id, created_at, cert_number, grading_company ),
  raw_grade_sessions ( id, created_at, predicted_grade, confidence ),
  import_items!import_item_id ( id, created_at, raw_source )
`;

function normalizeJoin<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

type CardRow = {
  id: string;
  player: string;
  year: number | null;
  set_name: string | null;
  card_number: string | null;
  parallel: string | null;
  sport: string | null;
  is_rookie: boolean;
  is_autograph: boolean;
};

export function mapCollectionDetailRow(row: Record<string, unknown>): CollectionCardDetail {
  const card = normalizeJoin(row.cards as CardRow | CardRow[] | null);
  const scan = normalizeJoin(
    row.graded_scans as
      | { id: string; created_at: string; cert_number: string | null; grading_company: string | null }
      | { id: string; created_at: string; cert_number: string | null; grading_company: string | null }[]
      | null
  );
  const gradeSession = normalizeJoin(
    row.raw_grade_sessions as
      | { id: string; created_at: string; predicted_grade: number | null; confidence: string | null }
      | { id: string; created_at: string; predicted_grade: number | null; confidence: string | null }[]
      | null
  );
  const importItem = normalizeJoin(
    row.import_items as
      | { id: string; created_at: string; raw_source: string | null }
      | { id: string; created_at: string; raw_source: string | null }[]
      | null
  );

  const subGradesRaw = row.sub_grades as Record<string, unknown> | null;

  return {
    id: row.id as string,
    cardId: (row.card_id as string | null) ?? null,
    frontImageUrl: (row.front_image_url as string | null) ?? null,
    backImageUrl: (row.back_image_url as string | null) ?? null,
    player: (row.override_player as string | null) ?? card?.player ?? null,
    year: (row.override_year as number | null) ?? card?.year ?? null,
    setName: (row.override_set_name as string | null) ?? card?.set_name ?? null,
    parallel: (row.override_parallel as string | null) ?? card?.parallel ?? null,
    cardNumber: (row.override_card_number as string | null) ?? card?.card_number ?? null,
    sport: (row.sport as string | null) ?? card?.sport ?? null,
    conditionType: row.condition_type as string,
    grade: row.grade != null ? Number(row.grade) : null,
    gradeDescription: (row.grade_description as string | null) ?? null,
    qualifierCode: (row.qualifier_code as string | null) ?? null,
    gradingCompany: (row.grading_company as string | null) ?? null,
    certNumber: (row.cert_number as string | null) ?? null,
    autographGrade: row.autograph_grade != null ? Number(row.autograph_grade) : null,
    subGrades: subGradesRaw
      ? {
          centering: subGradesRaw.centering != null ? Number(subGradesRaw.centering) : undefined,
          corners: subGradesRaw.corners != null ? Number(subGradesRaw.corners) : undefined,
          edges: subGradesRaw.edges != null ? Number(subGradesRaw.edges) : undefined,
          surface: subGradesRaw.surface != null ? Number(subGradesRaw.surface) : undefined,
        }
      : null,
    notes: (row.notes as string | null) ?? null,
    purchasePrice: row.purchase_price != null ? Number(row.purchase_price) : null,
    purchaseDate: (row.purchase_date as string | null) ?? null,
    purchaseSource: (row.purchase_source as string | null) ?? null,
    purchaseUrl: (row.purchase_url as string | null) ?? null,
    currentValue: row.current_value != null ? Number(row.current_value) : null,
    valueUpdatedAt: (row.value_updated_at as string | null) ?? null,
    valueSource: (row.value_source as string | null) ?? null,
    status: row.status as string,
    scanId: (row.scan_id as string | null) ?? null,
    gradeSessionId: (row.grade_session_id as string | null) ?? null,
    importItemId: (row.import_item_id as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    catalog: card
      ? {
          id: card.id,
          player: card.player,
          year: card.year,
          setName: card.set_name,
          cardNumber: card.card_number,
          parallel: card.parallel,
          sport: card.sport,
          isRookie: card.is_rookie,
          isAutograph: card.is_autograph,
        }
      : null,
    scanSession: scan
      ? {
          id: scan.id,
          createdAt: scan.created_at,
          certNumber: scan.cert_number,
          gradingCompany: scan.grading_company,
        }
      : null,
    gradeSession: gradeSession
      ? {
          id: gradeSession.id,
          createdAt: gradeSession.created_at,
          predictedGrade:
            gradeSession.predicted_grade != null ? Number(gradeSession.predicted_grade) : null,
          confidence: gradeSession.confidence,
        }
      : null,
    importItem: importItem
      ? {
          id: importItem.id,
          createdAt: importItem.created_at,
          rawSource: importItem.raw_source,
        }
      : null,
  };
}

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
