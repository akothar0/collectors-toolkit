import { auth, currentUser } from '@clerk/nextjs/server';
import { countOwned, setPercent, type SetProgressDetail } from '@/lib/sets';
import { createServiceClient } from '@/lib/supabase';
import { getOrCreateUserId } from '@/lib/users';
import { NextResponse } from 'next/server';

type RouteContext = { params: Promise<{ setId: string }> };

async function getProgressForUser(setId: string, supabaseUserId: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('collection_set_progress')
    .select(
      `cards_owned_count, card_checklist, card_sets ( id, name, year, sport, total_cards, created_by )`
    )
    .eq('user_id', supabaseUserId)
    .eq('set_id', setId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const set = Array.isArray(data.card_sets) ? data.card_sets[0] : data.card_sets;
  if (!set) {
    return null;
  }

  const checklist = (data.card_checklist as Record<string, boolean>) ?? {};
  const totalCards = Number(set.total_cards ?? 0);
  const cardsOwned = data.cards_owned_count ?? countOwned(checklist);

  const detail: SetProgressDetail = {
    set: {
      id: set.id as string,
      name: set.name as string,
      year: set.year != null ? Number(set.year) : null,
      sport: (set.sport as string | null) ?? null,
      totalCards,
    },
    cardsOwned,
    cardChecklist: checklist,
  };

  return { detail, createdBy: set.created_by as string | null };
}

export async function GET(_req: Request, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { setId } = await context.params;
  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses[0]?.emailAddress ?? null;
  const supabaseUserId = await getOrCreateUserId(userId, email);

  try {
    const result = await getProgressForUser(setId, supabaseUserId);
    if (!result) {
      return NextResponse.json({ error: 'Set not found.' }, { status: 404 });
    }
    return NextResponse.json({
      ...result.detail,
      percent: setPercent(result.detail.cardsOwned, result.detail.set.totalCards),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load set.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: Request, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { setId } = await context.params;
  const body = (await req.json()) as { cardNumber?: string; owned?: boolean };
  const cardNumber = typeof body.cardNumber === 'string' ? body.cardNumber.trim() : '';
  const owned = Boolean(body.owned);

  if (!cardNumber) {
    return NextResponse.json({ error: 'cardNumber is required.' }, { status: 400 });
  }

  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses[0]?.emailAddress ?? null;
  const supabaseUserId = await getOrCreateUserId(userId, email);
  const supabase = createServiceClient();

  try {
    const existing = await getProgressForUser(setId, supabaseUserId);
    if (!existing) {
      return NextResponse.json({ error: 'Set not found.' }, { status: 404 });
    }

    const checklist = { ...existing.detail.cardChecklist };
    if (owned) {
      checklist[cardNumber] = true;
    } else {
      delete checklist[cardNumber];
    }

    const cardsOwned = countOwned(checklist);
    const { error } = await supabase
      .from('collection_set_progress')
      .update({
        card_checklist: checklist,
        cards_owned_count: cardsOwned,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', supabaseUserId)
      .eq('set_id', setId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ...existing.detail,
      cardsOwned,
      cardChecklist: checklist,
      percent: setPercent(cardsOwned, existing.detail.set.totalCards),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update set.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
