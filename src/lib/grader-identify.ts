import type { CatalogCard } from '@/lib/cardsight/types';
import { createServiceClient } from '@/lib/supabase';
import { pickBestCatalogMatches, type ResolveCardQuery } from '@/lib/cardsight/resolve-scoring';
import { normalizeSetNameForSearch } from '@/lib/pricing/set-normalize';
import { resolveCollectionCardToCardSight } from '@/lib/cardsight/resolve-card';
import type { PricingSupportedSport } from '@/lib/pricing/eligibility';

export type GraderIdentifiedCardCandidate = {
  cardId: string;
  player: string;
  year: number | null;
  setName: string | null;
  cardNumber: string | null;
};

export type GraderIdentifiedCard = {
  player: string | null;
  year: number | null;
  sport: string | null;
  setName: string | null;
  cardNumber: string | null;
  parallel: string | null;
  manufacturer: string | null;
  confidence: 'high' | 'medium' | 'low';
  status: 'matched' | 'candidates' | 'needs_review';
  cardId: string | null;
  cardsightCardId: string | null;
  candidates?: GraderIdentifiedCardCandidate[];
};

export type GraderIdentifiedCardInput = {
  player?: string | null;
  year?: number | string | null;
  sport?: string | null;
  setName?: string | null;
  cardNumber?: string | null;
  parallel?: string | null;
  manufacturer?: string | null;
  confidence?: string | null;
  status?: string | null;
  cardId?: string | null;
  cardsightCardId?: string | null;
  candidates?: unknown;
};

type StoredRawAiResponse = {
  identifiedCard?: GraderIdentifiedCard | null;
  [key: string]: unknown;
};

type LocalCardRow = {
  id: string;
  player: string;
  year: number | null;
  set_name: string | null;
  card_number: string | null;
  parallel: string | null;
  sport: string | null;
  manufacturer: string | null;
  source: string | null;
  source_id: string | null;
};

function normalizeText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeInteger(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeConfidence(value: unknown): GraderIdentifiedCard['confidence'] {
  return value === 'high' || value === 'medium' ? value : 'low';
}

function normalizeStatus(value: unknown): GraderIdentifiedCard['status'] {
  return value === 'matched' || value === 'candidates' ? value : 'needs_review';
}

function parseCandidate(value: unknown): GraderIdentifiedCardCandidate | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const cardId = normalizeText(record.cardId);
  const player = normalizeText(record.player);
  if (!cardId || !player) {
    return null;
  }

  return {
    cardId,
    player,
    year: normalizeInteger(record.year),
    setName: normalizeText(record.setName),
    cardNumber: normalizeText(record.cardNumber),
  };
}

export function normalizeIdentifiedCard(value: unknown): GraderIdentifiedCard | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const candidates = Array.isArray(record.candidates)
    ? record.candidates.map(parseCandidate).filter((item): item is GraderIdentifiedCardCandidate => Boolean(item))
    : undefined;

  return {
    player: normalizeText(record.player),
    year: normalizeInteger(record.year),
    sport: normalizeText(record.sport),
    setName: normalizeText(record.setName),
    cardNumber: normalizeText(record.cardNumber),
    parallel: normalizeText(record.parallel),
    manufacturer: normalizeText(record.manufacturer),
    confidence: normalizeConfidence(record.confidence),
    status: normalizeStatus(record.status),
    cardId: normalizeText(record.cardId),
    cardsightCardId: normalizeText(record.cardsightCardId),
    candidates: candidates && candidates.length > 0 ? candidates : undefined,
  };
}

export function extractStoredIdentifiedCard(rawAiResponse: unknown) {
  if (!rawAiResponse || typeof rawAiResponse !== 'object' || Array.isArray(rawAiResponse)) {
    return null;
  }

  const record = rawAiResponse as StoredRawAiResponse;
  return normalizeIdentifiedCard(record.identifiedCard ?? null);
}

export async function finalizeIdentifiedCard(input: {
  sessionId: string;
  existingCardId: string | null;
  draft: GraderIdentifiedCardInput;
}) {
  const normalized = normalizeIdentifiedCard(input.draft);
  if (!normalized) {
    throw new Error('A valid identified card payload is required.');
  }

  const resolved = await resolveIdentifiedCard({
    sessionId: input.sessionId,
    existingCardId: normalized.cardId ?? input.existingCardId,
    extracted: {
      player: normalized.player,
      year: normalized.year,
      sport: normalized.sport,
      setName: normalized.setName,
      cardNumber: normalized.cardNumber,
      parallel: normalized.parallel,
      manufacturer: normalized.manufacturer,
      confidence: normalized.confidence,
    },
  });

  const hasManualCardSelection = normalized.cardId && normalized.cardId === input.draft.cardId;
  if (!hasManualCardSelection) {
    return resolved;
  }

  return {
    ...resolved,
    cardId: normalized.cardId,
    status: 'matched' as const,
    confidence: normalized.confidence,
    candidates: undefined,
  };
}

