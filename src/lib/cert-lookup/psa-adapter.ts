import type { PSALookupResult } from '@/lib/cert-lookup/psa';
import type { CertLookupResult } from '@/lib/cert-lookup/types';

export function psaResultToCertLookup(result: PSALookupResult): CertLookupResult {
  return {
    certNumber: result.certNumber,
    player: result.player,
    year: result.year,
    setName: result.manufacturer,
    cardNumber: result.cardNumber,
    parallel: result.parallel,
    grade: result.grade,
    gradeDescription: result.gradeDescription,
    qualifierCode: result.qualifierCode,
    autographGrade: result.autographGrade,
    popAtGrade: result.popAtGrade,
    popWithQualifier: result.popWithQualifier,
    popHigher: result.popHigher,
    isDualCert: result.isDualCert,
    psaSpecId: result.psaSpecId,
    sport: result.sport,
    manufacturer: result.manufacturer,
    source: 'psa_api',
    raw: result,
  };
}
