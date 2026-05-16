import { auth, currentUser } from '@clerk/nextjs/server';
import { getOrCreateUserId } from '@/lib/users';
import { createServiceClient } from '@/lib/supabase';
import type { ImportBatch, ImportBatchItem } from '@/lib/import/types';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: Promise<{ batchId: string }> }) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { batchId } = await params;
  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress ?? null;
  const supabaseUserId = await getOrCreateUserId(userId, email);

  const supabase = createServiceClient();

  const { data: batch, error: batchError } = await supabase
    .from('import_batches')
    .select('*')
    .eq('id', batchId)
    .eq('user_id', supabaseUserId)
    .single();

  if (batchError || !batch) {
    return NextResponse.json({ error: 'Import batch not found.' }, { status: 404 });
  }

  const { data: items, error: itemsError } = await supabase
    .from('import_items')
    .select('*')
    .eq('batch_id', batchId)
    .order('created_at', { ascending: true });

  if (itemsError) {
    return NextResponse.json({ error: 'Failed to load import items.' }, { status: 500 });
  }

  const mappedItems: ImportBatchItem[] = (items ?? []).map((row) => ({
    id: row.id as string,
    rawTitle: (row.raw_title as string) ?? '',
    rawPrice: row.raw_price != null ? Number(row.raw_price) : null,
    rawDate: (row.raw_date as string | null) ?? null,
    rawSource: (row.raw_source as string) ?? '',
    parsedPlayer: (row.parsed_player as string | null) ?? null,
    parsedYear: row.parsed_year != null ? Number(row.parsed_year) : null,
    parsedSet: (row.parsed_set as string | null) ?? null,
    parsedCardNumber: null,
    parsedGrade: row.parsed_grade != null ? Number(row.parsed_grade) : null,
    parsedCompany: (row.parsed_company as 'PSA' | 'BGS' | 'SGC' | null) ?? null,
    parsedParallel: (row.parsed_parallel as string | null) ?? null,
    parsedSerialNumber: null,
    parsedPrintRun: null,
    isRookie: false,
    isAutograph: false,
    parseConfidence: ((row.parse_confidence as string) ?? 'low') as 'high' | 'medium' | 'low',
    cardId: (row.card_id as string | null) ?? null,
    reviewStatus: ((row.review_status as string) ?? 'pending') as 'pending' | 'confirmed' | 'skipped' | 'edited',
    collectionCardId: (row.collection_card_id as string | null) ?? null,
  }));

  const result: ImportBatch = {
    id: batch.id as string,
    source: (batch.source as string) ?? '',
    status: (batch.status as string) ?? 'pending',
    totalParsed: Number(batch.total_parsed ?? 0),
    totalMatched: Number(batch.total_matched ?? 0),
    totalSaved: Number(batch.total_saved ?? 0),
    createdAt: batch.created_at as string,
    items: mappedItems,
  };

  return NextResponse.json(result);
}
