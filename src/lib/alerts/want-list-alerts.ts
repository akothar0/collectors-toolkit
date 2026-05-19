import { loadMarketCache } from '@/lib/pricing/market-cache';
import { resolveGradeId } from '@/lib/cardsight/grades';
import { searchCatalogCards } from '@/lib/cardsight/client';
import { buildCardSightCatalogSearchQuery } from '@/lib/cardsight/catalog-search';
import { sliceMarketCache } from '@/lib/pricing/slice-market-cache';
import { sendTransactionalEmail } from '@/lib/email/resend';
import { createServiceClient } from '@/lib/supabase';

export async function runWantListPriceAlerts() {
  const supabase = createServiceClient();
  const { data: rows, error } = await supabase
    .from('want_list')
    .select(
      'id, user_id, description, player, year, set_name, parallel, target_price, target_grade_min, grading_company'
    )
    .eq('status', 'active')
    .not('target_price', 'is', null);

  if (error) {
    throw new Error(error.message);
  }

  let sent = 0;
  let skipped = 0;

  for (const row of rows ?? []) {
    const targetPrice = Number(row.target_price);
    if (!Number.isFinite(targetPrice) || targetPrice <= 0) {
      skipped += 1;
      continue;
    }

    const { data: userRow } = await supabase
      .from('users')
      .select('email, email_alerts_enabled')
      .eq('id', row.user_id)
      .maybeSingle();

    if (!userRow?.email || userRow.email_alerts_enabled === false) {
      skipped += 1;
      continue;
    }

    const median = await estimateWantListMedian(row);
    if (median == null || median > targetPrice) {
      skipped += 1;
      continue;
    }

    const { data: existing } = await supabase
      .from('want_list_price_alerts')
      .select('id')
      .eq('want_list_id', row.id)
      .gte('triggered_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .maybeSingle();

    if (existing?.id) {
      skipped += 1;
      continue;
    }

    const { error: insertError } = await supabase.from('want_list_price_alerts').insert({
      want_list_id: row.id,
      user_id: row.user_id,
      market_median: median,
      target_price: targetPrice,
    });

    if (insertError) {
      console.error('Want list alert insert failed', { wantListId: row.id, error: insertError.message });
      skipped += 1;
      continue;
    }

    try {
      await sendTransactionalEmail({
        to: userRow.email,
        subject: `Price alert: ${row.description}`,
        html: `<p><strong>${row.description}</strong> is at or below your target.</p>
<p>Market median: <strong>$${median.toFixed(2)}</strong><br/>Your target: <strong>$${targetPrice.toFixed(2)}</strong></p>
<p><a href="${process.env.NEXT_PUBLIC_APP_URL ?? ''}/wantlist">View want list</a></p>`,
      });
      sent += 1;
    } catch (emailError) {
      console.error('Want list alert email failed', {
        wantListId: row.id,
        error: emailError instanceof Error ? emailError.message : String(emailError),
      });
    }
  }

  return { sent, skipped, checked: (rows ?? []).length };
}

async function estimateWantListMedian(row: Record<string, unknown>) {
  const query = buildCardSightCatalogSearchQuery({
    player: String(row.player ?? row.description ?? ''),
    cardNumber: null,
    segment: 'sports',
  });

  const cards = await searchCatalogCards(query);
  const best = cards[0];
  if (!best?.id) return null;

  const cache = await loadMarketCache(best.id, '3m');
  if (!cache) return null;

  const grade = row.target_grade_min != null ? Number(row.target_grade_min) : null;
  const company = (row.grading_company as string | null) ?? null;
  const isGraded = grade != null && company;

  let gradeId: string | null = null;
  if (isGraded && company && grade != null) {
    try {
      gradeId = await resolveGradeId(company, grade);
    } catch {
      gradeId = null;
    }
  }

  const sliced = sliceMarketCache({
    pricingResponse: cache.pricing_response,
    period: '3m',
    gradeId,
    gradingCompany: company,
    grade,
    parallelId: null,
    isGraded: Boolean(isGraded),
  });

  return sliced.display.result.medianSalePrice;
}
