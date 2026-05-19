import type { PricingResponse } from '@/lib/cardsight/types';
import type { FlatPricingRecord, NormalizedComparable, NormalizedPriceResult } from '@/lib/pricing/types';

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

export function flattenPricingRecords(
  response: PricingResponse,
  filters?: { gradeId?: string | null; parallelId?: string | null }
): FlatPricingRecord[] {
  const records: FlatPricingRecord[] = [];

  for (const record of response.raw?.records ?? []) {
    if (filters?.gradeId) {
      continue;
    }
    if (filters?.parallelId) {
      if (!record.parallel_id || record.parallel_id !== filters.parallelId) {
        continue;
      }
    }
    records.push(record);
  }

  for (const company of response.graded ?? []) {
    for (const gradeGroup of company.grades ?? []) {
      if (filters?.gradeId && gradeGroup.grade_id && gradeGroup.grade_id !== filters.gradeId) {
        continue;
      }

      const gradeValue = parseGradeValue(gradeGroup.grade_value);
      for (const record of gradeGroup.records ?? []) {
        if (filters?.parallelId) {
          if (!record.parallel_id || record.parallel_id !== filters.parallelId) {
            continue;
          }
        }
        records.push({
          ...record,
          gradingCompany: company.company_name ?? null,
          grade: gradeValue,
        });
      }
    }
  }

  return records;
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

function periodToWindowDays(period?: string) {
  switch (period) {
    case '7d':
      return 7;
    case '14d':
    case '2w':
      return 14;
    case '3m':
    case '90d':
      return 90;
    case '1y':
      return 365;
    default:
      return 90;
  }
}

export function normalizePricingResponse(
  response: PricingResponse,
  options?: { period?: string; gradeId?: string | null; parallelId?: string | null }
): NormalizedPriceResult {
  const flat = flattenPricingRecords(response, {
    gradeId: options?.gradeId,
    parallelId: options?.parallelId,
  });

  const prices = flat
    .map((record) => parsePrice(record.price))
    .filter((value): value is number => value != null);

  const comparables: NormalizedComparable[] = flat.flatMap((record) => {
    const salePrice = parsePrice(record.price);
    if (salePrice == null) return [];
    return [
      {
        title: record.title,
        salePrice,
        saleDate: record.date ?? null,
        itemUrl: record.url ?? null,
        imageUrl: record.image_url ?? null,
        listingFormat: record.listing_type ?? null,
        conditionLabel: null,
        gradingCompany: record.gradingCompany ?? null,
        grade: record.grade ?? null,
        parallelId: record.parallel_id ?? null,
        parallelName: record.parallel_name ?? null,
        source: record.source,
      },
    ];
  })
    .sort((a, b) => {
      const aTime = a.saleDate ? Date.parse(a.saleDate) : 0;
      const bTime = b.saleDate ? Date.parse(b.saleDate) : 0;
      return bTime - aTime;
    });

  const sampleSize = prices.length;
  const medianSalePrice = median(prices);
  const avgSalePrice =
    sampleSize > 0 ? prices.reduce((sum, value) => sum + value, 0) / sampleSize : null;
  const minSalePrice = sampleSize > 0 ? Math.min(...prices) : null;
  const maxSalePrice = sampleSize > 0 ? Math.max(...prices) : null;
  const latestSaleAt = comparables[0]?.saleDate ?? response.meta?.last_sale_date ?? null;

  const confidenceLabel =
    sampleSize >= 10 ? 'high' : sampleSize >= 3 ? 'medium' : sampleSize > 0 ? 'low' : 'none';
  const confidenceScore =
    sampleSize >= 10 ? 0.9 : sampleSize >= 3 ? 0.7 : sampleSize > 0 ? 0.4 : 0;

  return {
    source: 'cardsight',
    sampleSize,
    avgSalePrice,
    medianSalePrice,
    minSalePrice,
    maxSalePrice,
    latestSaleAt,
    confidenceLabel,
    confidenceScore,
    valuationEligible: sampleSize >= 3,
    comparables,
    rawResponse: response,
    windowDays: periodToWindowDays(options?.period),
  };
}
