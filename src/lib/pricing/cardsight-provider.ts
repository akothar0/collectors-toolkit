import { fetchOrLoadMarketCache } from '@/lib/pricing/market-cache';
import { sliceMarketCache, toPersistableDisplayResult } from '@/lib/pricing/slice-market-cache';
import type { NormalizedPriceResult, PriceQuery } from '@/lib/pricing/types';

/**
 * @deprecated Prefer fetchOrLoadMarketCache + sliceMarketCache. Kept for bulk/cron paths.
 */
export const cardsightPriceProvider = {
  name: 'cardsight' as const,

  async fetchComparables(input: PriceQuery): Promise<NormalizedPriceResult> {
    const { cache } = await fetchOrLoadMarketCache(input.cardsightCardId, {
      period: input.period ?? '3m',
      limit: input.limit ?? 50,
    });

    const sliced = sliceMarketCache({
      pricingResponse: cache.pricing_response,
      period: input.period ?? '3m',
      gradeId: input.gradeId ?? null,
      parallelId: input.parallelId ?? null,
      isGraded: Boolean(input.gradeId),
    });

    return toPersistableDisplayResult(sliced, cache.pricing_response);
  },

  async fetchComparablesBulk(
    inputs: PriceQuery[]
  ): Promise<Map<string, NormalizedPriceResult | null>> {
    const results = new Map<string, NormalizedPriceResult | null>();

    for (const input of inputs) {
      try {
        const result = await this.fetchComparables(input);
        results.set(input.cardsightCardId, result);
      } catch {
        results.set(input.cardsightCardId, null);
      }
    }

    return results;
  },
};
