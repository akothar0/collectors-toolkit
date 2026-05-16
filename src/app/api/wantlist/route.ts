import { toInteger, toNumber, toText } from '@/lib/collection-body';
import { getAuthenticatedSupabaseUserId } from '@/lib/collection-auth';
import type { WantListItem } from '@/lib/wantlist';
import { createServiceClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';

function mapWantListRow(row: Record<string, unknown>): WantListItem {
  return {
    id: row.id as string,
    description: row.description as string,
    player: (row.player as string | null) ?? null,
    year: row.year != null ? Number(row.year) : null,
    setName: (row.set_name as string | null) ?? null,
    parallel: (row.parallel as string | null) ?? null,
    targetGrade: row.target_grade_min != null ? Number(row.target_grade_min) : null,
    targetPrice: row.target_price != null ? Number(row.target_price) : null,
    notes: (row.notes as string | null) ?? null,
    status: row.status as string,
    fulfilledAt: (row.fulfilled_at as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}

export async function GET() {
  const supabaseUserId = await getAuthenticatedSupabaseUserId();
  if (!supabaseUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('want_list')
    .select('*')
    .eq('user_id', supabaseUserId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const items = (data ?? []).map((row) => mapWantListRow(row as Record<string, unknown>));

  return NextResponse.json({ items, count: items.length });
}

export async function POST(req: Request) {
  const supabaseUserId = await getAuthenticatedSupabaseUserId();
  if (!supabaseUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json()) as Record<string, unknown>;
  const description = toText(body.description);

  if (!description) {
    return NextResponse.json({ error: 'Description is required.' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('want_list')
    .insert({
      user_id: supabaseUserId,
      description,
      player: toText(body.player),
      year: toInteger(body.year),
      set_name: toText(body.setName),
      parallel: toText(body.parallel),
      target_grade_min: toNumber(body.targetGrade ?? body.target_grade),
      target_price: toNumber(body.targetPrice),
      notes: toText(body.notes),
      status: 'active',
    })
    .select('*')
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? 'Unable to add want list item.' },
      { status: 500 }
    );
  }

  return NextResponse.json(mapWantListRow(data as Record<string, unknown>));
}
