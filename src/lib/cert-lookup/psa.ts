type PsaRawCert = Record<string, unknown>;

export type PSALookupResult = {
  certNumber: string;
  psaSpecId: string;
  player: string;
  year: number;
  manufacturer: string;
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
  const manufacturer = asString(cert.Brand ?? cert.brand);
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

export async function lookupPSACert(certNumber: string): Promise<PSALookupResult | null> {
  const token = getToken();
  const trimmedCert = certNumber.trim();

  if (!token || !trimmedCert) {
    return null;
  }

  try {
    const response = await fetch(
      `https://api.psacard.com/publicapi/cert/GetByCertNumber/${encodeURIComponent(trimmedCert)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error('PSA cert lookup failed', {
        certNumber: trimmedCert,
        status: response.status,
      });
      return null;
    }

    const body = (await response.json()) as unknown;
    const normalized = normalizePSACertBody(trimmedCert, body);

    if (!normalized) {
      return null;
    }

    return normalized;
  } catch (error) {
    console.error('PSA cert lookup error', {
      certNumber: trimmedCert,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
