import { createServiceClient } from '@/lib/supabase';

export function getPricingMonthlyCap() {
  const parsed = Number.parseInt(process.env.PRICING_MONTHLY_CAP ?? '500', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 500;
}

export async function getMonthlyMarketCacheFetchCount() {
  const supabase = createServiceClient();
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from('cardsight_market_cache')
    .select('cardsight_card_id', { count: 'exact', head: true })
    .gte('queried_at', start.toISOString());

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

export async function isPricingMonthlyCapReached() {
  const cap = getPricingMonthlyCap();
  const used = await getMonthlyMarketCacheFetchCount();
  return used >= cap;
}
