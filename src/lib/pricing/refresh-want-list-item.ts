import { resolveGradeId } from '@/lib/cardsight/grades';
import { buildCardSightCatalogSearchQuery } from '@/lib/cardsight/catalog-search';
import { searchCatalogCards, searchCatalogParallels } from '@/lib/cardsight/client';
import {
  defaultCatalogMatchMinScore,
  pickBestCatalogMatches,
  type ResolveCardQuery,
} from '@/lib/cardsight/resolve-scoring';
import type { CatalogCard } from '@/lib/cardsight/types';
import { assessWantListPricingEligibility } from '@/lib/pricing/eligibility';
import { normalizeSetNameForSearch } from '@/lib/pricing/set-normalize';
import { fetchOrLoadMarketCache } from '@/lib/pricing/market-cache';
import {
  sliceMarketCache,
  strictValuationFromSlice,
  toPersistableDisplayResult,
} from '@/lib/pricing/slice-market-cache';
import {
  applySnapshotToWantListItem,
  persistNormalizedPrice,
} from '@/lib/pricing/store';
import type { PriceReferenceFingerprintInput } from '@/lib/pricing/types';
import { createServiceClient } from '@/lib/supabase';

export type WantListPricingRow = {
  id: string;
  user_id: string;
  card_id: string | null;
  description: string;
  player: string | null;
  year: number | null;
  set_name: string | null;
  parallel: string | null;
  target_grade_min: number | null;
  grading_company: string | null;
  latest_price_snapshot_id: string | null;
};

const WANT_LIST_PRICING_SELECT = `
  id, user_id, card_id, description, player, year, set_name, parallel,
  target_grade_min, grading_company, latest_price_snapshot_id
`;

export async function loadWantListItemForPricing(wantListId: string, userId: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('want_list')
    .select(WANT_LIST_PRICING_SELECT)
    .eq('id', wantListId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as WantListPricingRow | null) ?? null;
}

async function resolveParallelId(parallelName: string | null, catalogCard: CatalogCard) {
  if (!parallelName) return null;

  const embedded = (catalogCard.parallels ?? []).find((parallel) => {
    const name = parallel.name?.trim().toLowerCase();
    const target = parallelName.toLowerCase();
    return name === target || (name && (name.includes(target) || target.includes(name)));
  });

  if (embedded?.id) return embedded.id;

  const parallels = await searchCatalogParallels({
    name: parallelName,
    releaseId: catalogCard.release?.id,
    take: 10,
  });

  const match = parallels.find((parallel) => {
    const name = parallel.name?.trim().toLowerCase();
    const target = parallelName.toLowerCase();
    return name === target || (name && (name.includes(target) || target.includes(name)));
  });

  return match?.id ?? null;
}

async function resolveWantListCatalog(row: WantListPricingRow) {
  const player = row.player?.trim() || row.description.trim();
  if (!player) {
    return { status: 'needs_review' as const, reason: 'Add a player name to price this item.' };
  }

  const normalizedSetName = normalizeSetNameForSearch(row.set_name);
  const query: ResolveCardQuery = {
    player,
    year: row.year,
    setName: normalizedSetName,
    parallel: row.parallel,
  };

  const candidates = await searchCatalogCards(
    buildCardSightCatalogSearchQuery({
      player,
    })
  );

  const picked = pickBestCatalogMatches(candidates, query, {
    minScore: defaultCatalogMatchMinScore(query),
  });
  if (picked.status === 'not_found') {
    return { status: 'not_found' as const };
  }
  if (picked.status === 'ambiguous') {
    return { status: 'ambiguous' as const, candidates: picked.matches };
  }

  const parallelId = await resolveParallelId(row.parallel, picked.match);
  return {
    status: 'matched' as const,
    cardsightCardId: picked.match.id,
    parallelId,
  };
}

function buildWantListFingerprint(
  row: WantListPricingRow,
  cardsightCardId: string,
  parallelId: string | null
): PriceReferenceFingerprintInput {
  const hasGrade = row.target_grade_min != null && Number.isFinite(Number(row.target_grade_min));

  return {
    cardsightCardId,
    parallelId,
    conditionBucket: hasGrade ? 'graded' : 'raw',
    gradingCompany: hasGrade ? row.grading_company ?? 'PSA' : null,
    grade: hasGrade ? Number(row.target_grade_min) : null,
    player: row.player,
    year: row.year,
    setName: row.set_name,
    parallel: row.parallel,
  };
}

export type RefreshWantListItemPricingResult =
  | { status: 'not_found' }
  | {
      status: 'incomplete_identity';
      message: string;
      missingFields?: string[];
    }
  | { status: 'catalog_not_found'; message: string }
  | { status: 'ambiguous'; candidates: unknown[] }
  | { status: 'needs_review'; reason: string }
  | { status: 'refreshed'; snapshotId: string; result: unknown };

export async function refreshWantListItemPricing(
  wantListId: string,
  userId: string
): Promise<RefreshWantListItemPricingResult> {
  const row = await loadWantListItemForPricing(wantListId, userId);
  if (!row) {
    return { status: 'not_found' };
  }

  const eligibility = assessWantListPricingEligibility({
    player: row.player,
    description: row.description,
    year: row.year,
    setName: row.set_name,
  });

  if (!eligibility.ready) {
    return {
      status: 'incomplete_identity',
      message: eligibility.message,
      missingFields: eligibility.missingFields,
    };
  }

  const resolved = await resolveWantListCatalog(row);
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

  const gradeId =
    row.target_grade_min != null
      ? await resolveGradeId(row.grading_company ?? 'PSA', Number(row.target_grade_min))
      : null;

  const { cache } = await fetchOrLoadMarketCache(resolved.cardsightCardId, { force: true });
  const isGraded = row.target_grade_min != null;

  const sliced = sliceMarketCache({
    pricingResponse: cache.pricing_response,
    period: '3m',
    gradeId,
    gradingCompany: row.grading_company,
    grade: row.target_grade_min != null ? Number(row.target_grade_min) : null,
    parallelId: resolved.parallelId,
    isGraded,
  });

  const displayResult = toPersistableDisplayResult(sliced, cache.pricing_response);
  const valuation = strictValuationFromSlice(sliced);

  const stored = await persistNormalizedPrice(
    buildWantListFingerprint(row, resolved.cardsightCardId, resolved.parallelId),
    displayResult,
    {
      scopeNote: sliced.scopeNote,
      activeTier: sliced.display.tier,
      strictSampleSize: valuation.sampleSize,
      marketCacheQueriedAt: cache.queried_at,
    },
    valuation
  );
  await applySnapshotToWantListItem(wantListId, stored);

  return {
    status: 'refreshed',
    snapshotId: stored.snapshotId,
    result: displayResult,
  };
}
