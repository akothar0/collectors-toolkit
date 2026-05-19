import type {
  BulkPricingResponse,
  CardSightListingType,
  CardSightPeriod,
  CatalogCard,
  CatalogCardsResponse,
  CatalogParallel,
  CatalogParallelsResponse,
  GradingCompaniesResponse,
  GradingCompany,
  GradingGrade,
  GradingGradesResponse,
  GradingType,
  GradingTypesResponse,
  PricingResponse,
} from '@/lib/cardsight/types';

const DEFAULT_BASE_URL = 'https://api.cardsight.ai';

export class CardSightApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string
  ) {
    super(message);
    this.name = 'CardSightApiError';
  }
}

function getApiKey() {
  const key = process.env.CARDSIGHTAI_API_KEY?.trim();
  if (!key) {
    throw new Error('CARDSIGHTAI_API_KEY is not configured');
  }
  return key;
}

function getBaseUrl() {
  return process.env.CARDSIGHTAI_BASE_URL?.trim() || DEFAULT_BASE_URL;
}

type RequestOptions = {
  method?: 'GET' | 'POST';
  path: string;
  query?: Record<string, string | number | string[] | undefined>;
  body?: unknown;
};

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function cardsightRequest<T>(
  options: RequestOptions,
  attempt = 0
): Promise<T> {
  const url = new URL(options.path, getBaseUrl());

  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value === undefined || value === null || value === '') continue;
      if (Array.isArray(value)) {
        for (const entry of value) {
          url.searchParams.append(key, entry);
        }
      } else {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const response = await fetch(url, {
    method: options.method ?? 'GET',
    headers: {
      'X-API-Key': getApiKey(),
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: 'no-store',
  });

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text) as unknown;
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const errorPayload = payload as { error?: string; code?: string; message?: string } | null;
    if (response.status === 429 && attempt < 2) {
      await delay(1100 * (attempt + 1));
      return cardsightRequest<T>(options, attempt + 1);
    }
    throw new CardSightApiError(
      errorPayload?.error ?? errorPayload?.message ?? `CardSight API error (${response.status})`,
      response.status,
      errorPayload?.code
    );
  }

  return payload as T;
}

export type PricingQueryOptions = {
  parallelId?: string;
  gradeId?: string;
  period?: CardSightPeriod;
  listingType?: CardSightListingType;
  limit?: number;
};

export async function getCardPricing(
  cardId: string,
  options: PricingQueryOptions = {}
): Promise<PricingResponse> {
  return cardsightRequest<PricingResponse>({
    path: `/v1/pricing/${cardId}`,
    query: {
      parallel_id: options.parallelId,
      grade_id: options.gradeId,
      period: options.period ?? '3m',
      listing_type: options.listingType ?? 'both',
      limit: options.limit ?? 50,
    },
  });
}

export async function getBulkCardPricing(input: {
  cardIds: string[];
  parallelId?: string;
  gradeId?: string;
  period?: CardSightPeriod;
  listingType?: CardSightListingType;
  limit?: number;
}): Promise<BulkPricingResponse> {
  return cardsightRequest<BulkPricingResponse>({
    method: 'POST',
    path: '/v1/pricing/',
    body: {
      card_ids: input.cardIds,
      parallel_id: input.parallelId,
      grade_id: input.gradeId,
      period: input.period ?? '3m',
      listing_type: input.listingType ?? 'both',
      limit: input.limit ?? 50,
    },
  });
}

export type SearchCatalogCardsInput = {
  name?: string;
  number?: string;
  year?: number;
  setName?: string;
  manufacturer?: string;
  segment?: string;
  take?: number;
};

export function parseCatalogCardsResponse(
  response: CatalogCardsResponse | CatalogCard[]
): CatalogCard[] {
  if (Array.isArray(response)) {
    return response;
  }

  return response.cards ?? response.data ?? [];
}

function unwrapList<T>(response: T[] | Record<string, unknown>, keys: string[]): T[] {
  if (Array.isArray(response)) {
    return response;
  }

  for (const key of keys) {
    const value = response[key];
    if (Array.isArray(value)) {
      return value as T[];
    }
  }

  return [];
}

export async function searchCatalogCards(
  input: SearchCatalogCardsInput
): Promise<CatalogCard[]> {
  const response = await cardsightRequest<CatalogCardsResponse | CatalogCard[]>({
    path: '/v1/catalog/cards',
    query: {
      name: input.name,
      number: input.number,
      year: input.year,
      setName: input.setName,
      manufacturer: input.manufacturer,
      segment: input.segment,
      take: input.take ?? 20,
    },
  });

  return parseCatalogCardsResponse(response);
}

export async function getCatalogCard(cardId: string): Promise<CatalogCard> {
  return cardsightRequest<CatalogCard>({
    path: `/v1/catalog/cards/${cardId}`,
  });
}

export async function searchCatalogParallels(input: {
  name?: string;
  releaseId?: string;
  take?: number;
}): Promise<CatalogParallel[]> {
  const response = await cardsightRequest<CatalogParallelsResponse | CatalogParallel[]>({
    path: '/v1/catalog/parallels',
    query: {
      name: input.name,
      releaseId: input.releaseId,
      take: input.take ?? 20,
    },
  });

  return unwrapList(response, ['parallels', 'data']);
}

export async function listGradingCompanies(): Promise<GradingCompany[]> {
  const response = await cardsightRequest<GradingCompaniesResponse | GradingCompany[]>({
    path: '/v1/grades/companies',
  });

  return unwrapList(response, ['companies', 'data']);
}

export async function listGradingTypes(companyId: string): Promise<GradingType[]> {
  const response = await cardsightRequest<GradingTypesResponse | GradingType[]>({
    path: `/v1/grades/companies/${companyId}/types`,
  });

  return unwrapList(response, ['types', 'data']);
}

export async function listGradingGrades(companyId: string, typeId: string): Promise<GradingGrade[]> {
  const response = await cardsightRequest<GradingGradesResponse | GradingGrade[]>({
    path: `/v1/grades/companies/${companyId}/types/${typeId}/grades`,
  });

  return unwrapList(response, ['grades', 'data']);
}

export function isCardSightConfigured() {
  return Boolean(process.env.CARDSIGHTAI_API_KEY?.trim());
}
