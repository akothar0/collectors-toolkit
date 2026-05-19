import { resolveGradeId } from '@/lib/cardsight/grades';
import {
  resolveCollectionCardToCardSight,
  type CollectionCardResolveInput,
} from '@/lib/cardsight/resolve-card';
import { assessPricingEligibility } from '@/lib/pricing/eligibility';
import { fetchOrLoadMarketCache } from '@/lib/pricing/market-cache';
import { normalizeSetNameForSearch } from '@/lib/pricing/set-normalize';
import {
  sliceMarketCache,
  strictValuationFromSlice,
  toPersistableDisplayResult,
} from '@/lib/pricing/slice-market-cache';
import { appendCollectionCardMarketObservation } from '@/lib/pricing/market-observations';
import {
  applySnapshotToCollectionCard,
  loadLatestSnapshotForCollectionCard,
  persistNormalizedPrice,
} from '@/lib/pricing/store';
import type { PriceReferenceFingerprintInput } from '@/lib/pricing/types';
import { createServiceClient } from '@/lib/supabase';

export type CollectionCardPricingRow = {
  id: string;
  card_id: string | null;
  override_player: string | null;
  override_year: number | null;
  override_set_name: string | null;
  override_parallel: string | null;
  override_card_number: string | null;
  sport: string | null;
  condition_type: string;
  grade: number | null;
  grading_company: string | null;
  latest_price_snapshot_id: string | null;
  cards?: {
    id: string;
    player: string;
    year: number | null;
    set_name: string | null;
    card_number: string | null;
    parallel: string | null;
    manufacturer: string | null;
    sport: string | null;
    source: string | null;
    source_id: string | null;
  } | null;
};

const COLLECTION_PRICING_SELECT = `
  id, card_id,
  override_player, override_year, override_set_name, override_parallel, override_card_number,
  sport, condition_type, grade, grading_company, latest_price_snapshot_id,
  cards (
    id, player, year, set_name, card_number, parallel, manufacturer, sport, source, source_id
  )
`;

function normalizeJoin<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

export function mapCollectionPricingRow(row: Record<string, unknown>): CollectionCardPricingRow {
  return {
    ...(row as CollectionCardPricingRow),
    cards: normalizeJoin(row.cards as CollectionCardPricingRow['cards']),
  };
}

