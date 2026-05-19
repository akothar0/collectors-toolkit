import { openai } from '@/lib/openai';
import type { ParsedImportItem } from './types';
import { extractFirstArray } from './extract-utils';
import { fileToDataUrl } from './file-data-url';

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

const PROMPT = `This is a screenshot of the eBay purchases page (ebay.com/mye/myebay/purchase).
Each row shows a card purchase with a listing title, price paid, and order date.
Extract every individual card purchase visible.

For each row return:
{ "title": string, "price": number | null, "date": string | null }

The title is the full card listing name — it typically contains player name, year, set, grade, and grading company.
Return a JSON object with key "items" containing the array.
Skip order total lines, shipping charges, and any line that is not a card purchase.
If text is cut off, include whatever is visible.`;

export async function parseEbayScreenshot(file: File): Promise<ParsedImportItem[]> {
  const imageUrl = await fileToDataUrl(file);
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: PROMPT },
          { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } },
        ],
      },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 2000,
  });

  const text = response.choices[0]?.message?.content ?? '';

  let rows: RawRow[] = [];
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
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
