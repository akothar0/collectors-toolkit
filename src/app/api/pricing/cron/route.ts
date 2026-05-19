import { isCardSightConfigured } from '@/lib/cardsight/client';
import { refreshAllOwnedCollectionPricing } from '@/lib/pricing/bulk-refresh';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
/** Hobby plan max is 60s. */
export const maxDuration = 60;

function authorizeCron(req: Request) {
  const secret =
    process.env.PRICING_CRON_SECRET?.trim() || process.env.CRON_SECRET?.trim();
  if (!secret) {
    return false;
  }

  const header = req.headers.get('authorization');
  return header === `Bearer ${secret}`;
}

export async function POST(req: Request) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isCardSightConfigured()) {
    return NextResponse.json({ error: 'Market pricing is not configured.' }, { status: 503 });
  }

  try {
    const summary = await refreshAllOwnedCollectionPricing();
    return NextResponse.json({ success: true, summary });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Cron pricing refresh failed.' },
      { status: 500 }
    );
  }
}