export async function loadCollectionCardForPricing(collectionCardId: string, userId: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('collection_cards')
    .select(COLLECTION_PRICING_SELECT)
    .eq('id', collectionCardId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapCollectionPricingRow(data as Record<string, unknown>) : null;
}

export function eligibilityInputFromRow(row: CollectionCardPricingRow) {
  const catalog = row.cards;
  return {
    sport: row.sport ?? catalog?.sport ?? null,
    player: row.override_player ?? catalog?.player ?? null,
    year: row.override_year ?? catalog?.year ?? null,
    setName: row.override_set_name ?? catalog?.set_name ?? null,
    cardNumber: row.override_card_number ?? catalog?.card_number ?? null,
    conditionType: row.condition_type,
    gradingCompany: row.grading_company,
    grade: row.grade != null ? Number(row.grade) : null,
  };
}

export function buildResolveInput(
  row: CollectionCardPricingRow,
  segment: CollectionCardResolveInput['segment']
): CollectionCardResolveInput {
  const catalog = row.cards;
  return {
    collectionCardId: row.id,
    cardId: row.card_id,
    player: row.override_player ?? catalog?.player ?? '',
    year: row.override_year ?? catalog?.year ?? null,
    setName: normalizeSetNameForSearch(row.override_set_name ?? catalog?.set_name ?? null),
    cardNumber: row.override_card_number ?? catalog?.card_number ?? null,
    parallel: row.override_parallel ?? catalog?.parallel ?? null,
    manufacturer: catalog?.manufacturer ?? null,
    conditionType: row.condition_type,
    gradingCompany: row.grading_company,
    grade: row.grade != null ? Number(row.grade) : null,
    segment,
  };
}

function buildFingerprintInput(
  row: CollectionCardPricingRow,
  cardsightCardId: string,
  parallelId: string | null
): PriceReferenceFingerprintInput {
  const catalog = row.cards;
  const isGraded = row.condition_type === 'graded';

  return {
    cardsightCardId,
    parallelId,
    conditionBucket: isGraded ? 'graded' : 'raw',
    gradingCompany: isGraded ? row.grading_company : null,
    grade: isGraded && row.grade != null ? Number(row.grade) : null,
    player: row.override_player ?? catalog?.player ?? null,
    year: row.override_year ?? catalog?.year ?? null,
    setName: row.override_set_name ?? catalog?.set_name ?? null,
    parallel: row.override_parallel ?? catalog?.parallel ?? null,
    cardNumber: row.override_card_number ?? catalog?.card_number ?? null,
  };
}

export type RefreshCollectionCardPricingResult =
  | { status: 'collection_not_found' }
  | {
      status: 'unsupported_sport' | 'incomplete_identity';
      message: string;
      missingFields?: string[];
    }
  | { status: 'catalog_not_found'; message: string }
  | { status: 'ambiguous'; candidates: unknown[] }
  | { status: 'needs_review'; reason: string }
  | {
      status: 'refreshed';
      snapshotId: string;
      result: unknown;
      resolved: unknown;
      marketCacheFromApi: boolean;
    };

export async function refreshCollectionCardPricing(
  collectionCardId: string,
  userId: string,
  options?: { force?: boolean }
): Promise<RefreshCollectionCardPricingResult> {
  const row = await loadCollectionCardForPricing(collectionCardId, userId);
  if (!row) {
    return { status: 'collection_not_found' };
  }

  const eligibility = assessPricingEligibility(eligibilityInputFromRow(row));
  if (!eligibility.ready) {
    return {
      status: eligibility.status,
      message: eligibility.message,
      missingFields: eligibility.missingFields,
    };
  }

  const resolveInput = buildResolveInput(row, eligibility.segment);
  const resolved = await resolveCollectionCardToCardSight(resolveInput);

  if (resolved.status === 'not_found') {
    return {
      status: 'catalog_not_found',
      message:
        'We could not find this card in CardSight. Check set name and card number, then refresh.',
    };
  }

  if (resolved.status === 'ambiguous') {
    return { status: 'ambiguous', candidates: resolved.candidates };
  }

  if (resolved.status === 'needs_review') {
    return { status: 'needs_review', reason: resolved.reason };
  }

  const cardsightCardId = resolved.cardsightCardId;
  const parallelId = resolved.parallelId;
  const isGraded = row.condition_type === 'graded';

  let gradeId: string | null = null;
  if (isGraded) {
    try {
      gradeId = await resolveGradeId(
        row.grading_company,
        row.grade != null ? Number(row.grade) : null
      );
    } catch {
      gradeId = null;
    }
  }

  const { cache, fromApi } = await fetchOrLoadMarketCache(cardsightCardId, {
    force: options?.force,
  });

  const sliced = sliceMarketCache({
    pricingResponse: cache.pricing_response,
    period: '3m',
    gradeId,
    gradingCompany: row.grading_company,
    grade: row.grade != null ? Number(row.grade) : null,
    parallelId,
    isGraded,
  });

  const displayResult = toPersistableDisplayResult(sliced, cache.pricing_response);
  const valuation = strictValuationFromSlice(sliced);

  const fingerprintInput = buildFingerprintInput(row, cardsightCardId, parallelId);
  const stored = await persistNormalizedPrice(
    fingerprintInput,
    displayResult,
    {
      scopeNote: sliced.scopeNote,
      activeTier: sliced.display.tier,
      strictSampleSize: valuation.sampleSize,
      marketCacheQueriedAt: cache.queried_at,
    },
    valuation
  );

  await applySnapshotToCollectionCard(collectionCardId, stored, valuation);
  await appendCollectionCardMarketObservation(collectionCardId, sliced);

  return {
    status: 'refreshed',
    snapshotId: stored.snapshotId,
    result: displayResult,
    resolved,
    marketCacheFromApi: fromApi,
  };
}

export async function loadCachedCollectionCardPricing(collectionCardId: string) {
  return loadLatestSnapshotForCollectionCard(collectionCardId);
}
