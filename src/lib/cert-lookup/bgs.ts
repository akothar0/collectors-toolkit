import { normalizeCertNumber } from '@/lib/cert-number';
import { scrapeHeaders } from '@/lib/cert-lookup/scrape-utils';
import type { CertLookupResult, CertSubGrades } from '@/lib/cert-lookup/types';

type BeckettLookupResponse = {
  item_id?: string | number;
  player_name?: string;
  set_name?: string;
  sport_name?: string;
  card_key?: string;
  final_grade?: string | number;
  center_grade?: string | number;
  corners_grade?: string | number;
  edges_grade?: string | number;
  surface_grade?: string | number;
  autograph_grade?: string | number;
  pop_report?: string | number;
  grade_pop_report?: string | number;
  pop_higher?: string | number;
  date_graded?: string;
  label?: string;
  error?: string;
  message?: string;
};

function asNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseFloat(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function asText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function parseYearFromSetName(setName: string | null) {
  if (!setName) {
    return null;
  }

  const match = setName.match(/\b(19|20)\d{2}\b/);
  return match ? Number.parseInt(match[0], 10) : null;
}

function subGrade(value: unknown) {
  const parsed = asNumber(value);
  return parsed ?? undefined;
}

export function parseBGSLookupJson(certNumber: string, body: unknown): CertLookupResult | null {
  if (!body || typeof body !== 'object') {
    return null;
  }

  const payload = body as BeckettLookupResponse;
  const message = asText(payload.error) ?? asText(payload.message);
  if (message && /not found|invalid|no record/i.test(message)) {
    return null;
  }

  const player = asText(payload.player_name);
  const setName = asText(payload.set_name);
  const grade = asNumber(payload.final_grade);

  if (!player && !setName && grade === null) {
    return null;
  }

  const subGrades: CertSubGrades = {
    centering: subGrade(payload.center_grade),
    corners: subGrade(payload.corners_grade),
    edges: subGrade(payload.edges_grade),
    surface: subGrade(payload.surface_grade),
  };

  const hasSubGrades = Object.values(subGrades).some((value) => value !== undefined);
  const autographGrade = asNumber(payload.autograph_grade);
  const cardKey = asText(payload.card_key)?.replace(/\s+/g, '') ?? null;
  const resolvedCert =
    asText(payload.item_id) ?? normalizeCertNumber(certNumber) ?? certNumber;

  const gradeDescription =
    grade !== null
      ? payload.label === 'gold' && grade >= 9.5
        ? 'GEM MINT'
        : null
      : null;

  return {
    certNumber: resolvedCert,
    player: player ?? 'Unknown',
    year: parseYearFromSetName(setName),
    setName,
    cardNumber: cardKey,
    parallel: null,
    grade,
    gradeDescription,
    autographGrade,
    subGrades: hasSubGrades ? subGrades : undefined,
    popAtGrade: asNumber(payload.grade_pop_report) ?? asNumber(payload.pop_report),
    popHigher: asNumber(payload.pop_higher),
    sport: asText(payload.sport_name),
    manufacturer: setName,
    source: 'beckett_scrape',
    raw: payload,
  };
}

/** @deprecated HTML parser kept for tests; Beckett serves data via JSON API. */
export function parseBGSLookupHtml(certNumber: string, html: string): CertLookupResult | null {
  const normalizedHtml = html.replace(/\s+/g, ' ');
  const lower = normalizedHtml.toLowerCase();

  if (
    lower.includes('no record') ||
    lower.includes('not found') ||
    lower.includes('invalid cert') ||
    lower.includes('could not find')
  ) {
    return null;
  }

  try {
    const jsonStart = html.indexOf('{');
    const jsonEnd = html.lastIndexOf('}');
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      const parsed = JSON.parse(html.slice(jsonStart, jsonEnd + 1)) as unknown;
      const fromJson = parseBGSLookupJson(certNumber, parsed);
      if (fromJson) {
        return fromJson;
      }
    }
  } catch {
    // fall through
  }

  return null;
}

export async function lookupBGS(certNumber: string): Promise<CertLookupResult | null> {
  const normalized = normalizeCertNumber(certNumber);
  if (!normalized) {
    return null;
  }

  try {
    const params = new URLSearchParams({
      category: 'BGS',
      serialNumber: normalized,
    });

    const response = await fetch(
      `https://www.beckett.com/api/grading/lookup?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          ...scrapeHeaders(),
          Accept: 'application/json, text/plain, */*',
          Referer: `https://www.beckett.com/grading/card-lookup?item_id=${normalized}&item_type=BGS`,
        },
        redirect: 'follow',
      }
    );

    if (!response.ok) {
      console.error('BGS cert lookup failed', {
        certNumber: normalized,
        status: response.status,
      });
      return null;
    }

    const body = (await response.json()) as unknown;
    return parseBGSLookupJson(normalized, body);
  } catch (error) {
    console.error('BGS cert lookup error', {
      certNumber: normalized,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
