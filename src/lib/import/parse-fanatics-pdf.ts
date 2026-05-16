import { openai } from '@/lib/openai';
import type { ParsedImportItem } from './types';

type RawRow = {
  title?: unknown;
  price?: unknown;
  date?: unknown;
  orderId?: unknown;
};

function toText(v: unknown) {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

function toPrice(v: unknown): number | null {
  const text = typeof v === 'string' ? v.replace(/[^0-9.]/g, '') : typeof v === 'number' ? String(v) : '';
  const parsed = Number.parseFloat(text);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

// Strip Whatnot auction prefix: "WA212 Lot #2510: " → ""
function stripFanaticsPrefix(title: string): string {
  return title.replace(/^WA\d+\s+Lot\s+#[\w]+:\s*/i, '').trim();
}

const PROMPT = `This is text extracted from a Fanatics Collect order invoice PDF.
Extract every individual card purchase listed as a line item.

For each card return:
{ "title": string, "price": number | null, "date": string | null, "orderId": string | null }

Line item titles often start with "WA### Lot #####:" — include the full title as-is.
Return a JSON array. Skip shipping, taxes, buyer's premium, order totals, and any line that is not a card or sealed product.
If price is missing, use null.`;

export async function parseFanaticsPDF(pdfBuffer: Buffer): Promise<ParsedImportItem[]> {
  // unpdf works in Node.js/serverless without browser DOM globals (unlike pdf-parse)
  const { getDocumentProxy, extractText } = await import('unpdf');
  const doc = await getDocumentProxy(new Uint8Array(pdfBuffer));
  const { text } = await extractText(doc, { mergePages: true });

  if (!text || text.trim().length < 10) {
    return [];
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: `${PROMPT}\n\nPDF text:\n${text.slice(0, 8000)}`,
      },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 2000,
  });

  const responseText = response.choices[0]?.message?.content ?? '';

  let rows: RawRow[] = [];
  try {
    const parsed = JSON.parse(responseText) as Record<string, unknown>;
    const arr = Array.isArray(parsed) ? parsed : Array.isArray(parsed.items) ? (parsed.items as RawRow[]) : [];
    rows = arr as RawRow[];
  } catch {
    return [];
  }

  return rows
    .map((row) => {
      const raw = toText(row.title) ?? '';
      return {
        rawTitle: raw,
        rawPrice: toPrice(row.price),
        rawDate: toText(row.date) ?? toText(row.orderId),
        rawSource: 'Fanatics',
      };
    })
    .filter((item) => item.rawTitle.length > 0)
    .map((item) => ({
      ...item,
      // Keep raw title intact; normalize() will parse it
      rawTitle: stripFanaticsPrefix(item.rawTitle) || item.rawTitle,
    }));
}
