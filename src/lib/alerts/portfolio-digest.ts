import { sendTransactionalEmail } from '@/lib/email/resend';
import { createServiceClient } from '@/lib/supabase';

const MOVE_THRESHOLD_PCT = 10;

export async function runWeeklyPortfolioDigest() {
  const supabase = createServiceClient();
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email, email_alerts_enabled')
    .eq('email_alerts_enabled', true)
    .not('email', 'is', null);

  if (usersError) {
    throw new Error(usersError.message);
  }

  let sent = 0;

  for (const user of users ?? []) {
    if (!user.email) continue;

    const movers = await loadPortfolioMovers(user.id as string, weekAgo.toISOString());
    if (movers.length === 0) continue;

    const lines = movers
      .slice(0, 15)
      .map(
        (m) =>
          `<li><strong>${m.label}</strong>: ${m.pct >= 0 ? '+' : ''}${m.pct.toFixed(1)}% (${formatMoney(m.from)} → ${formatMoney(m.to)})</li>`
      )
      .join('');

    try {
      await sendTransactionalEmail({
        to: user.email as string,
        subject: 'Your cards moved this week',
        html: `<p>These collection cards moved more than ${MOVE_THRESHOLD_PCT}% in the last 7 days (market median):</p><ul>${lines}</ul>
<p><a href="${process.env.NEXT_PUBLIC_APP_URL ?? ''}/portfolio">Open portfolio</a></p>`,
      });
      sent += 1;
    } catch (emailError) {
      console.error('Portfolio digest email failed', {
        userId: user.id,
        error: emailError instanceof Error ? emailError.message : String(emailError),
      });
    }
  }

  return { sent, usersChecked: (users ?? []).length };
}

function formatMoney(value: number) {
  return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

async function loadPortfolioMovers(userId: string, weekAgoIso: string) {
  const supabase = createServiceClient();

  const { data: cards, error } = await supabase
    .from('collection_cards')
    .select('id, override_player, cards(player)')
    .eq('user_id', userId)
    .eq('status', 'owned');

  if (error) {
    throw new Error(error.message);
  }

  const movers: { label: string; pct: number; from: number; to: number }[] = [];

  for (const card of cards ?? []) {
    const { data: observations } = await supabase
      .from('collection_card_market_observations')
      .select('observed_at, display_median, sample_size')
      .eq('collection_card_id', card.id)
      .gte('observed_at', weekAgoIso)
      .order('observed_at', { ascending: true });

    const points = (observations ?? []).filter(
      (o) => o.display_median != null && Number(o.sample_size) > 0
    );
    if (points.length < 2) continue;

    const from = Number(points[0].display_median);
    const to = Number(points[points.length - 1].display_median);
    if (from <= 0) continue;

    const pct = ((to - from) / from) * 100;
    if (Math.abs(pct) < MOVE_THRESHOLD_PCT) continue;

    const catalog = card.cards as { player?: string } | { player?: string }[] | null;
    const player = Array.isArray(catalog) ? catalog[0]?.player : catalog?.player;
    const label = (card.override_player as string | null) ?? player ?? 'Card';

    movers.push({ label, pct, from, to });
  }

  movers.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));
  return movers;
}
