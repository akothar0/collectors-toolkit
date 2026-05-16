import { auth, currentUser } from '@clerk/nextjs/server';
import { getOrCreateUserId } from '@/lib/users';
import { createServiceClient } from '@/lib/supabase';
import { findOrCreateCard } from '@/lib/card-catalog';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

type ConfirmedItem = {
  itemId: string;
  player?: string | null;
  year?: number | null;
  setName?: string | null;
  cardNumber?: string | null;
  grade?: number | null;
  gradingCompany?: string | null;
  parallel?: string | null;
  purchasePrice?: number | null;
  purchaseDate?: string | null;
  cardId?: string | null;
};

export async function POST(req: Request, { params }: { params: Promise<{ batchId: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { batchId } = await params;
    const clerkUser = await currentUser();
    const email = clerkUser?.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress ?? null;
    const supabaseUserId = await getOrCreateUserId(userId, email);

    const supabase = createServiceClient();

    // Verify batch belongs to user
    const { data: batch, error: batchError } = await supabase
      .from('import_batches')
      .select('id, status')
      .eq('id', batchId)
      .eq('user_id', supabaseUserId)
      .single();

    if (batchError || !batch) {
      return NextResponse.json({ error: 'Import batch not found.' }, { status: 404 });
    }

    const body = (await req.json()) as { confirmedItems: ConfirmedItem[] };
    const confirmedItems = body.confirmedItems ?? [];

    if (confirmedItems.length === 0) {
      return NextResponse.json({ error: 'No items selected.' }, { status: 400 });
    }

    const collectionCardIds: string[] = [];

    for (const item of confirmedItems) {
      // Resolve card — use provided cardId or create/find from fields
      let resolvedCardId = item.cardId ?? null;

      if (!resolvedCardId && item.player) {
        try {
          const card = await findOrCreateCard({
            player: item.player,
            year: item.year ?? undefined,
            set_name: item.setName ?? undefined,
            card_number: item.cardNumber ?? undefined,
            parallel: item.parallel ?? null,
            source: 'import_parsed',
          });
          resolvedCardId = card.id;
        } catch (err) {
          console.error('Card catalog lookup failed for import item', { itemId: item.itemId, err });
        }
      }

      if (!resolvedCardId) {
        continue;
      }

      const hasGrade = item.grade != null && item.gradingCompany;
      const conditionType = hasGrade ? 'graded' : 'raw';

      const { data: collectionCard, error: insertError } = await supabase
        .from('collection_cards')
        .insert({
          user_id: supabaseUserId,
          card_id: resolvedCardId,
          import_item_id: item.itemId,
          override_player: item.player ?? null,
          override_year: item.year ?? null,
          override_set_name: item.setName ?? null,
          override_card_number: item.cardNumber ?? null,
          override_parallel: item.parallel ?? null,
          condition_type: conditionType,
          grade: conditionType === 'graded' ? item.grade : null,
          grading_company: conditionType === 'graded' ? item.gradingCompany : null,
          purchase_price: item.purchasePrice ?? null,
          purchase_date: item.purchaseDate ?? null,
          purchase_source: 'import',
          status: 'owned',
        })
        .select('id')
        .single();

      if (insertError || !collectionCard?.id) {
        console.error('Failed to insert collection card from import', { itemId: item.itemId, error: insertError?.message });
        continue;
      }

      collectionCardIds.push(collectionCard.id as string);

      // Mark import item as confirmed
      await supabase
        .from('import_items')
        .update({ review_status: 'confirmed', collection_card_id: collectionCard.id })
        .eq('id', item.itemId);
    }

    // Update batch totals
    await supabase
      .from('import_batches')
      .update({ status: 'saved', total_saved: collectionCardIds.length })
      .eq('id', batchId);

    return NextResponse.json({ savedCount: collectionCardIds.length, collectionCardIds });
  } catch (error) {
    console.error('Import save failed', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Save failed. Please try again.' },
      { status: 500 }
    );
  }
}
