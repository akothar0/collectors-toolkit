import { createServiceClient } from '@/lib/supabase';
import { buildPriceFingerprint, buildPriceQueryText } from '@/lib/pricing/fingerprint';
import type { NormalizedPriceResult, PriceReferenceFingerprintInput } from '@/lib/pricing/types';

const STALE_HOURS = 24;

export type StoredPriceSnapshot = {
  snapshotId: string;
  referenceKeyId: string;
  result: NormalizedPriceResult;
};

async function upsertReferenceKey(input: PriceReferenceFingerprintInput) {
  const supabase = createServiceClient();
  const fingerprint = buildPriceFingerprint(input);
  const queryText = buildPriceQueryText(input);

  const { data: existing, error: existingError } = await supabase
    .from('price_reference_keys')
    .select('id')
    .eq('fingerprint', fingerprint)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing?.id) {
    return existing.id as string;
  }

  const { data, error } = await supabase
    .from('price_reference_keys')
    .insert({
      fingerprint,
      source: 'cardsight',
      marketplace: 'CARDSIGHT',
      sport: null,
      year: input.year ?? null,
      player: input.player ?? null,
      set_name: input.setName ?? null,
      parallel: input.parallel ?? null,
      card_number: input.cardNumber ?? null,
      rookie: false,
      condition_bucket: input.conditionBucket,
      grading_company: input.gradingCompany ?? null,
      grade: input.grade ?? null,
      query_text: queryText,
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Unable to create price reference key');
  }

  return data.id as string;
}

export type PersistPriceSnapshotMeta = {
  scopeNote?: string | null;
  activeTier?: string | null;
  strictSampleSize?: number | null;
  marketCacheQueriedAt?: string | null;
};

export type PersistPriceValuation = {
  valuationEligible: boolean;
  medianSalePrice: number | null;
};

