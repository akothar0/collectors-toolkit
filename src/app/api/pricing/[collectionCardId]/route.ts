import { getAuthenticatedSupabaseUserId } from '@/lib/collection-auth';
import { CardSightApiError, isCardSightConfigured } from '@/lib/cardsight/client';
import { getCollectionCardPricingDisplay } from '@/lib/pricing/display-collection-card';
import { mapPricingPayload, resolveCompsScopeNote } from '@/lib/pricing/presenter';
import { refreshCollectionCardPricing } from '@/lib/pricing/refresh-collection-card';
import { loadLatestSnapshotForCollectionCard } from '@/lib/pricing/store';
import { checkRateLimit } from '@/lib/rate-limit';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const PRICING_REFRESH_DAILY_LIMIT = 20;

type RouteContext = {
  params: Promise<{ collectionCardId: string }>;
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

  const { collectionCardId } = await context.params;
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

      const refreshResult = await refreshCollectionCardPricing(collectionCardId, supabaseUserId, {
        force: true,
      });

      if (refreshResult.status === 'collection_not_found') {
        return NextResponse.json({ error: 'Card not found.' }, { status: 404 });
      }

      if (
        refreshResult.status === 'unsupported_sport' ||
        refreshResult.status === 'incomplete_identity'
      ) {
        return NextResponse.json(
          mapPricingPayload({
            configured: true,
            status: refreshResult.status,
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
            message: 'Multiple catalog matches found. Refine card details to price this item.',
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

      const cached = await loadLatestSnapshotForCollectionCard(collectionCardId);
      const compCount = cached?.comparables?.length ?? 0;
      const gradedSample =
        cached?.snapshot?.sample_size != null ? Number(cached.snapshot.sample_size) : 0;
      const noComps = compCount === 0 && gradedSample === 0;

      return NextResponse.json(
        mapPricingPayload({
          configured: true,
          status: 'refreshed',
          snapshot: cached?.snapshot ?? null,
          comparables: cached?.comparables ?? null,
          message: noComps
            ? 'CardSight has no recent sold comps for this catalog card in the last 90 days.'
            : undefined,
          canRefresh: true,
          compsScopeNote: resolveCompsScopeNote({
            snapshot: cached?.snapshot ?? null,
            referenceKey: cached?.referenceKey ?? null,
          }),
        })
      );
    }

    const display = await getCollectionCardPricingDisplay(collectionCardId, supabaseUserId);

    if (display.status === 'collection_not_found') {
      return NextResponse.json({ error: 'Card not found.' }, { status: 404 });
    }

    if (display.status === 'unsupported_sport' || display.status === 'incomplete_identity') {
      return NextResponse.json(
        mapPricingPayload({
          configured: true,
          status: display.status,
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
          compsScopeNote: resolveCompsScopeNote({
            snapshot: display.snapshot,
            referenceKey: display.referenceKey ?? null,
          }),
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
    console.error('Pricing lookup failed', {
      collectionCardId,
      error: error instanceof Error ? error.message : String(error),
    });
    const message =
      error instanceof CardSightApiError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'Unable to load market pricing.';
    const status = error instanceof CardSightApiError && error.status === 429 ? 429 : 500;
    return NextResponse.json(
      mapPricingPayload({
        configured: true,
        status: 'error',
        message,
        canRefresh: true,
      }),
      { status }
    );
  }
}
