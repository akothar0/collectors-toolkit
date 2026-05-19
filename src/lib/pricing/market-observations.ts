import type { SliceMarketCacheOutput } from '@/lib/pricing/slice-market-cache';
import { createServiceClient } from '@/lib/supabase';

const RETENTION_DAYS = 90;

export async function appendCollectionCardMarketObservation(
  collectionCardId: string,
  sliced: SliceMarketCacheOutput
) {
  const supabase = createServiceClient();
  const display = sliced.display.result;
  const strict = sliced.strict?.result;

  const { error } = await supabase.from('collection_card_market_observations').insert({
    collection_card_id: collectionCardId,
    observed_at: new Date().toISOString(),
    display_median: display.medianSalePrice,
    strict_median: strict?.medianSalePrice ?? null,
    sample_size: display.sampleSize,
    active_tier: sliced.display.tier,
    source: 'cardsight',
  });

  if (error) {
    console.error('Failed to append market observation', {
      collectionCardId,
      error: error.message,
    });
  }
}

export async function purgeOldMarketObservations() {
  const supabase = createServiceClient();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

  const { error } = await supabase
    .from('collection_card_market_observations')
    .delete()
    .lt('observed_at', cutoff.toISOString());

  if (error) {
    throw new Error(error.message);
  }
}

export type MarketObservationRow = {
  observedAt: string;
  displayMedian: number | null;
  sampleSize: number;
};

export async function loadMarketObservationsForCard(
  collectionCardId: string,
  userId: string,
  days = RETENTION_DAYS
): Promise<MarketObservationRow[]> {
  const supabase = createServiceClient();

  const { data: owned, error: ownedError } = await supabase
    .from('collection_cards')
    .select('id')
    .eq('id', collectionCardId)
    .eq('user_id', userId)
    .maybeSingle();

  if (ownedError) {
    throw new Error(ownedError.message);
  }
  if (!owned) {
    return [];
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const { data, error } = await supabase
    .from('collection_card_market_observations')
    .select('observed_at, display_median, sample_size')
    .eq('collection_card_id', collectionCardId)
    .gte('observed_at', cutoff.toISOString())
    .order('observed_at', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    observedAt: row.observed_at as string,
    displayMedian: row.display_median != null ? Number(row.display_median) : null,
    sampleSize: Number(row.sample_size ?? 0),
  }));
}
