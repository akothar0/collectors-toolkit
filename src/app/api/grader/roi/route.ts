import { NextResponse } from 'next/server';
import { getAuthenticatedSupabaseUserId } from '@/lib/collection-auth';
import { createServiceClient } from '@/lib/supabase';
import { assessPricingEligibility } from '@/lib/pricing/eligibility';
import { resolveCollectionCardToCardSight } from '@/lib/cardsight/resolve-card';
import { fetchOrLoadMarketCache } from '@/lib/pricing/market-cache';
import { buildGradeProfitabilityPayload, type PsaFeeTier } from '@/lib/grading-roi';

export const runtime = 'nodejs';

type GraderRoiRequest = {
  sessionId?: string;
  card?: {
    player?: string | null;
    year?: number | null;
    setName?: string | null;
    cardNumber?: string | null;
    parallel?: string | null;
    sport?: string | null;
    manufacturer?: string | null;
  };
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

export async function POST(req: Request) {
  try {
    const supabaseUserId = await getAuthenticatedSupabaseUserId();
    if (!supabaseUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await req.json()) as GraderRoiRequest;
    const sessionId = body.sessionId?.trim();
    const rawPrice = parseRawPrice(body.rawPrice);

    if (!sessionId) {
      return NextResponse.json({ error: 'Session id is required.' }, { status: 400 });
    }
    if (rawPrice == null) {
      return NextResponse.json({ error: 'Raw price is required.' }, { status: 400 });
    }
    if (!isFeeTier(body.feeTier)) {
      return NextResponse.json({ error: 'Fee tier is required.' }, { status: 400 });
    }

    const card = body.card ?? {};
    const eligibility = assessPricingEligibility({
      sport: card.sport?.trim() ?? null,
      player: card.player?.trim() ?? null,
      year: typeof card.year === 'number' && Number.isFinite(card.year) ? card.year : null,
      setName: card.setName?.trim() ?? null,
      cardNumber: card.cardNumber?.trim() ?? null,
      conditionType: 'raw',
    });

    if (!eligibility.ready) {
      return NextResponse.json(
        { error: eligibility.message, status: eligibility.status },
        { status: 422 }
      );
    }

    const supabase = createServiceClient();
    const { data: session, error } = await supabase
      .from('raw_grade_sessions')
      .select('id, user_id, card_id, predicted_grade, psa_prediction')
      .eq('id', sessionId)
      .eq('user_id', supabaseUserId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!session) {
      return NextResponse.json({ error: 'Grade session not found.' }, { status: 404 });
    }

    const psaPrediction =
      session.psa_prediction != null
        ? Number(session.psa_prediction)
        : session.predicted_grade != null
          ? Number(session.predicted_grade)
          : null;
    if (psaPrediction == null || !Number.isFinite(psaPrediction)) {
      return NextResponse.json(
        {
          error: 'A PSA prediction is required to calculate profitability.',
          status: 'missing_prediction',
        },
        { status: 422 }
      );
    }

    const resolved = await resolveCollectionCardToCardSight({
      collectionCardId: sessionId,
      cardId: (session.card_id as string | null) ?? null,
      player: card.player?.trim() ?? '',
      year: typeof card.year === 'number' && Number.isFinite(card.year) ? card.year : null,
      setName: card.setName?.trim() ?? null,
      cardNumber: card.cardNumber?.trim() ?? null,
      parallel: card.parallel?.trim() ?? null,
      manufacturer: card.manufacturer?.trim() ?? null,
      conditionType: 'raw',
      segment: eligibility.segment,
    });

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
