import type { CollectionCardItem } from '@/lib/collection';

export type CollectionRow = {
  id: string;
  front_image_url: string | null;
  override_player: string | null;
  override_year: number | null;
  override_set_name: string | null;
  override_parallel: string | null;
  override_card_number: string | null;
  sport: string | null;
  condition_type: string;
  grade: number | null;
  grading_company: string | null;
  cert_number: string | null;
  purchase_price: number | null;
  purchase_date: string | null;
  current_value: number | null;
  value_source?: string | null;
  market_price_sample_size?: number | null;
  created_at: string;
  cards: {
    player: string;
    year: number | null;
    set_name: string | null;
    card_number: string | null;
    parallel: string | null;
    sport: string | null;
  } | null | Array<{
    player: string;
    year: number | null;
    set_name: string | null;
    card_number: string | null;
    parallel: string | null;
    sport: string | null;
  }>;
};

function normalizeCardJoin(cards: CollectionRow['cards']) {
  if (!cards) return null;
  if (Array.isArray(cards)) return cards[0] ?? null;
  return cards;
}

export function mapCollectionRow(row: CollectionRow): CollectionCardItem {
  const card = normalizeCardJoin(row.cards);
  return {
    id: row.id,
    frontImageUrl: row.front_image_url,
    player: row.override_player ?? card?.player ?? null,
    year: row.override_year ?? card?.year ?? null,
    setName: row.override_set_name ?? card?.set_name ?? null,
    parallel: row.override_parallel ?? card?.parallel ?? null,
    cardNumber: row.override_card_number ?? card?.card_number ?? null,
    sport: row.sport ?? card?.sport ?? null,
    conditionType: row.condition_type,
    grade: row.grade != null ? Number(row.grade) : null,
    gradingCompany: row.grading_company,
    certNumber: row.cert_number,
    purchasePrice: row.purchase_price != null ? Number(row.purchase_price) : null,
    purchaseDate: row.purchase_date,
    currentValue: row.current_value != null ? Number(row.current_value) : null,
    valueSource: row.value_source ?? null,
    marketPriceSampleSize:
      row.market_price_sample_size != null ? Number(row.market_price_sample_size) : null,
    createdAt: row.created_at,
  };
}
