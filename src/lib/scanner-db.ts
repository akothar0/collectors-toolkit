import type { LookupSource, ScannerResult } from '@/lib/scanner';
import { createServiceClient } from '@/lib/supabase';

type GradedScanRow = {
  id: string;
  image_url: string | null;
  ocr_cert_number: string | null;
  ocr_grading_company: string | null;
  ocr_confidence: string | null;
  cert_number: string | null;
  grading_company: string | null;
  card_id: string | null;
  official_grade: number | null;
  grade_description: string | null;
  qualifier_code: string | null;
  autograph_grade: number | null;
  pop_at_grade: number | null;
  pop_with_qualifier: number | null;
  pop_higher: number | null;
  is_dual_cert: boolean | null;
  item_status: string | null;
  lookup_source: string | null;
  raw_cert_response: unknown;
  cards?: {
    player: string | null;
    year: number | null;
    set_name: string | null;
    card_number: string | null;
    parallel: string | null;
    manufacturer: string | null;
    sport: string | null;
  } | null;
};

const SUCCESS_LOOKUP_SOURCES: LookupSource[] = [
  'psa_api',
  'beckett_scrape',
  'sgc_scrape',
  'cardgrade_io',
];

export function gradedScanRowToScannerResult(
  row: GradedScanRow,
  options?: { collectionCardId?: string | null }
): ScannerResult {
  const lookupSource = row.lookup_source as LookupSource | null;
  const certLookupSuccess = Boolean(lookupSource && SUCCESS_LOOKUP_SOURCES.includes(lookupSource));
  const raw =
    row.raw_cert_response && typeof row.raw_cert_response === 'object'
      ? (row.raw_cert_response as Record<string, unknown>)
      : {};
  const lookup =
    raw.lookup && typeof raw.lookup === 'object' ? (raw.lookup as Record<string, unknown>) : null;
  const subGrades =
    lookup?.subGrades && typeof lookup.subGrades === 'object'
      ? (lookup.subGrades as ScannerResult['subGrades'])
      : null;

  const card = row.cards;

  return {
    scanId: row.id,
    imageUrl: row.image_url ?? '',
    ocrCertNumber: row.ocr_cert_number,
    ocrGradingCompany:
      row.ocr_grading_company === 'PSA' ||
      row.ocr_grading_company === 'BGS' ||
      row.ocr_grading_company === 'SGC' ||
      row.ocr_grading_company === 'CGC'
        ? row.ocr_grading_company
        : row.ocr_grading_company
          ? 'UNKNOWN'
          : null,
    ocrConfidence:
      row.ocr_confidence === 'high' || row.ocr_confidence === 'medium' || row.ocr_confidence === 'low'
        ? row.ocr_confidence
        : 'low',
    certLookupSuccess,
    certNumber: row.cert_number,
    gradingCompany: row.grading_company,
    lookupSource,
    itemStatus: row.item_status,
    cardId: row.card_id,
    cardPlayer: card?.player ?? (typeof lookup?.player === 'string' ? lookup.player : null),
    cardYear: card?.year ?? (typeof lookup?.year === 'number' ? lookup.year : null),
    cardManufacturer: card?.manufacturer ?? null,
    cardSport: card?.sport ?? null,
    cardSet: card?.set_name ?? (typeof lookup?.setName === 'string' ? lookup.setName : null),
    cardParallel:
      card?.parallel ??
      (typeof lookup?.parallel === 'string' ? lookup.parallel : null),
    cardNumber: card?.card_number ?? (typeof lookup?.cardNumber === 'string' ? lookup.cardNumber : null),
    officialGrade: row.official_grade,
    gradeDescription: row.grade_description,
    qualifierCode: row.qualifier_code,
    autographGrade: row.autograph_grade,
    subGrades,
    isDualCert: row.is_dual_cert ?? false,
    popAtGrade: row.pop_at_grade,
    popWithQualifier: row.pop_with_qualifier,
    popHigher: row.pop_higher,
    savedToCollection: Boolean(options?.collectionCardId),
    collectionCardId: options?.collectionCardId ?? null,
  };
}

