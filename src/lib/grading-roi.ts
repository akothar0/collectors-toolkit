import type { PricingCompanyGroup, PricingRecord, PricingResponse } from '@/lib/cardsight/types';

export type PsaFeeTier = 'economy' | 'value' | 'regular';
export type SupportedPsaGrade = 8 | 9 | 10;
export type RoiConfidenceLabel = 'none' | 'low' | 'medium' | 'high';

export type GradeProfitabilityRow = {
  grade: SupportedPsaGrade;
  probability: number;
  gradedValue: number | null;
  sampleSize: number;
  confidenceLabel: RoiConfidenceLabel;
  breakEvenRawPrice: number | null;
  upside: number | null;
  status: 'ok' | 'no_sales';
};

export type GradeProfitabilityPayload = {
  rawPrice: number;
  feeTier: PsaFeeTier;
  gradingFee: number;
  feeTaxEstimate: number;
  expectedValue: number | null;
  expectedUpside: number | null;
  rows: GradeProfitabilityRow[];
  pricingResolvedAt: string | null;
  cardsightCardId: string;
  parallelId: string | null;
};

export type ExactGradePriceSummary = {
  grade: SupportedPsaGrade;
  gradedValue: number | null;
  sampleSize: number;
  confidenceLabel: RoiConfidenceLabel;
};

export const PSA_FEE_TIERS: Record<PsaFeeTier, number> = {
  economy: 20,
  value: 50,
  regular: 100,
};

export const DEFAULT_FEE_TAX_ESTIMATE = 0.08;
const SUPPORTED_PSA_GRADES: SupportedPsaGrade[] = [10, 9, 8];

function roundTo(value: number, decimals = 4) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function normalizeCompany(value: string | null | undefined) {
  return value?.trim().toUpperCase() ?? '';
}

