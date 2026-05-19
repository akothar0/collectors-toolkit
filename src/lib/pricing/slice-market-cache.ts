import { normalizePricingResponse } from '@/lib/pricing/normalize';
import type { NormalizedComparable, NormalizedPriceResult } from '@/lib/pricing/types';
import type { PricingResponse } from '@/lib/cardsight/types';

export type CompsTierId =
  | 'exact'
  | 'exact_grade_any_parallel'
  | 'same_grader_any_grade'
  | 'all_conditions';

export type SliceMarketCacheInput = {
  pricingResponse: PricingResponse;
  period?: string;
  gradeId?: string | null;
  gradingCompany?: string | null;
  grade?: number | null;
  parallelId?: string | null;
  isGraded?: boolean;
};

export type SliceTierResult = {
  tier: CompsTierId;
  result: NormalizedPriceResult;
};

export type SliceMarketCacheOutput = {
  display: SliceTierResult;
  strict: SliceTierResult | null;
  scopeNote: string;
  comparables: NormalizedComparable[];
};

const DISPLAY_COMP_LIMIT = 10;

function normalizeCompany(value: string | null | undefined) {
  return value?.trim().toUpperCase() ?? '';
}

function buildScopeNote(input: {
  tier: CompsTierId;
  gradingCompany?: string | null;
  grade?: number | null;
  isGraded?: boolean;
}) {
  const company = input.gradingCompany?.trim();
  const gradeLabel =
    input.grade != null && Number.isFinite(input.grade) ? ` ${input.grade}` : '';

  switch (input.tier) {
    case 'exact':
      if (input.isGraded && company) {
        return `Median and recent sales reflect ${company}${gradeLabel} listings for this card (last 90 days).`;
      }
      return 'Median and recent sales reflect recent sold listings for this card (last 90 days).';
    case 'exact_grade_any_parallel':
      if (input.isGraded && company) {
        return `No sales for your parallel in the last 90 days. Showing ${company}${gradeLabel} sales across parallels.`;
      }
      return 'Showing recent sales across parallels for this card (last 90 days).';
    case 'same_grader_any_grade':
      return company
        ? `No ${company}${gradeLabel} sales in the last 90 days. Showing other ${company} grades on this card.`
        : 'Showing graded sales on this card (last 90 days).';
    case 'all_conditions':
      return input.isGraded
        ? 'No close grade matches in the last 90 days. Showing all grades and raw sales for this card.'
        : 'Showing all recent sales for this card (last 90 days).';
    default:
      return 'Based on CardSight sold comps (last 90 days).';
  }
}

function sliceTier(
  pricingResponse: PricingResponse,
  tier: CompsTierId,
  input: SliceMarketCacheInput
): NormalizedPriceResult {
  const period = input.period ?? '3m';

  switch (tier) {
    case 'exact':
      return normalizePricingResponse(pricingResponse, {
        period,
        gradeId: input.isGraded ? input.gradeId : null,
        parallelId: input.parallelId,
      });
    case 'exact_grade_any_parallel':
      return normalizePricingResponse(pricingResponse, {
        period,
        gradeId: input.isGraded ? input.gradeId : null,
        parallelId: null,
      });
    case 'same_grader_any_grade':
      return normalizePricingResponse(pricingResponse, {
        period,
        gradeId: null,
        parallelId: null,
      });
    case 'all_conditions':
      return normalizePricingResponse(pricingResponse, {
        period,
        gradeId: null,
        parallelId: null,
      });
    default:
      return normalizePricingResponse(pricingResponse, { period });
  }
}

function filterByGradingCompany(
  result: NormalizedPriceResult,
  gradingCompany: string | null | undefined
): NormalizedPriceResult {
  const company = normalizeCompany(gradingCompany);
  if (!company) {
    return result;
  }

  const comparables = result.comparables.filter((row) => {
    if (!row.gradingCompany) return false;
    return normalizeCompany(row.gradingCompany) === company;
  });

  const prices = comparables.map((c) => c.salePrice);
  const sampleSize = prices.length;

  return {
    ...result,
    sampleSize,
    comparables,
    medianSalePrice: sampleSize > 0 ? median(prices) : null,
    avgSalePrice:
      sampleSize > 0 ? prices.reduce((sum, value) => sum + value, 0) / sampleSize : null,
    minSalePrice: sampleSize > 0 ? Math.min(...prices) : null,
    maxSalePrice: sampleSize > 0 ? Math.max(...prices) : null,
    latestSaleAt: comparables[0]?.saleDate ?? result.latestSaleAt,
    confidenceLabel:
      sampleSize >= 10 ? 'high' : sampleSize >= 3 ? 'medium' : sampleSize > 0 ? 'low' : 'none',
    confidenceScore:
      sampleSize >= 10 ? 0.9 : sampleSize >= 3 ? 0.7 : sampleSize > 0 ? 0.4 : 0,
    valuationEligible: sampleSize >= 3,
  };
}

function median(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function pickDisplayTier(
  pricingResponse: PricingResponse,
  input: SliceMarketCacheInput
): SliceTierResult {
  const order: CompsTierId[] = input.isGraded
    ? ['exact', 'exact_grade_any_parallel', 'same_grader_any_grade', 'all_conditions']
    : ['all_conditions'];

  for (const tier of order) {
    let result = sliceTier(pricingResponse, tier, input);
    if (tier === 'same_grader_any_grade') {
      result = filterByGradingCompany(result, input.gradingCompany);
    }
    if (result.sampleSize > 0) {
      return { tier, result };
    }
  }

  const fallback = sliceTier(pricingResponse, 'all_conditions', input);
  return { tier: 'all_conditions', result: fallback };
}

export function sliceMarketCache(input: SliceMarketCacheInput): SliceMarketCacheOutput {
  const display = pickDisplayTier(input.pricingResponse, input);

  let strict: SliceTierResult | null = null;
  if (input.isGraded) {
    const exact = sliceTier(input.pricingResponse, 'exact', input);
    strict = { tier: 'exact', result: exact };
  }

  const scopeNote = buildScopeNote({
    tier: display.tier,
    gradingCompany: input.gradingCompany,
    grade: input.grade,
    isGraded: input.isGraded,
  });

  return {
    display,
    strict,
    scopeNote,
    comparables: display.result.comparables.slice(0, DISPLAY_COMP_LIMIT),
  };
}

/** Map slice output to persistable NormalizedPriceResult (display + metadata). */
export function toPersistableDisplayResult(
  sliced: SliceMarketCacheOutput,
  pricingResponse: PricingResponse
): NormalizedPriceResult {
  const display = sliced.display.result;
  return {
    ...display,
    comparables: sliced.comparables,
    rawResponse: {
      activeTier: sliced.display.tier,
      scopeNote: sliced.scopeNote,
      strictSampleSize: sliced.strict?.result.sampleSize ?? 0,
    },
  };
}

/** Strict tier used only for portfolio current_value updates. */
export function strictValuationFromSlice(sliced: SliceMarketCacheOutput) {
  const strict = sliced.strict?.result;
  if (!strict) {
    return { valuationEligible: false, medianSalePrice: null as number | null, sampleSize: 0 };
  }
  return {
    valuationEligible: strict.valuationEligible,
    medianSalePrice: strict.medianSalePrice,
    sampleSize: strict.sampleSize,
  };
}