export async function persistNormalizedPrice(
  input: PriceReferenceFingerprintInput,
  result: NormalizedPriceResult,
  meta?: PersistPriceSnapshotMeta,
  valuation?: PersistPriceValuation
): Promise<StoredPriceSnapshot> {
  const supabase = createServiceClient();
  const referenceKeyId = await upsertReferenceKey(input);
  const queriedAt = new Date();
  const staleAfter = new Date(queriedAt.getTime() + STALE_HOURS * 60 * 60 * 1000);

  const snapshotDate = queriedAt.toISOString().slice(0, 10);
  const valuationEligible = valuation?.valuationEligible ?? result.valuationEligible;

  const snapshotPayload = {
    reference_key_id: referenceKeyId,
    source: 'cardsight',
    snapshot_date: snapshotDate,
    queried_at: queriedAt.toISOString(),
    stale_after: staleAfter.toISOString(),
    window_days: result.windowDays,
    avg_sale_price: result.avgSalePrice,
    median_sale_price: result.medianSalePrice,
    min_sale_price: result.minSalePrice,
    max_sale_price: result.maxSalePrice,
    sample_size: result.sampleSize,
    latest_sale_at: result.latestSaleAt,
    confidence_score: result.confidenceScore,
    confidence_label: result.confidenceLabel,
    valuation_eligible: valuationEligible,
    raw_response: result.rawResponse,
    comps_scope_note: meta?.scopeNote ?? null,
    active_tier: meta?.activeTier ?? null,
    strict_sample_size: meta?.strictSampleSize ?? null,
    market_cache_queried_at: meta?.marketCacheQueriedAt ?? null,
  };

  const { data: existingSnapshot, error: existingSnapshotError } = await supabase
    .from('price_snapshots')
    .select('id')
    .eq('reference_key_id', referenceKeyId)
    .eq('source', 'cardsight')
    .eq('snapshot_date', snapshotDate)
    .maybeSingle();

  if (existingSnapshotError) {
    throw new Error(existingSnapshotError.message);
  }

  let snapshotId: string;

  if (existingSnapshot?.id) {
    snapshotId = existingSnapshot.id as string;
    const { error: updateError } = await supabase
      .from('price_snapshots')
      .update(snapshotPayload)
      .eq('id', snapshotId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    const { error: deleteCompsError } = await supabase
      .from('price_comparables')
      .delete()
      .eq('snapshot_id', snapshotId);

    if (deleteCompsError) {
      throw new Error(deleteCompsError.message);
    }
  } else {
    const { data: snapshot, error: snapshotError } = await supabase
      .from('price_snapshots')
      .insert(snapshotPayload)
      .select('id')
      .single();

    if (snapshotError || !snapshot) {
      throw new Error(snapshotError?.message ?? 'Unable to store price snapshot');
    }

    snapshotId = snapshot.id as string;
  }

  if (result.comparables.length > 0) {
    const { error: comparablesError } = await supabase.from('price_comparables').insert(
      result.comparables.map((comparable) => ({
        snapshot_id: snapshotId,
        title: comparable.title,
        item_url: comparable.itemUrl,
        image_url: comparable.imageUrl,
        sale_date: comparable.saleDate,
        sale_price: comparable.salePrice,
        total_price: comparable.salePrice,
        listing_format: comparable.listingFormat,
        condition_label: comparable.conditionLabel,
        grading_company: comparable.gradingCompany,
        grade: comparable.grade,
        exact_grade_match: Boolean(comparable.grade),
        exact_company_match: Boolean(comparable.gradingCompany),
      }))
    );

    if (comparablesError) {
      throw new Error(comparablesError.message);
    }
  }

  const storedResult = {
    ...result,
    valuationEligible,
  };

  return {
    snapshotId,
    referenceKeyId,
    result: storedResult,
  };
}

export async function applySnapshotToCollectionCard(
  collectionCardId: string,
  stored: StoredPriceSnapshot,
  valuation?: PersistPriceValuation
) {
  const supabase = createServiceClient();
  const eligible = valuation?.valuationEligible ?? stored.result.valuationEligible;
  const median =
    valuation?.medianSalePrice ??
    (stored.result.valuationEligible ? stored.result.medianSalePrice : null);
  const marketValue = eligible ? median : null;

  const { error } = await supabase
    .from('collection_cards')
    .update({
      price_reference_key_id: stored.referenceKeyId,
      latest_price_snapshot_id: stored.snapshotId,
      market_price_sample_size: stored.result.sampleSize,
      market_price_confidence: stored.result.confidenceLabel,
      ...(marketValue != null
        ? {
            current_value: marketValue,
            value_updated_at: new Date().toISOString(),
            value_source: 'cardsight',
          }
        : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', collectionCardId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function applySnapshotToWantListItem(wantListId: string, stored: StoredPriceSnapshot) {
  const supabase = createServiceClient();
  const marketPrice = stored.result.valuationEligible ? stored.result.medianSalePrice : null;

  const { error } = await supabase
    .from('want_list')
    .update({
      price_reference_key_id: stored.referenceKeyId,
      latest_price_snapshot_id: stored.snapshotId,
      ...(marketPrice != null ? { target_price: marketPrice } : {}),
    })
    .eq('id', wantListId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function loadLatestSnapshotForWantListItem(wantListId: string) {
  const supabase = createServiceClient();

  const { data: item, error: itemError } = await supabase
    .from('want_list')
    .select('id, latest_price_snapshot_id, target_price')
    .eq('id', wantListId)
    .maybeSingle();

  if (itemError || !item?.latest_price_snapshot_id) {
    return null;
  }

  const { data: snapshot, error: snapshotError } = await supabase
    .from('price_snapshots')
    .select('*')
    .eq('id', item.latest_price_snapshot_id)
    .maybeSingle();

  if (snapshotError || !snapshot) {
    return null;
  }

  const { data: comparables, error: comparablesError } = await supabase
    .from('price_comparables')
    .select('*')
    .eq('snapshot_id', snapshot.id)
    .order('sale_date', { ascending: false })
    .limit(5);

  if (comparablesError) {
    throw new Error(comparablesError.message);
  }

  return {
    item,
    snapshot,
    comparables: comparables ?? [],
  };
}

export async function loadLatestSnapshotForCollectionCard(collectionCardId: string) {
  const supabase = createServiceClient();

  const { data: card, error: cardError } = await supabase
    .from('collection_cards')
    .select(
      'id, latest_price_snapshot_id, current_value, value_updated_at, value_source, market_price_sample_size, market_price_confidence'
    )
    .eq('id', collectionCardId)
    .maybeSingle();

  if (cardError || !card?.latest_price_snapshot_id) {
    return null;
  }

  const { data: snapshot, error: snapshotError } = await supabase
    .from('price_snapshots')
    .select('*, price_reference_keys(condition_bucket, grading_company, grade)')
    .eq('id', card.latest_price_snapshot_id)
    .maybeSingle();

  if (snapshotError || !snapshot) {
    return null;
  }

  const referenceKey = normalizeJoin(
    snapshot.price_reference_keys as
      | { condition_bucket: string; grading_company: string | null; grade: number | null }
      | { condition_bucket: string; grading_company: string | null; grade: number | null }[]
      | null
  );

  const { data: comparables, error: comparablesError } = await supabase
    .from('price_comparables')
    .select('*')
    .eq('snapshot_id', snapshot.id)
    .order('sale_date', { ascending: false })
    .limit(10);

  if (comparablesError) {
    throw new Error(comparablesError.message);
  }

  return {
    card,
    snapshot,
    comparables: comparables ?? [],
    referenceKey,
  };
}

function normalizeJoin<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

export function isSnapshotStale(staleAfter: string | null | undefined) {
  if (!staleAfter) return true;
  return Date.parse(staleAfter) <= Date.now();
}
