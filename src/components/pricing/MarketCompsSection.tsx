'use client';

import { ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eyebrow, Rule } from '@/components/editorial';
import { CompRangeBar } from '@/components/pricing/CompRangeBar';
import { readJsonResponse } from '@/lib/http-json';
import type { PricingComparableRow, PricingPanelData } from '@/lib/pricing/presenter';
import { formatPricingDate } from '@/lib/pricing/presenter';

type ExploreFilters = {
  gradingCompany: string;
  grade: string;
  parallelId: string;
};

type MarketCompsSectionProps = {
  collectionCardId?: string;
  wantListId?: string;
  compact?: boolean;
  slabDefaults?: {
    gradingCompany?: string | null;
    grade?: number | null;
  };
  onPricingUpdated?: () => void;
  onRequestEdit?: () => void;
  onPanelData?: (data: PricingPanelData) => void;
};

function pricingEndpoint(
  props: { collectionCardId?: string; wantListId?: string },
  force: boolean,
  explore?: ExploreFilters
) {
  const params = new URLSearchParams();
  if (force) params.set('force', '1');
  if (explore?.gradingCompany) params.set('gradingCompany', explore.gradingCompany);
  if (explore?.grade) params.set('grade', explore.grade);
  if (explore?.parallelId) params.set('parallelId', explore.parallelId);
  const qs = params.toString() ? `?${params.toString()}` : '';

  if (props.wantListId) {
    return `/api/pricing/wantlist/${props.wantListId}${force ? '?force=1' : ''}`;
  }
  if (props.collectionCardId) {
    return `/api/pricing/${props.collectionCardId}${qs}`;
  }
  return null;
}

