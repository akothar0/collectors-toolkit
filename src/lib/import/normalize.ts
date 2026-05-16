import { openai } from '@/lib/openai';
import { findOrCreateCard } from '@/lib/card-catalog';
import type { NormalizedImportItem, ParsedImportItem } from './types';

type ParsedCard = {
  player: string | null;
  year: number | null;
  setName: string | null;
  cardNumber: string | null;
  grade: number | null;
  gradingCompany: 'PSA' | 'BGS' | 'SGC' | null;
  parallel: string | null;
  serialNumber: number | null;
  printRun: number | null;
  isRookie: boolean;
  isAutograph: boolean;
  confidence: 'high' | 'medium' | 'low';
};

function safeText(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

function safeNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim()) {
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function safeInt(v: unknown): number | null {
  const n = safeNumber(v);
  return n != null ? Math.trunc(n) : null;
}

function safeGradingCompany(v: unknown): 'PSA' | 'BGS' | 'SGC' | null {
  const text = safeText(v)?.toUpperCase();
  if (text === 'PSA' || text === 'BGS' || text === 'SGC') return text;
  return null;
}

function safeConfidence(v: unknown): 'high' | 'medium' | 'low' {
  if (v === 'high' || v === 'medium' || v === 'low') return v;
  return 'low';
}

const BATCH_PROMPT = (titles: string[]) => `Parse these trading card listing titles. For each title return a JSON object.

Return a JSON array in the SAME ORDER as the input. One object per title.

For each title return:
{
  "player": string | null,
  "year": number | null,
  "setName": string | null,
  "cardNumber": string | null,
  "grade": number | null,
  "gradingCompany": "PSA" | "BGS" | "SGC" | null,
  "parallel": string | null,
  "serialNumber": number | null,
  "printRun": number | null,
  "isRookie": boolean,
  "isAutograph": boolean,
  "confidence": "high" | "medium" | "low"
}

Rules:
- year: 4-digit card year (e.g. 2018, 2024)
- grade: numeric grade only (e.g. 10, 9, 8.5)
- gradingCompany: only PSA, BGS, or SGC
- serialNumber: the "X" in "X/Y" serial (e.g. 276 from "276/500")
- printRun: the "Y" in "X/Y" (e.g. 500 from "276/500")
- parallel: variation name like "Silver Prizm", "Gold Refractor", "Mosaic" etc.
- isRookie: true if title contains ROOKIE or RC
- isAutograph: true if title contains AUTO or AUTOGRAPH or SIGNED
- confidence: "high" if you parsed player+year+grade reliably; "medium" if some fields missing; "low" if very uncertain
- Use null for any field you cannot determine

Input titles (${titles.length} total):
${titles.map((t, i) => `${i + 1}. ${t}`).join('\n')}`;

async function batchNormalize(titles: string[]): Promise<ParsedCard[]> {
  if (titles.length === 0) return [];

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: BATCH_PROMPT(titles) }],
    response_format: { type: 'json_object' },
    max_tokens: 3000,
  });

  const text = response.choices[0]?.message?.content ?? '';

  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    const arr = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed.items)
        ? (parsed.items as unknown[])
        : [];

    return arr.map((item) => {
      const r = item as Record<string, unknown>;
      return {
        player: safeText(r.player),
        year: safeInt(r.year),
        setName: safeText(r.setName),
        cardNumber: safeText(r.cardNumber),
        grade: safeNumber(r.grade),
        gradingCompany: safeGradingCompany(r.gradingCompany),
        parallel: safeText(r.parallel),
        serialNumber: safeInt(r.serialNumber),
        printRun: safeInt(r.printRun),
        isRookie: Boolean(r.isRookie),
        isAutograph: Boolean(r.isAutograph),
        confidence: safeConfidence(r.confidence),
      };
    });
  } catch {
    // Return low-confidence empty results for each title on parse failure
    return titles.map(() => ({
      player: null,
      year: null,
      setName: null,
      cardNumber: null,
      grade: null,
      gradingCompany: null,
      parallel: null,
      serialNumber: null,
      printRun: null,
      isRookie: false,
      isAutograph: false,
      confidence: 'low' as const,
    }));
  }
}

export async function normalizeImportItems(items: ParsedImportItem[]): Promise<NormalizedImportItem[]> {
  if (items.length === 0) return [];

  const BATCH_SIZE = 10;
  const results: NormalizedImportItem[] = [];

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    const titles = batch.map((item) => item.rawTitle);
    const parsed = await batchNormalize(titles);

    for (let j = 0; j < batch.length; j++) {
      const item = batch[j];
      const p = parsed[j] ?? {
        player: null, year: null, setName: null, cardNumber: null,
        grade: null, gradingCompany: null, parallel: null,
        serialNumber: null, printRun: null, isRookie: false, isAutograph: false,
        confidence: 'low' as const,
      };

      let cardId: string | null = null;

      if (p.player && p.confidence !== 'low') {
        try {
          const card = await findOrCreateCard({
            player: p.player,
            year: p.year ?? undefined,
            set_name: p.setName ?? undefined,
            card_number: p.cardNumber ?? undefined,
            parallel: p.parallel,
            is_rookie: p.isRookie,
            is_autograph: p.isAutograph,
            print_run: p.printRun ?? undefined,
            source: 'import_parsed',
          });
          cardId = card.id;
        } catch {
          // Non-fatal — card just won't be pre-matched
        }
      }

      results.push({
        ...item,
        parsedPlayer: p.player,
        parsedYear: p.year,
        parsedSet: p.setName,
        parsedCardNumber: p.cardNumber,
        parsedGrade: p.grade,
        parsedCompany: p.gradingCompany,
        parsedParallel: p.parallel,
        parsedSerialNumber: p.serialNumber,
        parsedPrintRun: p.printRun,
        isRookie: p.isRookie,
        isAutograph: p.isAutograph,
        parseConfidence: p.confidence,
        cardId,
      });
    }
  }

  return results;
}