function parsePrice(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.replace(/[^0-9.-]/g, ''));
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function parseGradeValue(value: string | number | undefined) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.replace(/[^0-9.]/g, ''));
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function median(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function confidenceFromSampleSize(sampleSize: number): RoiConfidenceLabel {
  if (sampleSize >= 10) return 'high';
  if (sampleSize >= 3) return 'medium';
  if (sampleSize > 0) return 'low';
  return 'none';
}

function matchPsaCompany(company: PricingCompanyGroup) {
  return normalizeCompany(company.company_name) === 'PSA';
}

function matchGrade(targetGrade: SupportedPsaGrade, gradeValue: string | number | undefined) {
  const numeric = parseGradeValue(gradeValue);
  return numeric != null && numeric === targetGrade;
}

function filterParallel(records: PricingRecord[], parallelId: string | null) {
  if (!parallelId) {
    return records;
  }

  return records.filter((record) => {
    if (!record.parallel_id) {
      return false;
    }
    return record.parallel_id === parallelId;
  });
}

export function extractExactPsaGradeSummary(input: {
  pricingResponse: PricingResponse;
  grade: SupportedPsaGrade;
  parallelId?: string | null;
}): ExactGradePriceSummary {
  const company = (input.pricingResponse.graded ?? []).find(matchPsaCompany);
  if (!company) {
    return {
      grade: input.grade,
      gradedValue: null,
      sampleSize: 0,
      confidenceLabel: 'none',
    };
  }

  const matchingGroups = (company.grades ?? []).filter((gradeGroup) =>
    matchGrade(input.grade, gradeGroup.grade_value)
  );

  const records = matchingGroups.flatMap((gradeGroup) =>
    filterParallel(gradeGroup.records ?? [], input.parallelId ?? null)
  );
  const prices = records
    .map((record) => parsePrice(record.price))
    .filter((value): value is number => value != null);

  return {
    grade: input.grade,
    gradedValue: median(prices),
    sampleSize: prices.length,
    confidenceLabel: confidenceFromSampleSize(prices.length),
  };
}

export function mapPredictionToPsaProbabilities(
  prediction: number
): Record<SupportedPsaGrade, number> {
  const clamped = Math.min(10, Math.max(8, prediction));
  const lower = Math.floor(clamped);
  const upper = Math.ceil(clamped);
  const probabilities: Record<SupportedPsaGrade, number> = { 8: 0, 9: 0, 10: 0 };

  if (lower === upper) {
    probabilities[lower as SupportedPsaGrade] = 1;
    return probabilities;
  }

  const upperWeight = clamped - lower;
  const lowerWeight = 1 - upperWeight;

  if (lower >= 8 && lower <= 10) {
    probabilities[lower as SupportedPsaGrade] = roundTo(lowerWeight);
  }
  if (upper >= 8 && upper <= 10) {
    probabilities[upper as SupportedPsaGrade] = roundTo(upperWeight);
  }

  return probabilities;
}

export function calculateBreakEvenRawPrice(
  gradedValue: number | null,
  gradingFee: number,
  feeTaxEstimate = DEFAULT_FEE_TAX_ESTIMATE
) {
  if (gradedValue == null) {
    return null;
  }
  return roundTo(gradedValue - gradingFee - gradingFee * feeTaxEstimate, 2);
}

export function calculateUpside(input: {
  gradedValue: number | null;
  rawPrice: number;
  gradingFee: number;
  feeTaxEstimate?: number;
}) {
  if (input.gradedValue == null) {
    return null;
  }

  const feeTaxEstimate = input.feeTaxEstimate ?? DEFAULT_FEE_TAX_ESTIMATE;
  return roundTo(
    input.gradedValue - input.rawPrice - input.gradingFee - input.gradingFee * feeTaxEstimate,
    2
  );
}

export function calculateExpectedValue(input: {
  probabilities: Record<SupportedPsaGrade, number>;
  gradeValues: Record<SupportedPsaGrade, number | null>;
  gradingFee: number;
}) {
  const hasAnyGradeValue = Object.values(input.gradeValues).some((value) => value != null);
  if (!hasAnyGradeValue) {
    return null;
  }

  const weightedValue = SUPPORTED_PSA_GRADES.reduce((sum, grade) => {
    const probability = input.probabilities[grade];
    const value = input.gradeValues[grade];
    return sum + probability * (value ?? 0);
  }, 0);

  return roundTo(weightedValue - input.gradingFee, 2);
}

export function buildGradeProfitabilityPayload(input: {
  pricingResponse: PricingResponse;
  psaPrediction: number;
  rawPrice: number;
  feeTier: PsaFeeTier;
  cardsightCardId: string;
  parallelId?: string | null;
  pricingResolvedAt?: string | null;
  feeTaxEstimate?: number;
}): GradeProfitabilityPayload {
  const gradingFee = PSA_FEE_TIERS[input.feeTier];
  const feeTaxEstimate = input.feeTaxEstimate ?? DEFAULT_FEE_TAX_ESTIMATE;
  const probabilities = mapPredictionToPsaProbabilities(input.psaPrediction);

  const summaries = SUPPORTED_PSA_GRADES.map((grade) =>
    extractExactPsaGradeSummary({
      pricingResponse: input.pricingResponse,
      grade,
      parallelId: input.parallelId ?? null,
    })
  );

  const rows: GradeProfitabilityRow[] = summaries.map((summary) => ({
    grade: summary.grade,
    probability: probabilities[summary.grade],
    gradedValue: summary.gradedValue,
    sampleSize: summary.sampleSize,
    confidenceLabel: summary.confidenceLabel,
    breakEvenRawPrice: calculateBreakEvenRawPrice(
      summary.gradedValue,
      gradingFee,
      feeTaxEstimate
    ),
    upside: calculateUpside({
      gradedValue: summary.gradedValue,
      rawPrice: input.rawPrice,
      gradingFee,
      feeTaxEstimate,
    }),
    status: summary.gradedValue != null ? 'ok' : 'no_sales',
  }));

  const gradeValues = rows.reduce(
    (acc, row) => {
      acc[row.grade] = row.gradedValue;
      return acc;
    },
    { 8: null, 9: null, 10: null } as Record<SupportedPsaGrade, number | null>
  );

  const expectedValue = calculateExpectedValue({
    probabilities,
    gradeValues,
    gradingFee,
  });

  return {
    rawPrice: input.rawPrice,
    feeTier: input.feeTier,
    gradingFee,
    feeTaxEstimate,
    expectedValue,
    expectedUpside: expectedValue != null ? roundTo(expectedValue - input.rawPrice, 2) : null,
    rows,
    pricingResolvedAt: input.pricingResolvedAt ?? null,
    cardsightCardId: input.cardsightCardId,
    parallelId: input.parallelId ?? null,
  };
}
