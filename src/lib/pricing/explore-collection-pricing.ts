import { resolveGradeId } from '@/lib/cardsight/grades';
import { resolveCollectionCardToCardSight } from '@/lib/cardsight/resolve-card';
import { assessPricingEligibility } from '@/lib/pricing/eligibility';
import { extractCacheFilterOptions } from '@/lib/pricing/cache-dimensions';
import { loadMarketCache } from '@/lib/pricing/market-cache';
import {
  buildResolveInput,
  eligibilityInputFromRow,
  loadCollectionCardForPricing,
  type CollectionCardPricingRow,
} from '@/lib/pricing/refresh-collection-card';
import type { PricingPanelData } from '@/lib/pricing/presenter';
import { sliceMarketCache, strictValuationFromSlice } from '@/lib/pricing/slice-market-cache';
import { formatPrice } from '@/lib/collection-presenter';
import { formatPricingDate } from '@/lib/pricing/presenter';

export type ExploreFilters = {
  gradingCompany?: string | null;
  grade?: number | null;
  parallelId?: string | null;
};

function mapExplorePayload(input: {
  sliced: ReturnType<typeof sliceMarketCache>;
  cacheQueriedAt: string;
  filterOptions: ReturnType<typeof extractCacheFilterOptions>;
  appliedFilters: ExploreFilters;
  slabDefaults: ExploreFilters;
}): PricingPanelData & {
  minSalePrice: number | null;
  maxSalePrice: number | null;
  activeTier: string;
  filterOptions: ReturnType<typeof extractCacheFilterOptions>;
  appliedFilters: ExploreFilters;
  slabDefaults: ExploreFilters;
  strictEligible: boolean;
} {
  const display = input.sliced.display.result;
  const valuation = strictValuationFromSlice(input.sliced);

  const comparables = input.sliced.comparables.map((row) => {
    const company = row.gradingCompany ?? null;
    const grade = row.grade != null ? Number(row.grade) : null;
    const gradeLabel =
      company && grade != null && Number.isFinite(grade)
        ? `${company} ${grade}`
        : company
          ? company
          : 'Raw';

    return {
      title: row.title,
      salePriceLabel: formatPrice(row.salePrice) ?? '—',
      saleDateLabel: formatPricingDate(row.saleDate) ?? null,
      itemUrl: row.itemUrl,
      gradeLabel,
    };
  });

  const hasDisplayMedian = display.sampleSize > 0 && display.medianSalePrice != null;

  return {
    configured: true,
    status: 'cached',
    sourceLabel: 'CardSight sold comps',
    medianLabel: hasDisplayMedian ? formatPrice(display.medianSalePrice) : null,
    sampleSize: display.sampleSize,
    confidenceLabel: display.confidenceLabel,
    valuationEligible: valuation.valuationEligible,
    lastUpdated: input.cacheQueriedAt,
    comparables,
    canRefresh: true,
    compsScopeNote: input.sliced.scopeNote,
    minSalePrice: display.minSalePrice,
    maxSalePrice: display.maxSalePrice,
    activeTier: input.sliced.display.tier,
    filterOptions: input.filterOptions,
    appliedFilters: input.appliedFilters,
    slabDefaults: input.slabDefaults,
    strictEligible: valuation.valuationEligible,
  };
}

function slabDefaultsFromRow(row: CollectionCardPricingRow): ExploreFilters {
  return {
    gradingCompany: row.grading_company,
    grade: row.grade != null ? Number(row.grade) : null,
    parallelId: null,
  };
}

export async function exploreCollectionCardPricing(
  collectionCardId: string,
  userId: string,
  filters: ExploreFilters
): Promise<
  | { status: 'collection_not_found' }
  | { status: 'unsupported_sport' | 'incomplete_identity'; message: string }
  | { status: 'no_cache'; message: string }
  | { status: 'catalog_not_found' | 'ambiguous' | 'needs_review'; message: string }
  | { status: 'explore'; payload: PricingPanelData & Record<string, unknown> }
> {
  const row = await loadCollectionCardForPricing(collectionCardId, userId);
  if (!row) {
    return { status: 'collection_not_found' };
  }

  const eligibility = assessPricingEligibility(eligibilityInputFromRow(row));
  if (!eligibility.ready) {
    return { status: eligibility.status, message: eligibility.message };
  }

  const resolveInput = buildResolveInput(row, eligibility.segment);
  const resolved = await resolveCollectionCardToCardSight(resolveInput);

  if (resolved.status === 'not_found') {
    return {
      status: 'catalog_not_found',
      message: 'Catalog link required. Refresh comps first.',
    };
  }
  if (resolved.status === 'ambiguous') {
    return { status: 'ambiguous', message: 'Multiple catalog matches. Refine card details.' };
  }
  if (resolved.status === 'needs_review') {
    return { status: 'needs_review', message: resolved.reason };
  }

  const cardsightCardId = resolved.cardsightCardId;
  const cache = await loadMarketCache(cardsightCardId, '3m');
  if (!cache) {
    return {
      status: 'no_cache',
      message: 'Refresh comps once to load market data, then explore filters.',
    };
  }

  const isGraded = row.condition_type === 'graded';
  const appliedCompany = filters.gradingCompany ?? row.grading_company;
  const appliedGrade = filters.grade ?? (row.grade != null ? Number(row.grade) : null);
  const parallelId = filters.parallelId ?? resolved.parallelId;

  let gradeId: string | null = null;
  if (isGraded && appliedCompany && appliedGrade != null) {
    try {
      gradeId = await resolveGradeId(appliedCompany, appliedGrade);
    } catch {
      gradeId = null;
    }
  }

  const sliced = sliceMarketCache({
    pricingResponse: cache.pricing_response,
    period: '3m',
    gradeId,
    gradingCompany: appliedCompany,
    grade: appliedGrade,
    parallelId,
    isGraded,
    sliceMode: 'manual',
  });

  const filterOptions = extractCacheFilterOptions(cache.pricing_response);
  const slabDefaults = slabDefaultsFromRow(row);

  return {
    status: 'explore',
    payload: mapExplorePayload({
      sliced,
      cacheQueriedAt: cache.queried_at,
      filterOptions,
      appliedFilters: {
        gradingCompany: appliedCompany,
        grade: appliedGrade,
        parallelId,
      },
      slabDefaults,
    }),
  };
}

export function isExploreRequest(url: URL) {
  return (
    url.searchParams.has('gradingCompany') ||
    url.searchParams.has('grade') ||
    url.searchParams.has('parallelId')
  );
}

export function parseExploreFilters(url: URL): ExploreFilters {
  const gradingCompany = url.searchParams.get('gradingCompany');
  const gradeRaw = url.searchParams.get('grade');
  const parallelId = url.searchParams.get('parallelId');

  return {
    gradingCompany: gradingCompany?.trim() || null,
    grade:
      gradeRaw != null && gradeRaw !== '' && Number.isFinite(Number.parseFloat(gradeRaw))
        ? Number.parseFloat(gradeRaw)
        : null,
    parallelId: parallelId?.trim() || null,
  };
}