function parseMedianValue(label: string | null) {
  if (!label) return null;
  const cleaned = label.replace(/[^0-9.-]/g, '');
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function CompMetaLine({ comp }: { comp: PricingComparableRow }) {
  return (
    <div className="flex flex-wrap gap-2 font-mono text-[10px] text-ink-3">
      {comp.gradeLabel ? <span>{comp.gradeLabel}</span> : null}
      {comp.saleDateLabel ? <span>{comp.saleDateLabel}</span> : null}
    </div>
  );
}

export function MarketCompsSection({
  collectionCardId,
  wantListId,
  compact,
  slabDefaults,
  onPricingUpdated,
  onRequestEdit,
  onPanelData,
}: MarketCompsSectionProps) {
  const [data, setData] = useState<PricingPanelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [explore, setExplore] = useState<ExploreFilters>({
    gradingCompany: slabDefaults?.gradingCompany ?? '',
    grade: slabDefaults?.grade != null ? String(slabDefaults.grade) : '',
    parallelId: '',
  });

  const exploreEnabled = Boolean(collectionCardId && !wantListId);
  const panelClass = compact
    ? 'space-y-3 rounded border border-rule bg-surface px-3 py-3'
    : 'space-y-4 rounded border border-rule bg-surface p-4';

  const loadPricing = useCallback(
    async (force = false, filters?: ExploreFilters) => {
      setError('');
      const endpoint = pricingEndpoint({ collectionCardId, wantListId }, force, force ? undefined : filters);
      if (!endpoint) return null;

      const response = await fetch(endpoint);
      const payload = await readJsonResponse<PricingPanelData & { error?: string; message?: string }>(
        response
      );

      if (!response.ok) {
        throw new Error(payload.error ?? payload.message ?? 'Unable to load market pricing.');
      }

      setData(payload);
      onPanelData?.(payload);
      if (payload.appliedFilters) {
        setExplore({
          gradingCompany: payload.appliedFilters.gradingCompany ?? '',
          grade: payload.appliedFilters.grade != null ? String(payload.appliedFilters.grade) : '',
          parallelId: payload.appliedFilters.parallelId ?? '',
        });
      }
      return payload;
    },
    [collectionCardId, wantListId, onPanelData]
  );

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      try {
        await loadPricing(false);
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error ? loadError.message : 'Unable to load market pricing.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [loadPricing]);

  const medianNumeric = useMemo(() => parseMedianValue(data?.medianLabel ?? null), [data?.medianLabel]);

  async function handleRefresh() {
    setRefreshing(true);
    setError('');
    try {
      const payload = await loadPricing(true);
      if (payload?.status === 'refreshed' && payload.valuationEligible) {
        onPricingUpdated?.();
      }
    } catch (refreshError) {
      setError(
        refreshError instanceof Error ? refreshError.message : 'Unable to refresh market pricing.'
      );
    } finally {
      setRefreshing(false);
    }
  }

  function handleExploreChange(patch: Partial<ExploreFilters>) {
    const next = { ...explore, ...patch };
    setExplore(next);
    void loadPricing(false, next);
  }

  function handleResetSlab() {
    const reset: ExploreFilters = {
      gradingCompany: slabDefaults?.gradingCompany ?? data?.slabDefaults?.gradingCompany ?? '',
      grade:
        slabDefaults?.grade != null
          ? String(slabDefaults.grade)
          : data?.slabDefaults?.grade != null
            ? String(data.slabDefaults.grade)
            : '',
      parallelId: '',
    };
    setExplore(reset);
    void loadPricing(false, reset);
  }

  if (loading) {
    return (
      <div className={panelClass}>
        <Eyebrow>Comp window · 90 days</Eyebrow>
        <p className="text-[13px] text-ink-2">Loading comps…</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={panelClass}>
        <Eyebrow>Comp window · 90 days</Eyebrow>
        {error ? <p className="font-mono text-[11px] text-negative">{error}</p> : null}
      </div>
    );
  }

  if (!data.configured) {
    return (
      <div className={panelClass}>
        <Eyebrow>Comp window · 90 days</Eyebrow>
        <p className="text-[13px] text-ink-2">{data.message ?? 'Market pricing is not configured.'}</p>
      </div>
    );
  }

  const showRefresh = data.canRefresh !== false;
  const refreshLabel =
    data.status === 'idle' || data.status === 'catalog_not_found' ? 'Load comps' : 'Refresh comps';

  const gradesForCompany =
    data.filterOptions?.gradesByCompany[explore.gradingCompany] ??
    data.filterOptions?.gradesByCompany[explore.gradingCompany.toUpperCase()] ??
    [];

  return (
    <div className={panelClass}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <Eyebrow>Comp window · 90 days · CardSight</Eyebrow>
          <p
            className={`mt-1 font-serif italic leading-none text-ink ${compact ? 'text-[22px]' : 'text-[32px]'}`}
          >
            {data.medianLabel ?? '—'}
          </p>
          <p className="mt-1 font-mono text-[10px] text-ink-3">
            {data.sampleSize != null ? `${data.sampleSize} sales` : 'No sales'}
            {data.lastUpdated ? ` · Updated ${formatPricingDate(data.lastUpdated)}` : ''}
            {data.confidenceLabel ? ` · ${data.confidenceLabel} confidence` : ''}
          </p>
        </div>
        {showRefresh ? (
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex shrink-0 items-center gap-1 rounded border border-rule px-3 py-1.5 font-mono text-[10px] uppercase tracking-wide text-ink-2 hover:bg-surface-2 disabled:opacity-60"
          >
            {refreshing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            {refreshLabel}
          </button>
        ) : null}
      </div>

      {error ? <p className="font-mono text-[11px] text-negative">{error}</p> : null}
      {data.message ? <p className="text-[13px] text-ink-2">{data.message}</p> : null}

      {data.minSalePrice != null && data.maxSalePrice != null && medianNumeric != null ? (
        <CompRangeBar
          min={data.minSalePrice}
          median={medianNumeric}
          max={data.maxSalePrice}
          compact={compact}
        />
      ) : null}

      {data.compsScopeNote ? (
        <p className="font-mono text-[10px] text-ink-3">{data.compsScopeNote}</p>
      ) : null}

      {exploreEnabled && data.filterOptions ? (
        <div className="flex flex-wrap items-end gap-2">
          <label className="block">
            <span className="font-mono text-[9px] uppercase tracking-wide text-ink-3">Grader</span>
            <select
              value={explore.gradingCompany}
              onChange={(e) => handleExploreChange({ gradingCompany: e.target.value })}
              className="mt-0.5 block rounded border border-rule bg-surface-2 px-2 py-1 text-[12px] text-ink"
            >
              <option value="">Any</option>
              {data.filterOptions.gradingCompanies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="font-mono text-[9px] uppercase tracking-wide text-ink-3">Grade</span>
            <select
              value={explore.grade}
              onChange={(e) => handleExploreChange({ grade: e.target.value })}
              className="mt-0.5 block rounded border border-rule bg-surface-2 px-2 py-1 text-[12px] text-ink"
            >
              <option value="">Any</option>
              {gradesForCompany.map((g) => (
                <option key={g} value={String(g)}>
                  {g}
                </option>
              ))}
            </select>
          </label>
          <label className="block min-w-[120px] flex-1">
            <span className="font-mono text-[9px] uppercase tracking-wide text-ink-3">Parallel</span>
            <select
              value={explore.parallelId}
              onChange={(e) => handleExploreChange({ parallelId: e.target.value })}
              className="mt-0.5 block w-full rounded border border-rule bg-surface-2 px-2 py-1 text-[12px] text-ink"
            >
              <option value="">Any</option>
              {data.filterOptions.parallels.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={handleResetSlab}
            className="rounded border border-rule px-2 py-1 font-mono text-[10px] text-ink-2 hover:bg-surface-2"
          >
            Reset to my slab
          </button>
        </div>
      ) : null}

      {data.status === 'incomplete_identity' && onRequestEdit ? (
        <button
          type="button"
          onClick={onRequestEdit}
          className="text-[13px] font-medium text-accent hover:underline"
        >
          Edit card details
        </button>
      ) : null}

      {data.comparables.length > 0 ? (
        <>
          <Rule soft />
          <ul className="space-y-2">
            {data.comparables.map((comp, index) => (
              <li key={`${comp.title}-${index}`} className="flex items-start justify-between gap-3 text-[13px]">
                <div className="min-w-0">
                  <p className="truncate text-ink">{comp.title}</p>
                  <CompMetaLine comp={comp} />
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-medium text-ink">{comp.salePriceLabel}</span>
                  {comp.itemUrl ? (
                    <a
                      href={comp.itemUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent hover:text-ink"
                      aria-label="View sale"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