export async function getGradedScanForUser(userId: string, scanId: string) {
  const supabase = createServiceClient();

  const { data: row, error } = await supabase
    .from('graded_scans')
    .select(
      `
      id,
      image_url,
      ocr_cert_number,
      ocr_grading_company,
      ocr_confidence,
      cert_number,
      grading_company,
      card_id,
      official_grade,
      grade_description,
      qualifier_code,
      autograph_grade,
      pop_at_grade,
      pop_with_qualifier,
      pop_higher,
      is_dual_cert,
      item_status,
      lookup_source,
      raw_cert_response,
      cards (
        player,
        year,
        set_name,
        card_number,
        parallel,
        manufacturer,
        sport
      )
    `
    )
    .eq('id', scanId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !row) {
    return null;
  }

  const { data: collectionRow } = await supabase
    .from('collection_cards')
    .select('id')
    .eq('scan_id', scanId)
    .maybeSingle();

  const record = row as Record<string, unknown>;
  const cardsValue = record.cards;
  const normalizedRow: GradedScanRow = {
    ...(record as unknown as GradedScanRow),
    cards: Array.isArray(cardsValue)
      ? ((cardsValue[0] as GradedScanRow['cards']) ?? null)
      : ((cardsValue as GradedScanRow['cards']) ?? null),
  };

  return gradedScanRowToScannerResult(normalizedRow, {
    collectionCardId: (collectionRow?.id as string | undefined) ?? null,
  });
}

export async function listGradedScansForUser(userId: string) {
  const supabase = createServiceClient();

  const { data: rows, error } = await supabase
    .from('graded_scans')
    .select(
      `
      id,
      image_url,
      created_at,
      cert_number,
      grading_company,
      official_grade,
      lookup_source,
      raw_cert_response,
      cards (
        player,
        year,
        set_name
      )
    `
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error || !rows) {
    return [];
  }

  const scanIds = rows.map((row) => row.id as string);
  const { data: collectionRows } = await supabase
    .from('collection_cards')
    .select('id, scan_id')
    .in('scan_id', scanIds.length > 0 ? scanIds : ['00000000-0000-0000-0000-000000000000']);

  const savedByScan = new Map(
    (collectionRows ?? []).map((row) => [row.scan_id as string, row.id as string])
  );

  return rows.map((row) => {
    const cardRecord = row.cards;
    const card = Array.isArray(cardRecord)
      ? (cardRecord[0] as { player: string | null; year: number | null; set_name: string | null } | undefined) ??
        null
      : (cardRecord as { player: string | null; year: number | null; set_name: string | null } | null);
    const raw =
      row.raw_cert_response && typeof row.raw_cert_response === 'object'
        ? (row.raw_cert_response as Record<string, unknown>)
        : {};
    const lookup =
      raw.lookup && typeof raw.lookup === 'object' ? (raw.lookup as Record<string, unknown>) : null;

    const player =
      card?.player ?? (typeof lookup?.player === 'string' ? lookup.player : null);
    const year = card?.year ?? (typeof lookup?.year === 'number' ? lookup.year : null);
    const setName =
      card?.set_name ?? (typeof lookup?.setName === 'string' ? lookup.setName : null);

    return {
      scanId: row.id as string,
      imageUrl: (row.image_url as string | null) ?? '',
      createdAt: row.created_at as string,
      certNumber: row.cert_number as string | null,
      gradingCompany: row.grading_company as string | null,
      officialGrade: row.official_grade as number | null,
      lookupSource: row.lookup_source as string | null,
      player,
      year,
      setName,
      collectionCardId: savedByScan.get(row.id as string) ?? null,
      savedToCollection: savedByScan.has(row.id as string),
    };
  });
}
