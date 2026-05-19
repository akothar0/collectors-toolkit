import { createServiceClient } from '@/lib/supabase';
import { buildCardSightCatalogSearchQuery } from '@/lib/cardsight/catalog-search';
import { searchCatalogCards, searchCatalogParallels } from '@/lib/cardsight/client';
import {
  defaultCatalogMatchMinScore,
  pickBestCatalogMatches,
  type ResolveCardQuery,
} from '@/lib/cardsight/resolve-scoring';
import { normalizeParallelForPricing } from '@/lib/pricing/parallel-normalize';
import { normalizeSetNameForSearch } from '@/lib/pricing/set-normalize';
import type { PricingSupportedSport } from '@/lib/pricing/eligibility';
import type { CatalogCard } from '@/lib/cardsight/types';

export type CollectionCardResolveInput = ResolveCardQuery & {
  collectionCardId: string;
  cardId: string | null;
  conditionType: string;
  gradingCompany?: string | null;
  grade?: number | null;
  segment?: PricingSupportedSport | null;
};

export type CardSightResolveResult =
  | {
      status: 'matched';
      cardsightCardId: string;
      parallelId: string | null;
      catalogCard: CatalogCard;
    }
  | {
      status: 'already_linked';
      cardsightCardId: string;
      parallelId: string | null;
    }
  | { status: 'not_found' }
  | { status: 'ambiguous'; candidates: CatalogCard[] }
  | { status: 'needs_review'; reason: string };

async function loadLinkedCardSightId(cardId: string | null) {
  if (!cardId) return null;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('cards')
    .select('source, source_id')
    .eq('id', cardId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  if (data.source === 'cardsight' && data.source_id) {
    return data.source_id as string;
  }

  return null;
}

async function linkCatalogCard(cardId: string, cardsightCardId: string) {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from('cards')
    .update({
      source: 'cardsight',
      source_id: cardsightCardId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', cardId);

  if (error) {
    throw new Error(`Unable to link CardSight catalog id: ${error.message}`);
  }
}

async function resolveParallelId(parallelName: string | null, catalogCard: CatalogCard) {
  if (!parallelName) {
    return null;
  }

  const embedded = (catalogCard.parallels ?? []).find((parallel) => {
    const name = parallel.name?.trim().toLowerCase();
    const target = parallelName.toLowerCase();
    return name === target || (name && (name.includes(target) || target.includes(name)));
  });

  if (embedded?.id) {
    return embedded.id;
  }

  const releaseId = catalogCard.release?.id;
  const parallels = await searchCatalogParallels({
    name: parallelName,
    releaseId,
    take: 10,
  });

  const match = parallels.find((parallel) => {
    const name = parallel.name?.trim().toLowerCase();
    const target = parallelName.toLowerCase();
    return name === target || (name && (name.includes(target) || target.includes(name)));
  });

  return match?.id ?? null;
}

export async function resolveCollectionCardToCardSight(
  input: CollectionCardResolveInput
): Promise<CardSightResolveResult> {
  const player = input.player?.trim();
  if (!player) {
    return { status: 'needs_review', reason: 'Player name is required for catalog matching.' };
  }

  const linkedId = await loadLinkedCardSightId(input.cardId);
  const parallelName = normalizeParallelForPricing(input.parallel);

  if (linkedId) {
    return {
      status: 'already_linked',
      cardsightCardId: linkedId,
      parallelId: parallelName ? await resolveParallelId(parallelName, { id: linkedId }) : null,
    };
  }

  const normalizedSetName = normalizeSetNameForSearch(input.setName);
  const candidates = await searchCatalogCards(
    buildCardSightCatalogSearchQuery({
      player,
      cardNumber: input.cardNumber,
      segment: input.segment,
    })
  );

  const query: ResolveCardQuery = {
    player,
    year: input.year,
    setName: normalizedSetName,
    cardNumber: input.cardNumber,
    parallel: input.parallel,
    manufacturer: input.manufacturer,
  };

  const picked = pickBestCatalogMatches(candidates, query, {
    minScore: defaultCatalogMatchMinScore(query),
  });

  if (picked.status === 'not_found') {
    return { status: 'not_found' };
  }

  if (picked.status === 'ambiguous') {
    return { status: 'ambiguous', candidates: picked.matches };
  }

  const parallelId = await resolveParallelId(parallelName, picked.match);
  if (input.cardId) {
    await linkCatalogCard(input.cardId, picked.match.id);
  }

  return {
    status: 'matched',
    cardsightCardId: picked.match.id,
    parallelId,
    catalogCard: picked.match,
  };
}
