import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { findOrCreateCard } from '@/lib/card-catalog';
import { createServiceClient } from '@/lib/supabase';
import { getOrCreateUserId } from '@/lib/users';

function toNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function toInteger(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function toText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    const text = toText(value);
    if (text) {
      return text;
    }
  }

  return null;
}

function toSubGrades(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const subGrades = {
    centering: toNumber(record.centering) ?? undefined,
    corners: toNumber(record.corners) ?? undefined,
    edges: toNumber(record.edges) ?? undefined,
    surface: toNumber(record.surface) ?? undefined,
  };

  if (Object.values(subGrades).every((item) => item === undefined)) {
    return null;
  }

  return subGrades;
}

export async function POST(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses.find((item) => item.id === clerkUser.primaryEmailAddressId)?.emailAddress ?? null;
  const supabaseUserId = await getOrCreateUserId(userId, email);

  const body = (await req.json()) as Record<string, unknown>;

  const cardId = toText(body.cardId);
  const scanId = toText(body.scanId);
  const gradeSessionId = toText(body.gradeSessionId);
  const importItemId = toText(body.importItemId);

  const supabase = createServiceClient();

  if (scanId) {
    const { data: existing } = await supabase
      .from('collection_cards')
      .select('id')
      .eq('scan_id', scanId)
      .maybeSingle();

    if (existing?.id) {
      return NextResponse.json({
        collectionCardId: existing.id as string,
        alreadySaved: true,
      });
    }
  }

  let resolvedCardId = cardId;

  if (!resolvedCardId) {
    const player = firstText(body.cardPlayer, body.player);
    const year = toInteger(body.cardYear ?? body.year);

    if (player) {
      const card = await findOrCreateCard({
        player,
        year: year ?? undefined,
        manufacturer: firstText(body.manufacturer) ?? undefined,
        sport: firstText(body.sport) ?? undefined,
        set_name: firstText(body.cardSet, body.setName) ?? undefined,
        card_number: firstText(body.cardCardNumber, body.cardNumber) ?? undefined,
        parallel: firstText(body.cardParallel, body.parallel),
        psa_spec_id: firstText(body.psaSpecId) ?? undefined,
        source: 'manual_collection',
        source_id: toText(body.sourceId) ?? undefined,
      });

      resolvedCardId = card.id;
    }
  }

  if (!resolvedCardId) {
    return NextResponse.json({ error: 'A card could not be resolved for this collection entry.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('collection_cards')
    .insert({
      user_id: supabaseUserId,
      card_id: resolvedCardId,
      scan_id: scanId,
      grade_session_id: gradeSessionId,
      import_item_id: importItemId,
      front_image_url: toText(body.imageUrl),
      override_player: firstText(body.cardPlayer, body.player),
      override_year: toInteger(body.cardYear ?? body.year),
      override_set_name: firstText(body.cardSet, body.setName),
      override_parallel: firstText(body.cardParallel, body.parallel),
      override_card_number: firstText(body.cardCardNumber, body.cardNumber),
      sport: toText(body.sport),
      condition_type: toText(body.conditionType) ?? (body.grade || body.certNumber ? 'graded' : 'raw'),
      grade: toNumber(body.grade),
      grade_description: toText(body.gradeDescription),
      qualifier_code: toText(body.qualifierCode),
      grading_company: toText(body.gradingCompany),
      cert_number: toText(body.certNumber),
      autograph_grade: toNumber(body.autographGrade),
      sub_grades: toSubGrades(body.subGrades),
      pop_at_grade: toInteger(body.popAtGrade),
      pop_higher: toInteger(body.popHigher),
      notes: toText(body.notes),
      purchase_price: toNumber(body.purchasePrice),
      purchase_date: toText(body.purchaseDate),
      purchase_source: toText(body.purchaseSource),
    })
    .select('id')
    .single();

  if (error || !data?.id) {
    return NextResponse.json(
      { error: `Unable to save collection entry: ${error?.message ?? 'unknown error'}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    collectionCardId: data.id as string,
    alreadySaved: false,
  });
}
