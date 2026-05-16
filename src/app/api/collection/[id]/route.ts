import { findOrCreateCard } from '@/lib/card-catalog';
import {
  firstText,
  toBoolean,
  toInteger,
  toNumber,
  toSubGrades,
  toText,
} from '@/lib/collection-body';
import {
  COLLECTION_CARD_DETAIL_SELECT,
  mapCollectionDetailRow,
} from '@/lib/collection-detail';
import { getAuthenticatedSupabaseUserId } from '@/lib/collection-auth';
import { createServiceClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function getOwnedCard(id: string, supabaseUserId: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('collection_cards')
    .select(COLLECTION_CARD_DETAIL_SELECT)
    .eq('id', id)
    .eq('user_id', supabaseUserId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function GET(_req: Request, context: RouteContext) {
  const supabaseUserId = await getAuthenticatedSupabaseUserId();
  if (!supabaseUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const row = await getOwnedCard(id, supabaseUserId);
    if (!row) {
      return NextResponse.json({ error: 'Card not found.' }, { status: 404 });
    }
    return NextResponse.json(mapCollectionDetailRow(row as Record<string, unknown>));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to load card.' },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request, context: RouteContext) {
  const supabaseUserId = await getAuthenticatedSupabaseUserId();
  if (!supabaseUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const existing = await getOwnedCard(id, supabaseUserId);
    if (!existing) {
      return NextResponse.json({ error: 'Card not found.' }, { status: 404 });
    }

    const body = (await req.json()) as Record<string, unknown>;
    const supabase = createServiceClient();
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (
      'player' in body ||
      'cardPlayer' in body ||
      'year' in body ||
      'cardYear' in body ||
      'setName' in body ||
      'cardSet' in body
    ) {
      const player = firstText(body.player, body.cardPlayer);
      const year = toInteger(body.year ?? body.cardYear);

      if (player) {
        const card = await findOrCreateCard({
          player,
          year: year ?? undefined,
          sport: firstText(body.sport) ?? undefined,
          set_name: firstText(body.setName, body.cardSet) ?? undefined,
          card_number: firstText(body.cardNumber, body.cardCardNumber) ?? undefined,
          parallel: firstText(body.parallel, body.cardParallel),
          is_rookie: 'isRookie' in body ? toBoolean(body.isRookie) : undefined,
          is_autograph: 'isAutograph' in body ? toBoolean(body.isAutograph) : undefined,
          source: 'manual_collection',
        });
        updates.card_id = card.id;
      }

      if ('player' in body || 'cardPlayer' in body) {
        updates.override_player = firstText(body.player, body.cardPlayer);
      }
      if ('year' in body || 'cardYear' in body) {
        updates.override_year = toInteger(body.year ?? body.cardYear);
      }
      if ('setName' in body || 'cardSet' in body) {
        updates.override_set_name = firstText(body.setName, body.cardSet);
      }
      if ('parallel' in body || 'cardParallel' in body) {
        updates.override_parallel = firstText(body.parallel, body.cardParallel);
      }
      if ('cardNumber' in body || 'cardCardNumber' in body) {
        updates.override_card_number = firstText(body.cardNumber, body.cardCardNumber);
      }
    }

    if ('sport' in body) updates.sport = toText(body.sport);
    if ('frontImageUrl' in body || 'imageUrl' in body) {
      updates.front_image_url = firstText(body.frontImageUrl, body.imageUrl);
    }
    if ('backImageUrl' in body) updates.back_image_url = toText(body.backImageUrl);
    if ('notes' in body) updates.notes = toText(body.notes);
    if ('purchasePrice' in body) updates.purchase_price = toNumber(body.purchasePrice);
    if ('purchaseDate' in body) updates.purchase_date = toText(body.purchaseDate);
    if ('purchaseSource' in body) updates.purchase_source = toText(body.purchaseSource);
    if ('purchaseUrl' in body) updates.purchase_url = toText(body.purchaseUrl);
    if ('certNumber' in body) updates.cert_number = toText(body.certNumber);
    if ('gradeDescription' in body) updates.grade_description = toText(body.gradeDescription);
    if ('qualifierCode' in body) updates.qualifier_code = toText(body.qualifierCode);
    if ('autographGrade' in body) updates.autograph_grade = toNumber(body.autographGrade);
    if ('subGrades' in body) updates.sub_grades = toSubGrades(body.subGrades);

    if ('currentValue' in body) {
      updates.current_value = toNumber(body.currentValue);
      updates.value_updated_at = new Date().toISOString();
      updates.value_source = 'manual';
    }

    if ('conditionType' in body) {
      const conditionType = toText(body.conditionType) ?? 'raw';
      updates.condition_type = conditionType;
      if (conditionType === 'raw') {
        updates.grade = null;
        updates.grading_company = null;
      }
    }

    if ('gradingCompany' in body) updates.grading_company = toText(body.gradingCompany);
    if ('grade' in body) updates.grade = toNumber(body.grade);

    const { data, error } = await supabase
      .from('collection_cards')
      .update(updates)
      .eq('id', id)
      .eq('user_id', supabaseUserId)
      .select(COLLECTION_CARD_DETAIL_SELECT)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? 'Unable to update card.' },
        { status: 500 }
      );
    }

    return NextResponse.json(mapCollectionDetailRow(data as Record<string, unknown>));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to update card.' },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  const supabaseUserId = await getAuthenticatedSupabaseUserId();
  if (!supabaseUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const supabase = createServiceClient();

  const { error } = await supabase
    .from('collection_cards')
    .delete()
    .eq('id', id)
    .eq('user_id', supabaseUserId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
