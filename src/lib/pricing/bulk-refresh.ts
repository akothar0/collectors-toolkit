import { refreshCollectionCardPricing } from '@/lib/pricing/refresh-collection-card';
import { createServiceClient } from '@/lib/supabase';

const BULK_CHUNK_SIZE = 25;

/** Cap per cron run to stay within Hobby function time and CardSight free-tier quota. */
export function getCronCardLimit() {
  const parsed = Number.parseInt(process.env.PRICING_CRON_CARD_LIMIT ?? '40', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 40;
}

export async function refreshOwnedCollectionPricingForUser(userId: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('collection_cards')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'owned')
    .order('updated_at', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const ids = (data ?? []).map((row) => row.id as string);
  return refreshCollectionCardIds(ids, userId);
}

export async function refreshAllOwnedCollectionPricing(limit = getCronCardLimit()) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('collection_cards')
    .select('id, user_id')
    .eq('status', 'owned')
    .order('value_updated_at', { ascending: true, nullsFirst: true })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  const summary = {
    refreshed: 0,
    cached: 0,
    failed: 0,
    skipped: 0,
  };

  for (const row of data ?? []) {
    try {
      const result = await refreshCollectionCardPricing(row.id as string, row.user_id as string);
      if (result.status === 'refreshed') summary.refreshed += 1;
      else summary.skipped += 1;
    } catch (refreshError) {
      console.error('Bulk pricing refresh failed', {
        collectionCardId: row.id,
        error: refreshError instanceof Error ? refreshError.message : String(refreshError),
      });
      summary.failed += 1;
    }
  }

  return summary;
}

async function refreshCollectionCardIds(collectionCardIds: string[], userId: string) {
  const summary = {
    refreshed: 0,
    cached: 0,
    failed: 0,
    skipped: 0,
  };

  for (let index = 0; index < collectionCardIds.length; index += BULK_CHUNK_SIZE) {
    const chunk = collectionCardIds.slice(index, index + BULK_CHUNK_SIZE);
    for (const collectionCardId of chunk) {
      try {
        const result = await refreshCollectionCardPricing(collectionCardId, userId);
        if (result.status === 'refreshed') summary.refreshed += 1;
        else summary.skipped += 1;
      } catch (refreshError) {
        console.error('Pricing refresh failed', {
          collectionCardId,
          error: refreshError instanceof Error ? refreshError.message : String(refreshError),
        });
        summary.failed += 1;
      }
    }
  }

  return summary;
}
