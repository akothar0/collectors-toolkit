import { getCertLookupCandidates, normalizeCertNumber } from '@/lib/cert-number';
import { lookupBGS } from '@/lib/cert-lookup/bgs';
import { lookupCardGradeFallback } from '@/lib/cert-lookup/cardgrade';
import { psaResultToCertLookup } from '@/lib/cert-lookup/psa-adapter';
import { lookupPSACertWithStatus } from '@/lib/cert-lookup/psa';
import type { CertLookupResult, CertLookupSource } from '@/lib/cert-lookup/types';
import { createServiceClient } from '@/lib/supabase';

const SUCCESS_LOOKUP_SOURCES: CertLookupSource[] = [
  'psa_api',
  'beckett_scrape',
  'sgc_scrape',
  'cardgrade_io',
];

export type CertLookupError = {
  message: string;
  code: string;
};

export type CertLookupOutcome =
  | { ok: true; result: CertLookupResult; fromCache: boolean }
  | { ok: false; error: CertLookupError };

export function normalizeLookupGradingCompany(value: string | null | undefined) {
  const normalized = (value ?? '').trim().toUpperCase();
  if (normalized === 'PSA' || normalized === 'BGS' || normalized === 'SGC' || normalized === 'CGC') {
    return normalized;
  }

  return 'PSA';
}

function rowToCertLookup(row: Record<string, unknown>): CertLookupResult | null {
  const certNumber = typeof row.cert_number === 'string' ? row.cert_number : null;
  const source = row.lookup_source as CertLookupSource | null;
  if (!certNumber || !source || !SUCCESS_LOOKUP_SOURCES.includes(source)) {
    return null;
  }

  const raw = row.raw_cert_response;
  const rawRecord =
    raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};

  const cached =
    rawRecord.psa ?? rawRecord.bgs ?? rawRecord.sgc ?? rawRecord.cardgrade ?? rawRecord.lookup;

  if (cached && typeof cached === 'object') {
    const cachedResult = cached as CertLookupResult;
    if (cachedResult.player && cachedResult.certNumber) {
      return { ...cachedResult, certNumber, source };
    }
  }

  const player =
    typeof rawRecord.player === 'string'
      ? rawRecord.player
      : typeof row.card_player === 'string'
        ? row.card_player
        : null;

  if (!player) {
    return null;
  }

  return {
    certNumber,
    player,
    year: typeof row.card_year === 'number' ? row.card_year : null,
    setName: typeof rawRecord.setName === 'string' ? rawRecord.setName : null,
    cardNumber: typeof rawRecord.cardNumber === 'string' ? rawRecord.cardNumber : null,
    parallel: null,
    grade: typeof row.official_grade === 'number' ? row.official_grade : null,
    gradeDescription:
      typeof row.grade_description === 'string' ? row.grade_description : null,
    popAtGrade: typeof row.pop_at_grade === 'number' ? row.pop_at_grade : null,
    popHigher: typeof row.pop_higher === 'number' ? row.pop_higher : null,
    source,
    raw: rawRecord,
  };
}

export async function getCachedCertLookup(
  certNumber: string,
  gradingCompany: string
): Promise<CertLookupResult | null> {
  const company = normalizeLookupGradingCompany(gradingCompany);

  for (const candidate of getCertLookupCandidates(certNumber)) {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('graded_scans')
      .select(
        'cert_number, grading_company, lookup_source, raw_cert_response, official_grade, grade_description, pop_at_grade, pop_higher'
      )
      .eq('cert_number', candidate)
      .eq('grading_company', company)
      .in('lookup_source', SUCCESS_LOOKUP_SOURCES)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      return rowToCertLookup(data as Record<string, unknown>);
    }
  }

  return null;
}

async function lookupByCompany(
  certNumber: string,
  gradingCompany: string
): Promise<{ result: CertLookupResult | null; error?: CertLookupError }> {
  const company = normalizeLookupGradingCompany(gradingCompany);

  if (company === 'PSA') {
    const outcome = await lookupPSACertWithStatus(certNumber);
    if (outcome.ok) {
      return { result: psaResultToCertLookup(outcome.result) };
    }

    return {
      result: null,
      error: { code: outcome.code, message: outcome.message },
    };
  }

  if (company === 'BGS') {
    return { result: await lookupBGS(certNumber) };
  }

  if (company === 'SGC') {
    return {
      result: null,
      error: {
        code: 'unsupported_grader',
        message:
          'SGC cert lookup is not supported. Verify on gosgc.com and save this scan with the details from your slab.',
      },
    };
  }

  return {
    result: null,
    error: {
      code: 'unsupported_grader',
      message: 'CGC cert lookup is not available yet. Enter details manually or try another grader.',
    },
  };
}

export function certLookupFailureMessage(gradingCompany: string, certNumber: string) {
  const company = normalizeLookupGradingCompany(gradingCompany);
  if (company === 'PSA') {
    return `PSA could not find cert ${certNumber}. Check the number and try again.`;
  }

  if (company === 'BGS') {
    return `Beckett could not find cert ${certNumber}. Check the number and try again.`;
  }

  if (company === 'SGC') {
    return 'SGC cert lookup is not supported. Verify on gosgc.com and save this scan manually.';
  }

  return `We could not verify cert ${certNumber} for ${company}.`;
}

export async function lookupCertWithStatus(
  certNumber: string,
  gradingCompany: string
): Promise<CertLookupOutcome> {
  const candidates = getCertLookupCandidates(certNumber);
  const company = normalizeLookupGradingCompany(gradingCompany);

  if (candidates.length === 0) {
    return {
      ok: false,
      error: { code: 'invalid_cert', message: 'Enter a valid cert number.' },
    };
  }

  const cached = await getCachedCertLookup(certNumber, company);
  if (cached) {
    return { ok: true, result: cached, fromCache: true };
  }

  let lastError: CertLookupError | undefined;

  for (const candidate of candidates) {
    const outcome = await lookupByCompany(candidate, company);
    if (outcome.result) {
      return { ok: true, result: outcome.result, fromCache: false };
    }

    if (outcome.error) {
      lastError = outcome.error;
    }

    if (outcome.error && company === 'PSA') {
      return { ok: false, error: outcome.error };
    }
  }

  const primaryCert = candidates[0];
  if (company !== 'SGC' && company !== 'CGC') {
    const fallback = await lookupCardGradeFallback(primaryCert);
    if (fallback) {
      return { ok: true, result: fallback, fromCache: false };
    }
  }

  return {
    ok: false,
    error: lastError ?? {
      code: 'not_found',
      message: certLookupFailureMessage(company, primaryCert),
    },
  };
}

export async function lookupCert(
  certNumber: string,
  gradingCompany: string
): Promise<CertLookupResult | null> {
  const outcome = await lookupCertWithStatus(certNumber, gradingCompany);
  return outcome.ok ? outcome.result : null;
}
