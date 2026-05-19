import { formatPrice } from '@/lib/collection-presenter';

export type PricingPanelStatus =
  | 'unavailable'
  | 'cached'
  | 'refreshed'
  | 'idle'
  | 'not_found'
  | 'catalog_not_found'
  | 'unsupported_sport'
  | 'incomplete_identity'
  | 'ambiguous'
  | 'needs_review'
  | 'error';

export type PricingComparableRow = {
  title: string;
  salePriceLabel: string;
  saleDateLabel: string | null;
  itemUrl: string | null;
  gradeLabel: string | null;
};

export type PricingPanelData = {
  configured: boolean;
  status: PricingPanelStatus;
  sourceLabel: string;
  medianLabel: string | null;
  sampleSize: number | null;
  confidenceLabel: string | null;
  valuationEligible: boolean;
  lastUpdated: string | null;
  comparables: PricingComparableRow[];
  message?: string;
  canRefresh?: boolean;
  compsScopeNote?: string | null;
  minSalePrice?: number | null;
  maxSalePrice?: number | null;
  activeTier?: string | null;
  filterOptions?: {
    gradingCompanies: string[];
    gradesByCompany: Record<string, number[]>;
    parallels: { id: string; name: string }[];
  };
  appliedFilters?: {
    gradingCompany?: string | null;
    grade?: number | null;
    parallelId?: string | null;
  };
  slabDefaults?: {
    gradingCompany?: string | null;
    grade?: number | null;
    parallelId?: string | null;
  };
  strictEligible?: boolean;
};

export function formatPricingDate(value: string | null | undefined) {
  if (!value) return null;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Date(parsed).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function buildGradedCompsScopeNote(input: {
  conditionBucket?: string | null;
  gradingCompany?: string | null;
  grade?: number | null;
}) {
  if (input.conditionBucket !== 'graded' || !input.gradingCompany?.trim()) {
    return null;
  }

  const gradeLabel =
    input.grade != null && Number.isFinite(Number(input.grade)) ? ` ${input.grade}` : '';
  return `Median reflects ${input.gradingCompany.trim()}${gradeLabel} sales. Recent sales may include raw and other grades.`;
}

export function mapPricingPayload(input: {
  configured: boolean;
  status: PricingPanelStatus;
  snapshot?: Record<string, unknown> | null;
  comparables?: Record<string, unknown>[] | null;
  message?: string;
  canRefresh?: boolean;
  compsScopeNote?: string | null;
}): PricingPanelData {
  const snapshot = input.snapshot;
  const median = snapshot?.median_sale_price != null ? Number(snapshot.median_sale_price) : null;
  const sampleSize = snapshot?.sample_size != null ? Number(snapshot.sample_size) : null;

  const comparables = (input.comparables ?? []).map((row) => {
    const company = (row.grading_company as string | null) ?? null;
    const grade = row.grade != null ? Number(row.grade) : null;
    const gradeLabel =
      company && grade != null && Number.isFinite(grade)
        ? `${company} ${grade}`
        : company
          ? company
          : 'Raw';

    return {
      title: String(row.title ?? 'Sale'),
      salePriceLabel: formatPrice(row.sale_price != null ? Number(row.sale_price) : null) ?? '—',
      saleDateLabel: formatPricingDate((row.sale_date as string | null) ?? null),
      itemUrl: (row.item_url as string | null) ?? null,
      gradeLabel,
    };
  });

  const scopeFromSnapshot = (snapshot?.comps_scope_note as string | null) ?? null;
  const lastUpdated =
    (snapshot?.market_cache_queried_at as string | null) ??
    (snapshot?.queried_at as string | null) ??
    null;

  const hasDisplayMedian = sampleSize != null && sampleSize > 0 && median != null;
  const minSale = snapshot?.min_sale_price != null ? Number(snapshot.min_sale_price) : null;
  const maxSale = snapshot?.max_sale_price != null ? Number(snapshot.max_sale_price) : null;

  return {
    configured: input.configured,
    status: input.status,
    sourceLabel: 'CardSight sold comps',
    medianLabel: hasDisplayMedian ? formatPrice(median) : null,
    sampleSize: sampleSize ?? (comparables.length > 0 ? comparables.length : null),
    confidenceLabel: (snapshot?.confidence_label as string | null) ?? null,
    valuationEligible: Boolean(snapshot?.valuation_eligible),
    lastUpdated,
    comparables,
    message: input.message,
    canRefresh: input.canRefresh,
    compsScopeNote: scopeFromSnapshot ?? input.compsScopeNote ?? null,
    minSalePrice: minSale,
    maxSalePrice: maxSale,
    activeTier: (snapshot?.active_tier as string | null) ?? null,
  };
}

export function resolveCompsScopeNote(input: {
  snapshot?: Record<string, unknown> | null;
  referenceKey?: {
    condition_bucket: string;
    grading_company: string | null;
    grade: number | null;
  } | null;
}) {
  const fromSnapshot = (input.snapshot?.comps_scope_note as string | null) ?? null;
  if (fromSnapshot) {
    return fromSnapshot;
  }
  if (input.referenceKey) {
    return buildGradedCompsScopeNote({
      conditionBucket: input.referenceKey.condition_bucket,
      gradingCompany: input.referenceKey.grading_company,
      grade: input.referenceKey.grade,
    });
  }
  return null;
}
