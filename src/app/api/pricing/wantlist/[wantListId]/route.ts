import { getAuthenticatedSupabaseUserId } from '@/lib/collection-auth';
import { isCardSightConfigured } from '@/lib/cardsight/client';
import { getWantListItemPricingDisplay } from '@/lib/pricing/display-want-list-item';
import { mapPricingPayload } from '@/lib/pricing/presenter';
import { refreshWantListItemPricing } from '@/lib/pricing/refresh-want-list-item';
import { loadLatestSnapshotForWantListItem } from '@/lib/pricing/store';
import { checkRateLimit } from '@/lib/rate-limit';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const PRICING_REFRESH_DAILY_LIMIT = 20;

type RouteContext = {
  params: Promise<{ wantListId: string }>;
};

export async function GET(req: Request, context: RouteContext) {
  const supabaseUserId = await getAuthenticatedSupabaseUserId();
  if (!supabaseUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isCardSightConfigured()) {
    return NextResponse.json(
      mapPricingPayload({
        configured: false,
        status: 'unavailable',
        message: 'Market pricing is not configured.',
        canRefresh: false,
      })
    );
  }

  const { wantListId } = await context.params;
  const url = new URL(req.url);
  const force = url.searchParams.get('force') === '1';

  try {
    if (force) {
      const allowed = await checkRateLimit(
        supabaseUserId,
        'pricing_refresh',
        PRICING_REFRESH_DAILY_LIMIT
      );
      if (!allowed) {
        return NextResponse.json(
          { error: 'Daily pricing refresh limit reached.' },
          { status: 429 }
        );
      }

      const refreshResult = await refreshWantListItemPricing(wantListId, supabaseUserId);

      if (refreshResult.status === 'not_found') {
        return NextResponse.json({ error: 'Want list item not found.' }, { status: 404 });
      }

      if (refreshResult.status === 'incomplete_identity') {
        return NextResponse.json(
          mapPricingPayload({
            configured: true,
            status: 'incomplete_identity',
            message: refreshResult.message,
            canRefresh: false,
          })
        );
      }

      if (refreshResult.status === 'catalog_not_found') {
        return NextResponse.json(
          mapPricingPayload({
            configured: true,
            status: 'catalog_not_found',
            message: refreshResult.message,
            canRefresh: true,
          })
        );
      }

      if (refreshResult.status === 'ambiguous') {
        return NextResponse.json(
          mapPricingPayload({
            configured: true,
            status: 'ambiguous',
            message: 'Multiple catalog matches found. Add player, year, and set for a tighter match.',
            canRefresh: true,
          })
        );
      }

      if (refreshResult.status === 'needs_review') {
        return NextResponse.json(
          mapPricingPayload({
            configured: true,
            status: 'needs_review',
            message: refreshResult.reason,
            canRefresh: true,
          })
        );
      }

      const cached = await loadLatestSnapshotForWantListItem(wantListId);
      return NextResponse.json(
        mapPricingPayload({
          configured: true,
          status: 'refreshed',
          snapshot: cached?.snapshot ?? null,
          comparables: cached?.comparables ?? null,
          canRefresh: true,
        })
      );
    }

    const display = await getWantListItemPricingDisplay(wantListId, supabaseUserId);

    if (display.status === 'not_found') {
      return NextResponse.json({ error: 'Want list item not found.' }, { status: 404 });
    }

    if (display.status === 'incomplete_identity') {
      return NextResponse.json(
        mapPricingPayload({
          configured: true,
          status: 'incomplete_identity',
          message: display.message,
          canRefresh: false,
        })
      );
    }

    if (display.status === 'idle') {
      return NextResponse.json(
        mapPricingPayload({
          configured: true,
          status: 'idle',
          message: display.message,
          canRefresh: true,
        })
      );
    }

    if (display.status === 'cached') {
      return NextResponse.json(
        mapPricingPayload({
          configured: true,
          status: 'cached',
          snapshot: display.snapshot,
          comparables: display.comparables,
          canRefresh: true,
        })
      );
    }

    return NextResponse.json(
      mapPricingPayload({
        configured: true,
        status: 'error',
        message: 'Unable to load market pricing.',
        canRefresh: true,
      }),
      { status: 500 }
    );
  } catch (error) {
    console.error('Want list pricing lookup failed', {
      wantListId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      mapPricingPayload({
        configured: true,
        status: 'error',
        message: error instanceof Error ? error.message : 'Unable to load market pricing.',
        canRefresh: true,
      }),
      { status: 500 }
    );
  }
}
