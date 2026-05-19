import { NextResponse } from 'next/server';
import { getAuthenticatedSupabaseUserId } from '@/lib/collection-auth';
import { resolveCollectionCardToCardSight } from '@/lib/cardsight/resolve-card';
import { buildGradeProfitabilityPayload, type PsaFeeTier } from '@/lib/grading-roi';
import { assessPricingEligibility } from '@/lib/pricing/eligibility';
import { fetchOrLoadMarketCache } from '@/lib/pricing/market-cache';
import {
  buildResolveInput,
  eligibilityInputFromRow,
  loadCollectionCardForPricing,
} from '@/lib/pricing/refresh-collection-card';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ collectionCardId: string }>;
};

type CollectionRoiRequest = {
  rawPrice?: number;
  feeTier?: PsaFeeTier;
};

function isFeeTier(value: unknown): value is PsaFeeTier {
  return value === 'economy' || value === 'value' || value === 'regular';
}

function parseRawPrice(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

export async function POST(req: Request, context: RouteContext) {
  try {
    const supabaseUserId = await getAuthenticatedSupabaseUserId();
    if (!supabaseUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { collectionCardId } = await context.params;
    const body = (await req.json()) as CollectionRoiRequest;
    if (!isFeeTier(body.feeTier)) {
      return NextResponse.json({ error: 'Fee tier is required.' }, { status: 400 });
    }

    const row = await loadCollectionCardForPricing(collectionCardId, supabaseUserId);
    if (!row) {
      return NextResponse.json({ error: 'Card not found.' }, { status: 404 });
    }
    if (row.condition_type !== 'raw') {
      return NextResponse.json(
        { error: 'Grade profitability is available for raw cards only.', status: 'graded_card' },
        { status: 400 }
      );
    }

    const rawPrice = parseRawPrice(body.rawPrice) ?? row.purchase_price;
    if (rawPrice == null || !Number.isFinite(rawPrice)) {
      return NextResponse.json(
        {
          error: 'Add a raw price or purchase price to calculate profitability.',
          status: 'missing_raw_price',
        },
        { status: 400 }
      );
    }

    const psaPrediction =
      row.raw_grade_sessions?.psa_prediction != null
        ? Number(row.raw_grade_sessions.psa_prediction)
        : row.raw_grade_sessions?.predicted_grade != null
          ? Number(row.raw_grade_sessions.predicted_grade)
          : null;
    if (psaPrediction == null || !Number.isFinite(psaPrediction)) {
      return NextResponse.json(
        { error: 'Profitability requires a grader prediction first.', status: 'missing_prediction' },
        { status: 422 }
      );
    }

    const eligibility = assessPricingEligibility(eligibilityInputFromRow(row));
    if (!eligibility.ready) {
      return NextResponse.json(
        { error: eligibility.message, status: eligibility.status },
        { status: 422 }
      );
    }

    const resolved = await resolveCollectionCardToCardSight(
      buildResolveInput(row, eligibility.segment)
    );
    if (resolved.status === 'not_found') {
      return NextResponse.json(
        { error: 'We could not find this card in CardSight.', status: 'catalog_not_found' },
        { status: 422 }
      );
    }
    if (resolved.status === 'ambiguous') {
      return NextResponse.json(
        { error: 'Multiple CardSight matches found. Refine the card details.', status: 'ambiguous' },
        { status: 409 }
      );
    }
    if (resolved.status === 'needs_review') {
      return NextResponse.json(
        { error: resolved.reason, status: 'needs_review' },
        { status: 422 }
      );
    }

    const { cache } = await fetchOrLoadMarketCache(resolved.cardsightCardId);
    const payload = buildGradeProfitabilityPayload({
      pricingResponse: cache.pricing_response,
      psaPrediction,
      rawPrice,
      feeTier: body.feeTier,
      cardsightCardId: resolved.cardsightCardId,
      parallelId: resolved.parallelId,
      pricingResolvedAt: cache.queried_at,
    });

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to calculate profitability.' },
      { status: 500 }
    );
  }
}
