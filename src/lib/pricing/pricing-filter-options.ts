import { extractCacheFilterOptions } from '@/lib/pricing/cache-dimensions';
import { loadMarketCache } from '@/lib/pricing/market-cache';
import {
  buildResolveInput,
  eligibilityInputFromRow,
  loadCollectionCardForPricing,
} from '@/lib/pricing/refresh-collection-card';
import { resolveCollectionCardToCardSight } from '@/lib/cardsight/resolve-card';
import { assessPricingEligibility } from '@/lib/pricing/eligibility';

export async function loadFilterOptionsForCollectionCard(
  collectionCardId: string,
  userId: string
) {
  const row = await loadCollectionCardForPricing(collectionCardId, userId);
  if (!row) return null;

  const eligibility = assessPricingEligibility(eligibilityInputFromRow(row));
  if (!eligibility.ready) return null;

  const resolved = await resolveCollectionCardToCardSight(
    buildResolveInput(row, eligibility.segment)
  );
  if (resolved.status !== 'matched' && resolved.status !== 'already_linked') {
    return null;
  }

  const cache = await loadMarketCache(resolved.cardsightCardId, '3m');
  if (!cache) return null;

  return extractCacheFilterOptions(cache.pricing_response);
}
