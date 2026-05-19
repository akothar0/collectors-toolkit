import { auth, currentUser } from '@clerk/nextjs/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { getOrCreateUserId } from '@/lib/users';
import { createServiceClient } from '@/lib/supabase';
import { bookmarkletRowsToParsedItems, parseBookmarkletPayload } from '@/lib/import/bookmarklet';
import {
  assertParsedRowCount,
  capParsedRows,
  IMPORT_MAX_PASTE_CHARS,
  validateImportFiles,
} from '@/lib/import/limits';
import { parseEbayScreenshot } from '@/lib/import/parse-ebay-screenshot';
import { parseFanaticsPDF } from '@/lib/import/parse-fanatics-pdf';
import { parseImportText } from '@/lib/import/parse-text';
import { uploadImportFileSigned } from '@/lib/import/storage';
import { normalizeImportItems } from '@/lib/import/normalize';
import type { ParsedImportItem } from '@/lib/import/types';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 120;

const IMPORT_LIMIT = 5;

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    // #region agent log
    fetch('http://127.0.0.1:7274/ingest/c0a1f3a8-8163-44c5-9171-6cc76856d3a3',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'63689e'},body:JSON.stringify({sessionId:'63689e',location:'parse/route.ts:POST-entry',message:'import parse entry',data:{hasUserId:Boolean(userId)},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clerkUser = await currentUser();
    const email = clerkUser?.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress ?? null;
    const supabaseUserId = await getOrCreateUserId(userId, email);

    const allowed = await checkRateLimit(supabaseUserId, 'import', IMPORT_LIMIT);
    // #region agent log
    fetch('http://127.0.0.1:7274/ingest/c0a1f3a8-8163-44c5-9171-6cc76856d3a3',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'63689e'},body:JSON.stringify({sessionId:'63689e',location:'parse/route.ts:rate-limit',message:'rate limit result',data:{allowed},timestamp:Date.now(),hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    if (!allowed) {
      return NextResponse.json({ error: 'Daily import limit reached. Try again tomorrow.' }, { status: 429 });
    }

    const formData = await req.formData();
    const source = String(formData.get('source') ?? '');
    // #region agent log
    fetch('http://127.0.0.1:7274/ingest/c0a1f3a8-8163-44c5-9171-6cc76856d3a3',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'63689e'},body:JSON.stringify({sessionId:'63689e',location:'parse/route.ts:source',message:'import source',data:{source},timestamp:Date.now(),hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    let parsed: ParsedImportItem[] = [];
    let fileUrl: string | null = null;

    if (source === 'ebay_screenshot') {
      const files = formData.getAll('files').filter((f): f is File => f instanceof File);
      const validation = validateImportFiles(files, 'ebay_screenshot');
      if (!validation.ok) {
        return NextResponse.json({ error: validation.message }, { status: validation.status });
      }

      for (const file of files) {
        let url: string;
        try {
          url = await uploadImportFileSigned(supabaseUserId, file);
        } catch (uploadErr) {
          // #region agent log
          fetch('http://127.0.0.1:7274/ingest/c0a1f3a8-8163-44c5-9171-6cc76856d3a3',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'63689e'},body:JSON.stringify({sessionId:'63689e',location:'parse/route.ts:upload-fail',message:'storage upload failed',data:{error:uploadErr instanceof Error?uploadErr.message:String(uploadErr)},timestamp:Date.now(),hypothesisId:'C'})}).catch(()=>{});
          // #endregion
          throw uploadErr;
        }
        if (!fileUrl) fileUrl = url;
        const items = await parseEbayScreenshot(file);
        parsed.push(...items);
      }
    } else if (source === 'fanatics_pdf') {
      const files = formData.getAll('files').filter((f): f is File => f instanceof File);
      const validation = validateImportFiles(files, 'fanatics_pdf');
      if (!validation.ok) {
        return NextResponse.json({ error: validation.message }, { status: validation.status });
      }

      for (const file of files) {
        const buf = Buffer.from(await file.arrayBuffer());
        const items = await parseFanaticsPDF(buf);
        parsed.push(...items);
      }
    } else if (source === 'ebay_bookmarklet') {
      const raw = String(formData.get('bookmarkletData') ?? '');
      if (!raw.trim()) {
        return NextResponse.json({ error: 'No bookmarklet data provided.' }, { status: 400 });
      }

      try {
        const rows = parseBookmarkletPayload(raw);
        parsed = bookmarkletRowsToParsedItems(rows);
      } catch {
        return NextResponse.json({ error: 'Invalid bookmarklet data.' }, { status: 400 });
      }
    } else if (source === 'paste') {
      const text = String(formData.get('text') ?? '');
      if (!text.trim()) {
        return NextResponse.json({ error: 'No text provided.' }, { status: 400 });
      }
      if (text.length > IMPORT_MAX_PASTE_CHARS) {
        return NextResponse.json(
          { error: `Text is too long. Maximum is ${IMPORT_MAX_PASTE_CHARS} characters.` },
          { status: 413 }
        );
      }
      parsed = await parseImportText(text);
    } else {
      return NextResponse.json({ error: 'Invalid source.' }, { status: 400 });
    }

    // #region agent log
    fetch('http://127.0.0.1:7274/ingest/c0a1f3a8-8163-44c5-9171-6cc76856d3a3',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'63689e'},body:JSON.stringify({sessionId:'63689e',location:'parse/route.ts:parsed-count',message:'rows after source parse',data:{source,parsedCount:parsed.length},timestamp:Date.now(),hypothesisId:'E'})}).catch(()=>{});
    // #endregion

    const rowCheck = assertParsedRowCount(parsed.length);
    if (!rowCheck.ok) {
      return NextResponse.json({ error: rowCheck.message }, { status: rowCheck.status });
    }

    parsed = capParsedRows(parsed);

    if (parsed.length === 0) {
      return NextResponse.json({ error: 'No card purchases found in the provided data.' }, { status: 422 });
    }

    const normalized = await normalizeImportItems(parsed);
    const cappedNormalized = capParsedRows(normalized);
    const totalMatched = cappedNormalized.filter((item) => item.cardId !== null).length;

    const supabase = createServiceClient();

    const { data: batch, error: batchError } = await supabase
      .from('import_batches')
      .insert({
        user_id: supabaseUserId,
        source,
        file_url: fileUrl,
        total_parsed: cappedNormalized.length,
        total_matched: totalMatched,
        status: 'pending',
      })
      .select('id')
      .single();

    if (batchError || !batch?.id) {
      // #region agent log
      fetch('http://127.0.0.1:7274/ingest/c0a1f3a8-8163-44c5-9171-6cc76856d3a3',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'63689e'},body:JSON.stringify({sessionId:'63689e',location:'parse/route.ts:batch-insert-fail',message:'import_batches insert failed',data:{error:batchError?.message??'no id'},timestamp:Date.now(),hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      console.error('Failed to create import batch', { error: batchError?.message });
      return NextResponse.json({ error: 'Import failed. Please try again.' }, { status: 500 });
    }

    const batchId = batch.id as string;

    const itemRows = cappedNormalized.map((item) => ({
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
      console.error('Failed to insert import items', { error: itemsError.message });
      return NextResponse.json({ error: 'Import failed. Please try again.' }, { status: 500 });
    }

    // #region agent log
    fetch('http://127.0.0.1:7274/ingest/c0a1f3a8-8163-44c5-9171-6cc76856d3a3',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'63689e'},body:JSON.stringify({sessionId:'63689e',location:'parse/route.ts:success',message:'import parse success',data:{batchId,totalParsed:cappedNormalized.length},timestamp:Date.now(),hypothesisId:'D'})}).catch(()=>{});
    // #endregion

    return NextResponse.json({
      batchId,
      totalParsed: cappedNormalized.length,
      totalMatched,
    });
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7274/ingest/c0a1f3a8-8163-44c5-9171-6cc76856d3a3',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'63689e'},body:JSON.stringify({sessionId:'63689e',location:'parse/route.ts:catch',message:'import parse exception',data:{error:error instanceof Error?error.message:String(error)},timestamp:Date.now(),hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    console.error('Import parse failed', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Import failed. Please try again.' }, { status: 500 });
  }
}
