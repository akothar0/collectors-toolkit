import { openai } from '@/lib/openai';
import type { ParsedImportItem } from './types';

type RawRow = { title?: unknown; price?: unknown; date?: unknown; source?: unknown };

function toText(v: unknown) {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

function toPrice(v: unknown): number | null {
  const text = typeof v === 'string' ? v.replace(/[^0-9.]/g, '') : typeof v === 'number' ? String(v) : '';
  const parsed = Number.parseFloat(text);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

const PROMPT = `Extract all individual card purchases from this text.
The text may be from an order confirmation email, purchase history page, or any purchase list.

For each card return:
{ "title": string, "price": number | null, "date": string | null, "source": string | null }

Return a JSON array. Skip shipping charges, taxes, order totals, and non-card items.`;

export async function parseImportText(text: string): Promise<ParsedImportItem[]> {
  if (!text.trim()) {
    return [];
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: `${PROMPT}\n\nText:\n${text.slice(0, 8000)}`,
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
    .map((row) => ({
      rawTitle: toText(row.title) ?? '',
      rawPrice: toPrice(row.price),
      rawDate: toText(row.date),
      rawSource: toText(row.source) ?? 'Unknown',
    }))
    .filter((item) => item.rawTitle.length > 0);
}
