import { getAuthenticatedSupabaseUserId } from '@/lib/collection-auth';
import { loadMarketObservationsForCard } from '@/lib/pricing/market-observations';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const supabaseUserId = await getAuthenticatedSupabaseUserId();
  if (!supabaseUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const observations = await loadMarketObservationsForCard(id, supabaseUserId);
    return NextResponse.json({ observations });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to load price history.' },
      { status: 500 }
    );
  }
}
