import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { openai } from '@/lib/openai';
import { loadMarketCache } from '@/lib/pricing/market-cache';
import type { PricingRecord } from '@/lib/cardsight/types';

export const runtime = 'nodejs';

type InsightBody = {
  player: string;
  year?: number | string | null;
  setName?: string | null;
  cardNumber?: string | null;
  parallel?: string | null;
  gradingCompany?: string | null;
  officialGrade?: number | string | null;
  gradeDescription?: string | null;
  popAtGrade?: number | null;
  popHigher?: number | null;
  cardId?: string | null;
};

function median(prices: number[]) {
  const sorted = [...prices].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function buildPricingLine(records: PricingRecord[], totalCount: number) {
  const prices = records.map((r) => r.price).filter((p) => p > 0);
  if (prices.length === 0) return '';
  const med = median(prices);
  const low = Math.min(...prices);
  const high = Math.max(...prices);
  const fmt = (n: number) => `$${n.toFixed(0)}`;
  return `Recent sales (${totalCount} comps in past 3 months): median ~${fmt(med)}, range ${fmt(low)}–${fmt(high)}.`;
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json()) as InsightBody;
  const {
    player,
    year,
    setName,
    cardNumber,
    parallel,
    gradingCompany,
    officialGrade,
    gradeDescription,
    popAtGrade,
    popHigher,
    cardId,
  } = body;

  if (!player) {
    return NextResponse.json({ error: 'player is required' }, { status: 400 });
  }

  let pricingLine = '';
  if (cardId) {
    try {
      const cache = await loadMarketCache(cardId, '3m');
      if (cache) {
        const records: PricingRecord[] = [
          ...(cache.pricing_response.raw?.records ?? []),
          ...(cache.pricing_response.graded?.flatMap((co) =>
            co.grades.flatMap((g) => g.records)
          ) ?? []),
        ];
        pricingLine = buildPricingLine(records, cache.total_records || records.length);
      }
    } catch {
      // Non-fatal — proceed without pricing context
    }
  }

  const cardLine = [year, player, setName ? `— ${setName}` : null, cardNumber ? `#${cardNumber}` : null, parallel]
    .filter(Boolean)
    .join(' ');
  const gradeLine = [gradingCompany, officialGrade, gradeDescription ? `(${gradeDescription})` : null]
    .filter(Boolean)
    .join(' ');
  const popLine =
    popAtGrade != null || popHigher != null
      ? `Pop at grade: ${popAtGrade ?? 'N/A'} | Pop higher: ${popHigher ?? 'N/A'}`
      : '';

  const userContent = [
    `Card: ${cardLine}`,
    gradeLine ? `Grade: ${gradeLine}` : null,
    popLine || null,
    pricingLine || null,
  ]
    .filter(Boolean)
    .join('\n');

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 200,
    temperature: 0.5,
    messages: [
      {
        role: 'system',
        content: `You are a sports card expert writing a brief summary for a collector who just scanned a graded card.
Write exactly 3 sentences. Cover:
1. What this card is and why the set or product is notable to collectors.
2. The player's significance — career context and why collectors care about this card.
3. Scarcity or value context using the pop report data, and pricing trend if sales data is provided.
Be factual and concise. No hype. No filler. Plain English. Do not start sentences with "This card".`,
      },
      { role: 'user', content: userContent },
    ],
  });

  const insight = completion.choices[0]?.message?.content?.trim() ?? '';
  return NextResponse.json({ insight });
}
