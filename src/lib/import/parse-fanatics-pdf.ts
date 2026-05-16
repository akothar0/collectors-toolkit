import { openai } from '@/lib/openai';
import type { ParsedImportItem } from './types';

type RawRow = {
  title?: unknown;
  price?: unknown;
  date?: unknown;
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

// Find the first array value in a JSON object regardless of key name.
// Needed because json_object format forces a wrapper — model may use any key.
function extractArray(parsed: Record<string, unknown>): RawRow[] {
  if (Array.isArray(parsed)) return parsed as RawRow[];
  const arrayValue = Object.values(parsed).find(Array.isArray);
  return (arrayValue as RawRow[] | undefined) ?? [];
}

const PROMPT = `This is text extracted from a Fanatics Collect order invoice PDF.

Extract every purchased line item — graded cards, raw cards, AND sealed hobby/mega boxes.
For each line item return an object with these exact keys:
  "title": the full item title starting with "WA###" if present
  "price": the numeric price (number, not string)
  "date": the order date found in the document header (apply same date to all items)

Return a JSON object with key "items" containing the array of line item objects.
Skip only: the order total line, shipping charges, taxes, and buyer's premium.
Include everything else — cards, boxes, and sealed products all belong in items.`;

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
    rows = extractArray(parsed);
  } catch {
    return [];
  }

  return rows
    .map((row) => {
      const raw = toText(row.title) ?? '';
      return {
        rawTitle: raw,
        rawPrice: toPrice(row.price),
        rawDate: toText(row.date),
        rawSource: 'Fanatics',
      };
    })
    .filter((item) => item.rawTitle.length > 0)
    .map((item) => ({
      ...item,
      rawTitle: stripFanaticsPrefix(item.rawTitle) || item.rawTitle,
    }));
}
