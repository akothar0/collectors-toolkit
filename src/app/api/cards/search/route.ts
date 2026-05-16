import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q')?.trim() ?? '';

  if (query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('cards')
    .select('id, player, year, set_name')
    .ilike('player', `%${query}%`)
    .order('player', { ascending: true })
    .limit(10);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    results: (data ?? []).map((row) => ({
      id: row.id as string,
      player: row.player as string,
      year: (row.year as number | null) ?? null,
      set_name: (row.set_name as string | null) ?? null,
    })),
  });
}
