import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { findOrCreateCard } from '@/lib/card-catalog';
import { createServiceClient } from '@/lib/supabase';

async function getOrCreateUserId(clerkId: string, email: string | null) {
  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_id', clerkId)
    .maybeSingle();

  if (existing?.id) {
    return existing.id as string;
  }

  const { data: inserted, error } = await supabase
    .from('users')
    .insert({
      clerk_id: clerkId,
      email,
    })
    .select('id')
    .single();

  if (error || !inserted?.id) {
    throw new Error(`Unable to create user record: ${error?.message ?? 'unknown error'}`);
  }

  return inserted.id as string;
}

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

  let resolvedCardId = cardId;

  if (!resolvedCardId) {
    const card = await findOrCreateCard({
      player: toText(body.player) ?? '',
      year: toInteger(body.year) ?? undefined,
      manufacturer: toText(body.manufacturer) ?? undefined,
      sport: toText(body.sport) ?? undefined,
      set_name: toText(body.setName) ?? undefined,
      card_number: toText(body.cardNumber) ?? undefined,
      parallel: toText(body.parallel),
      psa_spec_id: toText(body.psaSpecId) ?? undefined,
      source: 'manual_collection',
      source_id: toText(body.sourceId) ?? undefined,
    });

    resolvedCardId = card.id;
  }

  if (!resolvedCardId) {
    return NextResponse.json({ error: 'A card could not be resolved for this collection entry.' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('collection_cards')
    .insert({
      user_id: supabaseUserId,
      card_id: resolvedCardId,
      scan_id: scanId,
      front_image_url: toText(body.imageUrl),
      override_player: toText(body.player),
      override_year: toInteger(body.year),
      override_set_name: toText(body.setName),
      override_parallel: toText(body.parallel),
      override_card_number: toText(body.cardNumber),
      sport: toText(body.sport),
      condition_type: toText(body.conditionType) ?? (body.grade || body.certNumber ? 'graded' : 'raw'),
      grade: toNumber(body.grade),
      grade_description: toText(body.gradeDescription),
      qualifier_code: toText(body.qualifierCode),
      grading_company: toText(body.gradingCompany),
      cert_number: toText(body.certNumber),
      autograph_grade: toNumber(body.autographGrade),
      pop_at_grade: toInteger(body.popAtGrade),
      pop_higher: toInteger(body.popHigher),
      notes: toText(body.notes),
      purchase_price: toNumber(body.purchasePrice),
      purchase_date: toText(body.purchaseDate),
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
  });
}

