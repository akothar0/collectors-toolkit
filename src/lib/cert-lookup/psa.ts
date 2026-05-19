import { normalizeCertNumber } from '@/lib/cert-number';
import { parsePsaBrand } from '@/lib/cert-lookup/psa-brand';

type PsaRawCert = Record<string, unknown>;

export type PSALookupResult = {
  certNumber: string;
  psaSpecId: string;
  player: string;
  year: number;
  manufacturer: string;
  setName: string | null;
  sport: string;
  cardNumber: string;
  parallel: string | null;
  grade: number;
  gradeDescription: string;
  qualifierCode: string | null;
  autographGrade: number | null;
  popAtGrade: number;
  popWithQualifier: number;
  popHigher: number;
  isDualCert: boolean;
  source: 'psa_api';
};

export type PSALookupErrorCode =
  | 'not_configured'
  | 'quota_exceeded'
  | 'unauthorized'
  | 'not_found'
  | 'parse_error';

export type PSALookupOutcome =
  | { ok: true; result: PSALookupResult }
  | { ok: false; code: PSALookupErrorCode; message: string };

export const PSA_QUOTA_EXCEEDED_MESSAGE =
  'PSA API daily limit reached (100 calls/day on the free tier). Try again tomorrow or view the cert on psacard.com.';

function getToken() {
  return process.env.PSA_API_TOKEN ?? '';
}

function asString(value: unknown) {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function asNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.trim());
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function asInteger(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value.trim(), 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function asBoolean(value: unknown) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === 'true' || normalized === 'y' || normalized === 'yes' || normalized === '1';
  }

  return false;
}

function normalizeGrade(value: unknown) {
  const raw = asString(value);
  if (!raw) {
    return null;
  }

  const match = raw.match(/(\d+(?:\.\d+)?)(?:\s+([A-Z]+))?$/i);
  if (!match) {
    return null;
  }

  return {
    grade: Number.parseFloat(match[1]),
    qualifierCode: match[2] ? match[2].trim().toUpperCase() : null,
  };
}

function pickCertPayload(body: unknown): PsaRawCert | null {
  if (!body || typeof body !== 'object') {
    return null;
  }

  const payload = body as Record<string, unknown>;
  const candidates = [
    payload.PSACert,
    payload.PsaCert,
    payload.PublicPSACert,
    payload.PublicCertificationModel && typeof payload.PublicCertificationModel === 'object'
      ? (payload.PublicCertificationModel as Record<string, unknown>).PSACert
      : undefined,
    payload.PublicCertificationModel && typeof payload.PublicCertificationModel === 'object'
      ? (payload.PublicCertificationModel as Record<string, unknown>).PsaCert
      : undefined,
  ];

  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'object') {
      return candidate as PsaRawCert;
    }
  }

  return payload;
}

export function normalizePSACertBody(certNumber: string, body: unknown): PSALookupResult | null {
  const cert = pickCertPayload(body);
  if (!cert) {
    return null;
  }

  const itemStatus = asString(cert.ItemStatus ?? cert.itemStatus);
  const isPsaDNA = asBoolean(cert.IsPSADNA ?? cert.isPSADNA);
  if (isPsaDNA || (itemStatus !== null && itemStatus !== 'Y')) {
    return null;
  }

  const gradeInfo = normalizeGrade(cert.CardGrade ?? cert.cardGrade);
  const player = asString(cert.Subject ?? cert.subject);
  const year = asInteger(cert.Year ?? cert.year);
  const brandRaw = asString(cert.Brand ?? cert.brand);
  const { manufacturer: parsedManufacturer, setName: parsedSetName } = parsePsaBrand(brandRaw);
  const manufacturer = parsedManufacturer ?? brandRaw;
  const setName = parsedSetName ?? brandRaw;
  const sport = asString(cert.Category ?? cert.category);
  const cardNumber = asString(cert.CardNumber ?? cert.cardNumber);
  const psaSpecId = asString(cert.SpecID ?? cert.specId ?? cert.SpecId);
  const gradeDescription = asString(cert.GradeDescription ?? cert.gradeDescription);
  const popAtGrade = asInteger(cert.TotalPopulation ?? cert.totalPopulation);
  const popWithQualifier = asInteger(cert.TotalPopulationWithQualifier ?? cert.totalPopulationWithQualifier);
  const popHigher = asInteger(cert.PopulationHigher ?? cert.populationHigher);

  if (
    !player ||
    year === null ||
    !manufacturer ||
    !sport ||
    !cardNumber ||
    !psaSpecId ||
    !gradeInfo ||
    !gradeDescription ||
    popAtGrade === null ||
    popWithQualifier === null ||
    popHigher === null
  ) {
    return null;
  }

  return {
    certNumber,
    psaSpecId,
    player,
    year,
    manufacturer,
    setName,
    sport,
    cardNumber,
    parallel: asString(cert.Variety ?? cert.variety),
    grade: gradeInfo.grade,
    gradeDescription,
    qualifierCode: gradeInfo.qualifierCode,
    autographGrade: asNumber(cert.AutographGrade ?? cert.autographGrade),
    popAtGrade,
    popWithQualifier,
    popHigher,
    isDualCert: asBoolean(cert.IsDualCert ?? cert.isDualCert),
    source: 'psa_api',
  };
}

