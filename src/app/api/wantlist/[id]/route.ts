import { toInteger, toNumber, toText } from '@/lib/collection-body';
import { getAuthenticatedSupabaseUserId } from '@/lib/collection-auth';
import type { WantListItem } from '@/lib/wantlist';
import { createServiceClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';

type RouteContext = {
  params: Promise<{ id: string }>;
};

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

export async function PUT(req: Request, context: RouteContext) {
  const supabaseUserId = await getAuthenticatedSupabaseUserId();
  if (!supabaseUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await req.json()) as Record<string, unknown>;
  const supabase = createServiceClient();

  const updates: Record<string, unknown> = {};

  if ('description' in body) updates.description = toText(body.description);
  if ('player' in body) updates.player = toText(body.player);
  if ('year' in body) updates.year = toInteger(body.year);
  if ('setName' in body) updates.set_name = toText(body.setName);
  if ('parallel' in body) updates.parallel = toText(body.parallel);
  if ('targetGrade' in body) updates.target_grade_min = toNumber(body.targetGrade);
  if ('targetPrice' in body) updates.target_price = toNumber(body.targetPrice);
  if ('notes' in body) updates.notes = toText(body.notes);

  if (body.fulfilled === true) {
    updates.status = 'fulfilled';
    updates.fulfilled_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('want_list')
    .update(updates)
    .eq('id', id)
    .eq('user_id', supabaseUserId)
    .select('*')
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? 'Unable to update want list item.' },
      { status: 404 }
    );
  }

  return NextResponse.json(mapWantListRow(data as Record<string, unknown>));
}

export async function DELETE(_req: Request, context: RouteContext) {
  const supabaseUserId = await getAuthenticatedSupabaseUserId();
  if (!supabaseUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const supabase = createServiceClient();

  const { error } = await supabase
    .from('want_list')
    .delete()
    .eq('id', id)
    .eq('user_id', supabaseUserId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
