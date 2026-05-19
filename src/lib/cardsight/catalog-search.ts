import type { SearchCatalogCardsInput } from '@/lib/cardsight/client';

/**
 * CardSight catalog search over-filters when year/setName are sent (often returns 0 rows).
 * Use player + card number (+ segment); score year/set locally in resolve-scoring.
 */
export function buildCardSightCatalogSearchQuery(input: {
  player: string;
  cardNumber?: string | null;
  segment?: string | null;
  take?: number;
}): SearchCatalogCardsInput {
  const name = input.player.trim();
  const number = input.cardNumber?.trim().replace(/^#/, '') || undefined;

  return {
    name: name || undefined,
    number,
    segment: input.segment?.trim() || undefined,
    take: input.take ?? 25,
  };
}
