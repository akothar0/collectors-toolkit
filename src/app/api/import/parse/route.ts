import { auth, currentUser } from '@clerk/nextjs/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { getOrCreateUserId } from '@/lib/users';
import { createServiceClient } from '@/lib/supabase';
import { parseEbayScreenshot } from '@/lib/import/parse-ebay-screenshot';
import { parseFanaticsPDF } from '@/lib/import/parse-fanatics-pdf';
import { parseImportText } from '@/lib/import/parse-text';
import { normalizeImportItems } from '@/lib/import/normalize';
import type { NormalizedImportItem, ParsedImportItem } from '@/lib/import/types';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 120;

const IMPORT_LIMIT = 5;

async function uploadImportFile(userId: string, file: File): Promise<string> {
  const supabase = createServiceClient();
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin';
  const path = `${userId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const bytes = await file.arrayBuffer();

  await supabase.storage.from('import-files').upload(path, bytes, {
    contentType: file.type || 'application/octet-stream',
    upsert: false,
  });

  const { data } = supabase.storage.from('import-files').getPublicUrl(path);
  return data.publicUrl;
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clerkUser = await currentUser();
    const email = clerkUser?.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress ?? null;
    const supabaseUserId = await getOrCreateUserId(userId, email);

    const allowed = await checkRateLimit(supabaseUserId, 'import', IMPORT_LIMIT);
    if (!allowed) {
      return NextResponse.json({ error: 'Daily import limit reached. Try again tomorrow.' }, { status: 429 });
    }

    const formData = await req.formData();
    const source = String(formData.get('source') ?? '');

    let parsed: ParsedImportItem[] = [];
    let fileUrl: string | null = null;

    if (source === 'ebay_screenshot') {
      const files = formData.getAll('files') as File[];
      if (files.length === 0) {
        return NextResponse.json({ error: 'No screenshot files provided.' }, { status: 400 });
      }

      for (const file of files) {
        const url = await uploadImportFile(supabaseUserId, file);
        if (!fileUrl) fileUrl = url;
        const items = await parseEbayScreenshot(url);
        parsed.push(...items);
      }
    } else if (source === 'fanatics_pdf') {
      const files = formData.getAll('files') as File[];
      if (files.length === 0) {
        return NextResponse.json({ error: 'No PDF files provided.' }, { status: 400 });
      }

      for (const file of files) {
        const buf = Buffer.from(await file.arrayBuffer());
        const items = await parseFanaticsPDF(buf);
        parsed.push(...items);
      }
    } else if (source === 'ebay_bookmarklet') {
      const raw = String(formData.get('bookmarkletData') ?? '');
      if (!raw) {
        return NextResponse.json({ error: 'No bookmarklet data provided.' }, { status: 400 });
      }

      type BookmarkletRow = { title?: unknown; price?: unknown; date?: unknown };
      // raw is base64-encoded JSON from the bookmarklet — decode before parsing
      const rows = JSON.parse(Buffer.from(raw, 'base64').toString('utf-8')) as BookmarkletRow[];
      parsed = rows
        .map((r) => ({
          rawTitle: typeof r.title === 'string' ? r.title.trim() : '',
          rawPrice: typeof r.price === 'string' && r.price ? Number.parseFloat(r.price.replace(/[^0-9.]/g, '')) || null : null,
          rawDate: typeof r.date === 'string' && r.date ? r.date : null,
          rawSource: 'eBay',
        }))
        .filter((item) => item.rawTitle.length > 0);
    } else if (source === 'paste') {
      const text = String(formData.get('text') ?? '');
      if (!text.trim()) {
        return NextResponse.json({ error: 'No text provided.' }, { status: 400 });
      }
      parsed = await parseImportText(text);
    } else {
      return NextResponse.json({ error: 'Invalid source.' }, { status: 400 });
    }

    if (parsed.length === 0) {
      return NextResponse.json({ error: 'No card purchases found in the provided data.' }, { status: 422 });
    }

    const normalized = await normalizeImportItems(parsed);
    const totalMatched = normalized.filter((item) => item.cardId !== null).length;

    const supabase = createServiceClient();

    // Create batch record
    const { data: batch, error: batchError } = await supabase
      .from('import_batches')
      .insert({
        user_id: supabaseUserId,
        source,
        file_url: fileUrl,
        total_parsed: normalized.length,
        total_matched: totalMatched,
        status: 'pending',
      })
      .select('id')
      .single();

    if (batchError || !batch?.id) {
      throw new Error(`Failed to create import batch: ${batchError?.message}`);
    }

    const batchId = batch.id as string;

    // Insert items
    const itemRows = normalized.map((item) => ({
      batch_id: batchId,
      user_id: supabaseUserId,
      raw_title: item.rawTitle,
      raw_price: item.rawPrice,
      raw_date: item.rawDate ? new Date(item.rawDate).toISOString().slice(0, 10) : null,
      raw_source: item.rawSource,
      parsed_player: item.parsedPlayer,
      parsed_year: item.parsedYear,
      parsed_set: item.parsedSet,
      parsed_grade: item.parsedGrade,
      parsed_company: item.parsedCompany,
      parsed_parallel: item.parsedParallel,
      parse_confidence: item.parseConfidence,
      card_id: item.cardId,
      review_status: 'pending',
    }));

    const { error: itemsError } = await supabase.from('import_items').insert(itemRows);

    if (itemsError) {
      throw new Error(`Failed to insert import items: ${itemsError.message}`);
    }

    return NextResponse.json({ batchId, totalParsed: normalized.length, totalMatched });
  } catch (error) {
    console.error('Import parse failed', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Import failed. Please try again.' },
      { status: 500 }
    );
  }
}
