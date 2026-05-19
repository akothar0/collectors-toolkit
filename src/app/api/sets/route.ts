import { auth, currentUser } from '@clerk/nextjs/server';
import { setPercent, type SetListItem } from '@/lib/sets';
import { createServiceClient } from '@/lib/supabase';
import { getOrCreateUserId } from '@/lib/users';
import { NextResponse } from 'next/server';

function toInteger(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses[0]?.emailAddress ?? null;
  const supabaseUserId = await getOrCreateUserId(userId, email);
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('collection_set_progress')
    .select(
      `cards_owned_count, card_sets ( id, name, year, sport, total_cards )`
    )
    .eq('user_id', supabaseUserId)
    .order('updated_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const sets: SetListItem[] = (data ?? [])
    .map((row) => {
      const set = Array.isArray(row.card_sets) ? row.card_sets[0] : row.card_sets;
      if (!set || set.total_cards == null) return null;
      const totalCards = Number(set.total_cards);
      const cardsOwned = row.cards_owned_count ?? 0;
      return {
        id: set.id as string,
        name: set.name as string,
        year: set.year != null ? Number(set.year) : null,
        sport: (set.sport as string | null) ?? null,
        totalCards,
        cardsOwned,
        percent: setPercent(cardsOwned, totalCards),
      };
    })
    .filter((item): item is SetListItem => item != null);

  return NextResponse.json({ sets });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json()) as Record<string, unknown>;
  const name = toText(body.name);
  const sport = toText(body.sport);
  const year = toInteger(body.year);
  const totalCards = toInteger(body.totalCards);

  if (!name) {
    return NextResponse.json({ error: 'Set name is required.' }, { status: 400 });
  }
  if (totalCards == null || totalCards < 1) {
    return NextResponse.json({ error: 'Total cards must be at least 1.' }, { status: 400 });
  }

  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses[0]?.emailAddress ?? null;
  const supabaseUserId = await getOrCreateUserId(userId, email);
  const supabase = createServiceClient();

  const { data: setRow, error: setError } = await supabase
    .from('card_sets')
    .insert({
      name,
      year,
      sport,
      total_cards: totalCards,
      created_by: supabaseUserId,
    })
    .select('id, name, year, sport, total_cards')
    .single();

  if (setError || !setRow) {
    return NextResponse.json({ error: setError?.message ?? 'Unable to create set.' }, { status: 500 });
  }

  const { error: progressError } = await supabase.from('collection_set_progress').insert({
    user_id: supabaseUserId,
    set_id: setRow.id,
    cards_owned_count: 0,
    card_checklist: {},
  });

  if (progressError) {
    return NextResponse.json({ error: progressError.message }, { status: 500 });
  }

  return NextResponse.json({
    id: setRow.id,
    name: setRow.name,
    year: setRow.year,
    sport: setRow.sport,
    totalCards: setRow.total_cards,
    cardsOwned: 0,
    percent: 0,
  });
}
