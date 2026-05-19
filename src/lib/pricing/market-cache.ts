import { getCardPricing } from '@/lib/cardsight/client';
import type { CardSightPeriod, PricingResponse } from '@/lib/cardsight/types';
import { isPricingMonthlyCapReached } from '@/lib/pricing/pricing-quota';
import { createServiceClient } from '@/lib/supabase';

const DEFAULT_PERIOD: CardSightPeriod = '3m';
const DEFAULT_LIMIT = 50;
const STALE_HOURS = Number(process.env.PRICING_MARKET_CACHE_STALE_HOURS ?? 24);

export type MarketCacheRow = {
  cardsight_card_id: string;
  period: string;
  pricing_response: PricingResponse;
  total_records: number;
  queried_at: string;
  stale_after: string;
};

function isFresh(staleAfter: string) {
  return Date.parse(staleAfter) > Date.now();
}

export async function loadMarketCache(
  cardsightCardId: string,
  period: CardSightPeriod = DEFAULT_PERIOD
): Promise<MarketCacheRow | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('cardsight_market_cache')
    .select('cardsight_card_id, period, pricing_response, total_records, queried_at, stale_after')
    .eq('cardsight_card_id', cardsightCardId)
    .eq('period', period)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return {
    cardsight_card_id: data.cardsight_card_id as string,
    period: data.period as string,
    pricing_response: data.pricing_response as PricingResponse,
    total_records: Number(data.total_records ?? 0),
    queried_at: data.queried_at as string,
    stale_after: data.stale_after as string,
  };
}

async function upsertMarketCache(
  cardsightCardId: string,
  period: CardSightPeriod,
  pricingResponse: PricingResponse
): Promise<MarketCacheRow> {
  const supabase = createServiceClient();
  const queriedAt = new Date();
  const staleAfter = new Date(queriedAt.getTime() + STALE_HOURS * 60 * 60 * 1000);
  const totalRecords = pricingResponse.meta?.total_records ?? 0;

  const payload = {
    cardsight_card_id: cardsightCardId,
    period,
    pricing_response: pricingResponse,
    total_records: totalRecords,
    queried_at: queriedAt.toISOString(),
    stale_after: staleAfter.toISOString(),
    updated_at: queriedAt.toISOString(),
  };

  const { data, error } = await supabase
    .from('cardsight_market_cache')
    .upsert(payload, { onConflict: 'cardsight_card_id,period' })
    .select('cardsight_card_id, period, pricing_response, total_records, queried_at, stale_after')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Unable to store CardSight market cache');
  }

  return {
    cardsight_card_id: data.cardsight_card_id as string,
    period: data.period as string,
    pricing_response: data.pricing_response as PricingResponse,
    total_records: Number(data.total_records ?? 0),
    queried_at: data.queried_at as string,
    stale_after: data.stale_after as string,
  };
}

export type FetchOrLoadMarketCacheOptions = {
  period?: CardSightPeriod;
  limit?: number;
  force?: boolean;
};

/**
 * Returns cached pricing for a catalog card, or fetches once (unfiltered) when missing/stale/forced.
 */
export async function fetchOrLoadMarketCache(
  cardsightCardId: string,
  options?: FetchOrLoadMarketCacheOptions
): Promise<{ cache: MarketCacheRow; fromApi: boolean }> {
  const period = options?.period ?? DEFAULT_PERIOD;
  const limit = options?.limit ?? DEFAULT_LIMIT;

  if (!options?.force) {
    const existing = await loadMarketCache(cardsightCardId, period);
    if (existing && isFresh(existing.stale_after)) {
      return { cache: existing, fromApi: false };
    }
  }

  const existingStale = await loadMarketCache(cardsightCardId, period);
  if (await isPricingMonthlyCapReached()) {
    if (existingStale) {
      return { cache: existingStale, fromApi: false };
    }
    throw new Error('Monthly CardSight pricing quota reached. Try again next month.');
  }

  const pricingResponse = await getCardPricing(cardsightCardId, {
    period,
    listingType: 'both',
    limit,
  });

  const cache = await upsertMarketCache(cardsightCardId, period, pricingResponse);
  return { cache, fromApi: true };
}
