import { openai } from '@/lib/openai';
import type { ParsedImportItem } from './types';
import { extractFirstArray } from './extract-utils';

type RawRow = { title?: unknown; price?: unknown; date?: unknown };

function toText(v: unknown) {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

function toPrice(v: unknown): number | null {
  const text = typeof v === 'string' ? v.replace(/[^0-9.]/g, '') : typeof v === 'number' ? String(v) : '';
  const parsed = Number.parseFloat(text);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

// Handles pasted eBay purchases page text specifically.
// The eBay page has nav, "Recently viewed items", and "SPONSORED" sections
// before the actual Orders — the prompt must tell GPT to skip those.
const PROMPT = `This text was copied from the eBay purchases page (ebay.com/mye/myebay/purchase).

The page has several sections — ONLY extract items from the "Orders" section.
SKIP all items under "Recently viewed items", "SPONSORED", and any navigation text.

The Orders section has entries like:
  Order date: [date]
  Order total: US $[amount]
  Order number: [number]
  [item title]            ← extract this
  US $[item price]        ← extract this (the individual listing price, not order total)

Each item title appears multiple times in the text (as link text, alt text, button text).
Include each unique purchase ONCE — deduplicate.

Return a JSON object with key "items" containing an array. Each element:
  { "title": string, "price": number | null, "date": string | null }`;

export async function parseImportText(text: string): Promise<ParsedImportItem[]> {
  if (!text.trim()) {
    return [];
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: `${PROMPT}\n\nText:\n${text.slice(0, 12000)}`,
      },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 3000,
  });

  const responseText = response.choices[0]?.message?.content ?? '';

  let rows: RawRow[] = [];
  try {
    const parsed = JSON.parse(responseText) as Record<string, unknown>;
    rows = extractFirstArray(parsed) as RawRow[];
  } catch {
    return [];
  }

  return rows
    .map((row) => ({
      rawTitle: toText(row.title) ?? '',
      rawPrice: toPrice(row.price),
      rawDate: toText(row.date),
      rawSource: 'eBay',
    }))
    .filter((item) => item.rawTitle.length > 0);
}