function mergeStoredAiResponse(rawAiResponse: unknown, identifiedCard: GraderIdentifiedCard) {
  const existing =
    rawAiResponse && typeof rawAiResponse === 'object' && !Array.isArray(rawAiResponse)
      ? { ...(rawAiResponse as StoredRawAiResponse) }
      : {};

  return {
    ...existing,
    identifiedCard,
  };
}

export function buildIdentifyUserPrompt(imageCount: number) {
  return `Identify the sports card shown in these image${imageCount === 1 ? '' : 's'}.

Focus on visible card identity details only. Try to infer:
- player
- year
- sport
- setName
- cardNumber
- parallel
- manufacturer
- confidence

Inspect small printed details carefully:
- logos and product branding
- tiny corner card numbers
- serial numbering like 091/150
- foil color and parallel cues

When possible:
- return the most specific set name you can, including the release year if it is visible or strongly implied by the card design
- return the parent manufacturer when known (for example Bowman products are manufactured by Topps)
- use the visible serial numbering to infer the parallel family

Return only JSON:
{
  "player": string | null,
  "year": number | null,
  "sport": string | null,
  "setName": string | null,
  "cardNumber": string | null,
  "parallel": string | null,
  "manufacturer": string | null,
  "confidence": "high" | "medium" | "low"
}

Rules:
- If text is not visible or not reliable, use null.
- If the year or card number is not printed clearly but the design makes one answer highly likely, you may infer it with lower confidence.
- Do not invent details that are not reasonably supported by the images.
- For sport, use one of: Baseball, Basketball, Football, Soccer, Tennis, Hockey, Other.`;
}

type IdentifyExtraction = {
  player: string | null;
  year: number | null;
  sport: string | null;
  setName: string | null;
  cardNumber: string | null;
  parallel: string | null;
  manufacturer: string | null;
  confidence: GraderIdentifiedCard['confidence'];
};

export function parseIdentifyResponse(text: string | null): IdentifyExtraction | null {
  if (!text) return null;
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    return {
      player: normalizeText(parsed.player),
      year: normalizeInteger(parsed.year),
      sport: normalizeText(parsed.sport),
      setName: normalizeText(parsed.setName),
      cardNumber: normalizeText(parsed.cardNumber),
      parallel: normalizeText(parsed.parallel),
      manufacturer: normalizeText(parsed.manufacturer),
      confidence: normalizeConfidence(parsed.confidence),
    };
  } catch {
    return null;
  }
}

function localCardToCatalogCandidate(card: LocalCardRow): CatalogCard {
  return {
    id: card.id,
    name: card.player,
    number: card.card_number ?? undefined,
    year: card.year ?? undefined,
    manufacturer: card.manufacturer ?? undefined,
    set: card.set_name ? { name: card.set_name, year: card.year ?? undefined } : undefined,
    parallels: card.parallel ? [{ id: `${card.id}-parallel`, name: card.parallel }] : [],
  };
}

async function findLocalCardCandidates(query: ResolveCardQuery) {
  const supabase = createServiceClient();
  let request = supabase
    .from('cards')
    .select('id, player, year, set_name, card_number, parallel, sport, manufacturer, source, source_id')
    .ilike('player', `%${query.player}%`)
    .limit(12);

  if (query.year != null) {
    request = request.eq('year', query.year);
  }

  const { data, error } = await request;
  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as unknown as LocalCardRow[]).map((row) => ({
    row,
    candidate: localCardToCatalogCandidate(row),
  }));
}

function buildCandidates(rows: LocalCardRow[]) {
  return rows.slice(0, 3).map((row) => ({
    cardId: row.id,
    player: row.player,
    year: row.year,
    setName: row.set_name,
    cardNumber: row.card_number,
  }));
}

function mapSegment(sport: string | null): PricingSupportedSport | null {
  switch (sport?.trim().toLowerCase()) {
    case 'baseball':
      return 'Baseball';
    case 'basketball':
      return 'Basketball';
    case 'football':
      return 'Football';
    default:
      return null;
  }
}

