import { auth, currentUser } from '@clerk/nextjs/server';
import {
  COLLECTION_LIST_LIMIT,
  type CollectionCardItem,
  parseCollectionSortBy,
  parseCollectionSortDir,
} from '@/lib/collection';
import { displayPlayer, displaySetName, displayYear } from '@/lib/collection-presenter';
import { findOrCreateCard } from '@/lib/card-catalog';
import { createServiceClient } from '@/lib/supabase';
import { getOrCreateUserId } from '@/lib/users';
import { NextResponse } from 'next/server';

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

function toBoolean(value: unknown) {
  if (typeof value === 'boolean') {
    return value;
  }
  if (value === 'true') return true;
  if (value === 'false') return false;
  return false;
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

type CollectionRow = {
  id: string;
  front_image_url: string | null;
  override_player: string | null;
  override_year: number | null;
  override_set_name: string | null;
  override_parallel: string | null;
  override_card_number: string | null;
  sport: string | null;
  condition_type: string;
  grade: number | null;
  grading_company: string | null;
  cert_number: string | null;
  purchase_price: number | null;
  purchase_date: string | null;
  current_value: number | null;
  created_at: string;
  cards: {
    player: string;
    year: number | null;
    set_name: string | null;
    card_number: string | null;
    parallel: string | null;
    sport: string | null;
  } | null;
};

function normalizeCardJoin(cards: CollectionRow['cards'] | CollectionRow['cards'][] | null | undefined) {
  if (!cards) {
    return null;
  }

  if (Array.isArray(cards)) {
    return cards[0] ?? null;
  }

  return cards;
}

function mapRowToItem(row: CollectionRow): CollectionCardItem {
  const card = normalizeCardJoin(row.cards as CollectionRow['cards'] | CollectionRow['cards'][]);
  return {
    id: row.id,
    frontImageUrl: row.front_image_url,
    player: row.override_player ?? card?.player ?? null,
    year: row.override_year ?? card?.year ?? null,
    setName: row.override_set_name ?? card?.set_name ?? null,
    parallel: row.override_parallel ?? card?.parallel ?? null,
    cardNumber: row.override_card_number ?? card?.card_number ?? null,
    sport: row.sport ?? card?.sport ?? null,
    conditionType: row.condition_type,
    grade: row.grade != null ? Number(row.grade) : null,
    gradingCompany: row.grading_company,
    certNumber: row.cert_number,
    purchasePrice: row.purchase_price != null ? Number(row.purchase_price) : null,
    purchaseDate: row.purchase_date,
    currentValue: row.current_value != null ? Number(row.current_value) : null,
    createdAt: row.created_at,
  };
}

function sortItems(items: CollectionCardItem[], sortBy: string, sortDir: 'asc' | 'desc') {
  const dir = sortDir === 'asc' ? 1 : -1;

  return [...items].sort((a, b) => {
    if (sortBy === 'player') {
      const left = displayPlayer(a).toLowerCase();
      const right = displayPlayer(b).toLowerCase();
      return left.localeCompare(right) * dir;
    }

    if (sortBy === 'grade') {
      const left = a.conditionType === 'graded' && a.grade != null ? a.grade : -1;
      const right = b.conditionType === 'graded' && b.grade != null ? b.grade : -1;
      return (left - right) * dir;
    }

    if (sortBy === 'value') {
      const left = a.currentValue ?? -1;
      const right = b.currentValue ?? -1;
      return (left - right) * dir;
    }

    return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;
  });
}

export async function GET(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const clerkUser = await currentUser();
  const email =
    clerkUser?.emailAddresses.find((item) => item.id === clerkUser.primaryEmailAddressId)?.emailAddress ??
    null;
  const supabaseUserId = await getOrCreateUserId(userId, email);

  const { searchParams } = new URL(req.url);
  const sport = searchParams.get('sport');
  const gradingCompany = searchParams.get('gradingCompany');
  const conditionType = searchParams.get('conditionType');
  const minGrade = toNumber(searchParams.get('minGrade'));
  const maxGrade = toNumber(searchParams.get('maxGrade'));
  const search = searchParams.get('search')?.trim() ?? '';
  const sortBy = parseCollectionSortBy(searchParams.get('sortBy'));
  const sortDir = parseCollectionSortDir(searchParams.get('sortDir'));

  const supabase = createServiceClient();
  let query = supabase
    .from('collection_cards')
    .select(
      `id, front_image_url, override_player, override_year, override_set_name, override_parallel, override_card_number,
       sport, condition_type, grade, grading_company, cert_number, purchase_price, purchase_date, current_value, created_at,
       cards ( player, year, set_name, card_number, parallel, sport )`
    )
    .eq('user_id', supabaseUserId)
    .eq('status', 'owned')
    .limit(COLLECTION_LIST_LIMIT);

  if (sport) {
    query = query.eq('sport', sport);
  }
  if (gradingCompany) {
    query = query.eq('grading_company', gradingCompany);
  }
  if (conditionType === 'raw' || conditionType === 'graded') {
    query = query.eq('condition_type', conditionType);
  }
  if (minGrade != null) {
    query = query.gte('grade', minGrade);
  }
  if (maxGrade != null) {
    query = query.lte('grade', maxGrade);
  }

  if (sortBy === 'created_at') {
    query = query.order('created_at', { ascending: sortDir === 'asc' });
  } else if (sortBy === 'grade') {
    query = query.order('grade', { ascending: sortDir === 'asc', nullsFirst: false });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let items = ((data ?? []) as unknown as CollectionRow[]).map(mapRowToItem);

  if (search) {
    const term = search.toLowerCase();
    items = items.filter((item) => {
      const player = displayPlayer(item).toLowerCase();
      const setName = (displaySetName(item) ?? '').toLowerCase();
      const year = displayYear(item);
      const yearText = year != null ? String(year) : '';
      return player.includes(term) || setName.includes(term) || yearText.includes(term);
    });
  }

  if (sortBy === 'player' || sortBy === 'value') {
    items = sortItems(items, sortBy, sortDir);
  } else if (sortBy === 'created_at' && sortDir === 'asc') {
    items = sortItems(items, 'created_at', 'asc');
  }

  return NextResponse.json({
    items,
    count: items.length,
  });
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
        is_rookie: toBoolean(body.isRookie),
        is_autograph: toBoolean(body.isAutograph),
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

  const frontImageUrl = firstText(body.frontImageUrl, body.imageUrl);
  const conditionType = toText(body.conditionType) ?? (body.grade || body.certNumber ? 'graded' : 'raw');

  const { data, error } = await supabase
    .from('collection_cards')
    .insert({
      user_id: supabaseUserId,
      card_id: resolvedCardId,
      scan_id: scanId,
      grade_session_id: gradeSessionId,
      import_item_id: importItemId,
      front_image_url: frontImageUrl,
      back_image_url: toText(body.backImageUrl),
      override_player: firstText(body.cardPlayer, body.player),
      override_year: toInteger(body.cardYear ?? body.year),
      override_set_name: firstText(body.cardSet, body.setName),
      override_parallel: firstText(body.cardParallel, body.parallel),
      override_card_number: firstText(body.cardCardNumber, body.cardNumber),
      sport: toText(body.sport),
      condition_type: conditionType,
      grade: conditionType === 'graded' ? toNumber(body.grade) : null,
      grade_description: toText(body.gradeDescription),
      qualifier_code: toText(body.qualifierCode),
      grading_company: conditionType === 'graded' ? toText(body.gradingCompany) : null,
      cert_number: toText(body.certNumber),
      autograph_grade: toNumber(body.autographGrade),
      sub_grades: toSubGrades(body.subGrades),
      pop_at_grade: toInteger(body.popAtGrade),
      pop_higher: toInteger(body.popHigher),
      notes: toText(body.notes),
      purchase_price: toNumber(body.purchasePrice),
      purchase_date: toText(body.purchaseDate),
      purchase_source: toText(body.purchaseSource),
      purchase_url: toText(body.purchaseUrl),
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