export function classifyPsaApiFailure(status: number, bodyText: string): PSALookupOutcome {
  const normalized = bodyText.toLowerCase();

  if (status === 429 || normalized.includes('quota exceeded')) {
    return { ok: false, code: 'quota_exceeded', message: PSA_QUOTA_EXCEEDED_MESSAGE };
  }

  if (status === 401 || status === 403 || normalized.includes('unauthorized')) {
    return {
      ok: false,
      code: 'unauthorized',
      message: 'PSA API rejected our credentials. Check PSA_API_TOKEN in server settings.',
    };
  }

  if (status === 404) {
    return {
      ok: false,
      code: 'not_found',
      message: 'PSA could not find that cert number. Check the number and try again.',
    };
  }

  return {
    ok: false,
    code: 'not_found',
    message: 'PSA could not find that cert number. Check the number and try again.',
  };
}

async function readResponseText(response: Response) {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

export async function lookupPSACertWithStatus(certNumber: string): Promise<PSALookupOutcome> {
  const token = getToken();
  const normalized = normalizeCertNumber(certNumber);

  if (!token) {
    return {
      ok: false,
      code: 'not_configured',
      message: 'PSA API is not configured on the server. Add PSA_API_TOKEN in Vercel environment variables.',
    };
  }

  if (!normalized) {
    return {
      ok: false,
      code: 'not_found',
      message: 'Enter a valid PSA cert number.',
    };
  }

  try {
    const response = await fetch(
      `https://api.psacard.com/publicapi/cert/GetByCertNumber/${encodeURIComponent(normalized)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      }
    );

    const bodyText = await readResponseText(response);

    if (!response.ok) {
      console.error('PSA cert lookup failed', {
        certNumber: normalized,
        status: response.status,
        body: bodyText.slice(0, 200),
      });
      return classifyPsaApiFailure(response.status, bodyText);
    }

    let body: unknown = null;
    try {
      body = bodyText ? (JSON.parse(bodyText) as unknown) : null;
    } catch {
      return {
        ok: false,
        code: 'parse_error',
        message: 'PSA returned an unexpected response. Try again later.',
      };
    }

    const result = normalizePSACertBody(normalized, body);
    if (!result) {
      console.error('PSA cert payload could not be normalized', {
        certNumber: normalized,
        body: bodyText.slice(0, 500),
      });
      return {
        ok: false,
        code: 'parse_error',
        message: 'PSA returned cert data we could not read. Try again or view the cert on psacard.com.',
      };
    }

    return { ok: true, result };
  } catch (error) {
    console.error('PSA cert lookup error', {
      certNumber: normalized,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      ok: false,
      code: 'parse_error',
      message: 'Unable to reach the PSA API right now. Try again in a few minutes.',
    };
  }
}

export async function lookupPSACert(certNumber: string): Promise<PSALookupResult | null> {
  const outcome = await lookupPSACertWithStatus(certNumber);
  return outcome.ok ? outcome.result : null;
}