export async function resolveIdentifiedCard(input: {
  sessionId: string;
  existingCardId: string | null;
  extracted: IdentifyExtraction;
}): Promise<GraderIdentifiedCard> {
  const query: ResolveCardQuery = {
    player: input.extracted.player ?? '',
    year: input.extracted.year,
    setName: normalizeSetNameForSearch(input.extracted.setName),
    cardNumber: input.extracted.cardNumber,
    parallel: input.extracted.parallel,
    manufacturer: input.extracted.manufacturer,
  };

  if (!query.player) {
    return {
      ...input.extracted,
      status: 'needs_review',
      cardId: null,
      cardsightCardId: null,
    };
  }

  const localCandidates = await findLocalCardCandidates(query);
  const ranked = pickBestCatalogMatches(
    localCandidates.map((entry) => entry.candidate),
    query
  );

  if (ranked.status === 'not_found') {
    const cardsightResolved = await resolveCollectionCardToCardSight({
      collectionCardId: input.sessionId,
      cardId: input.existingCardId,
      player: query.player,
      year: query.year,
      setName: query.setName,
      cardNumber: query.cardNumber,
      parallel: query.parallel,
      manufacturer: query.manufacturer,
      conditionType: 'raw',
      segment: mapSegment(input.extracted.sport),
    });

    if (cardsightResolved.status === 'matched' || cardsightResolved.status === 'already_linked') {
      return {
        ...input.extracted,
        status: 'matched',
        cardId: input.existingCardId,
        cardsightCardId: cardsightResolved.cardsightCardId,
      };
    }

    return {
      ...input.extracted,
      status: 'needs_review',
      cardId: null,
      cardsightCardId: null,
    };
  }

  if (ranked.status === 'ambiguous') {
    const cardsightResolved = await resolveCollectionCardToCardSight({
      collectionCardId: input.sessionId,
      cardId: input.existingCardId,
      player: query.player,
      year: query.year,
      setName: query.setName,
      cardNumber: query.cardNumber,
      parallel: query.parallel,
      manufacturer: query.manufacturer,
      conditionType: 'raw',
      segment: mapSegment(input.extracted.sport),
    });

    if (cardsightResolved.status === 'matched' || cardsightResolved.status === 'already_linked') {
      return {
        ...input.extracted,
        status: 'matched',
        cardId: input.existingCardId,
        cardsightCardId: cardsightResolved.cardsightCardId,
      };
    }

    const candidateIds = new Set(ranked.matches.map((match) => match.id));
    const rows = localCandidates
      .filter((entry) => candidateIds.has(entry.row.id))
      .map((entry) => entry.row);

    return {
      ...input.extracted,
      status: 'candidates',
      cardId: null,
      cardsightCardId: null,
      candidates: buildCandidates(rows),
    };
  }

  const matchedRow = localCandidates.find((entry) => entry.row.id === ranked.match.id)?.row ?? null;
  const resolvedCardId = matchedRow?.id ?? null;

  let cardsightCardId: string | null = null;
  if (resolvedCardId) {
    const resolved = await resolveCollectionCardToCardSight({
      collectionCardId: input.sessionId,
      cardId: resolvedCardId ?? input.existingCardId,
      player: query.player,
      year: query.year,
      setName: query.setName,
      cardNumber: query.cardNumber,
      parallel: query.parallel,
      manufacturer: query.manufacturer,
      conditionType: 'raw',
      segment: mapSegment(input.extracted.sport),
    });

    if (resolved.status === 'matched' || resolved.status === 'already_linked') {
      cardsightCardId = resolved.cardsightCardId;
    }
  }

  return {
    ...input.extracted,
    status: 'matched',
    cardId: resolvedCardId,
    cardsightCardId,
  };
}

export async function identifyCardFromImages(input: {
  sessionId: string;
  imageUrls: string[];
  existingCardId: string | null;
}) {
  const { openai } = await import('@/lib/openai');
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'You identify sports trading cards from images.' },
      {
        role: 'user',
        content: [
          { type: 'text', text: buildIdentifyUserPrompt(input.imageUrls.length) },
          ...input.imageUrls.map((url) => ({
            type: 'image_url' as const,
            image_url: { url, detail: 'high' as const },
          })),
        ],
      },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 600,
  });

  const parsed = parseIdentifyResponse(completion.choices[0]?.message?.content ?? null);
  if (!parsed) {
    throw new Error('Unable to identify this card from the uploaded photos.');
  }

  return resolveIdentifiedCard({
    sessionId: input.sessionId,
    existingCardId: input.existingCardId,
    extracted: parsed,
  });
}

export async function persistIdentifiedCardForSession(input: {
  sessionId: string;
  userId: string;
  identifiedCard: GraderIdentifiedCard;
  rawAiResponse: unknown;
}) {
  const supabase = createServiceClient();
  const updates: Record<string, unknown> = {
    raw_ai_response: mergeStoredAiResponse(input.rawAiResponse, input.identifiedCard),
    card_id: input.identifiedCard.cardId ?? null,
  };

  const { error } = await supabase
    .from('raw_grade_sessions')
    .update(updates)
    .eq('id', input.sessionId)
    .eq('user_id', input.userId);

  if (error) {
    throw new Error(error.message);
  }
}
