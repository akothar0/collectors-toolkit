import { mapCollectionRow, type CollectionRow } from '@/lib/collection-rows';
import { buildPortfolioSummary, type PortfolioSummary } from '@/lib/portfolio';
import { createServiceClient } from '@/lib/supabase';

const COLLECTION_SELECT = `id, front_image_url, override_player, override_year, override_set_name, override_parallel, override_card_number,
  sport, condition_type, grade, grading_company, cert_number, purchase_price, purchase_date, current_value, created_at,
  cards ( player, year, set_name, card_number, parallel, sport )`;

export async function fetchPortfolioSummary(
  supabaseUserId: string
): Promise<PortfolioSummary> {
  const supabase = createServiceClient();

  const [cardsResult, scansResult, gradesResult] = await Promise.all([
    supabase
      .from('collection_cards')
      .select(COLLECTION_SELECT)
      .eq('user_id', supabaseUserId)
      .eq('status', 'owned'),
    supabase
      .from('graded_scans')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', supabaseUserId),
    supabase
      .from('raw_grade_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', supabaseUserId),
  ]);

  if (cardsResult.error) {
    throw new Error(cardsResult.error.message);
  }

  const cards = (cardsResult.data ?? []).map((row) =>
    mapCollectionRow(row as CollectionRow)
  );

  return buildPortfolioSummary(
    cards,
    scansResult.count ?? 0,
    gradesResult.count ?? 0
  );
}
