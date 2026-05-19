import { getAuthenticatedSupabaseUserId } from '@/lib/collection-auth';
import { isCardSightConfigured } from '@/lib/cardsight/client';
import { refreshOwnedCollectionPricingForUser } from '@/lib/pricing/bulk-refresh';
import { refreshCollectionCardPricing } from '@/lib/pricing/refresh-collection-card';
import { checkRateLimit } from '@/lib/rate-limit';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const PRICING_REFRESH_DAILY_LIMIT = 20;

export async function POST(req: Request) {
  const supabaseUserId = await getAuthenticatedSupabaseUserId();
  if (!supabaseUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isCardSightConfigured()) {
    return NextResponse.json({ error: 'Market pricing is not configured.' }, { status: 503 });
  }

  const allowed = await checkRateLimit(supabaseUserId, 'pricing_refresh', PRICING_REFRESH_DAILY_LIMIT);
  if (!allowed) {
    return NextResponse.json({ error: 'Daily pricing refresh limit reached.' }, { status: 429 });
  }

  let body: { collectionCardId?: string; all?: boolean } = {};
  try {
    body = (await req.json()) as { collectionCardId?: string; all?: boolean };
  } catch {
    body = {};
  }

  try {
    if (body.all) {
      const summary = await refreshOwnedCollectionPricingForUser(supabaseUserId);
      return NextResponse.json({ success: true, summary });
    }

    if (!body.collectionCardId) {
      return NextResponse.json({ error: 'collectionCardId is required.' }, { status: 400 });
    }

    const result = await refreshCollectionCardPricing(body.collectionCardId, supabaseUserId);

    return NextResponse.json({ success: true, result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to refresh pricing.' },
      { status: 500 }
    );
  }
}
