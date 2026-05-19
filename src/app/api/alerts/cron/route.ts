import { isResendConfigured } from '@/lib/email/resend';
import { runWantListPriceAlerts } from '@/lib/alerts/want-list-alerts';
import { purgeOldMarketObservations } from '@/lib/pricing/market-observations';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

function authorizeCron(req: Request) {
  const secret =
    process.env.PRICING_CRON_SECRET?.trim() || process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

export async function POST(req: Request) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isResendConfigured()) {
    return NextResponse.json({ error: 'Resend is not configured.' }, { status: 503 });
  }

  try {
    await purgeOldMarketObservations();
    const summary = await runWantListPriceAlerts();
    return NextResponse.json({ success: true, summary });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Alerts cron failed.' },
      { status: 500 }
    );
  }
}
