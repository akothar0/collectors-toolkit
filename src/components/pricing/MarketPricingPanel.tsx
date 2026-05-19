'use client';

import { ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { readJsonResponse } from '@/lib/http-json';
import type { PricingPanelData } from '@/lib/pricing/presenter';
import { formatPricingDate } from '@/lib/pricing/presenter';

type MarketPricingPanelProps = {
  collectionCardId?: string;
  wantListId?: string;
  onPricingUpdated?: () => void;
  onRequestEdit?: () => void;
};

function pricingEndpoint(props: MarketPricingPanelProps, force: boolean) {
  const suffix = force ? '?force=1' : '';
  if (props.wantListId) {
    return `/api/pricing/wantlist/${props.wantListId}${suffix}`;
  }
  if (props.collectionCardId) {
    return `/api/pricing/${props.collectionCardId}${suffix}`;
  }
  return null;
}

const panelClass = 'space-y-4 rounded border border-ink-700 bg-ink-900 p-4';

export function MarketPricingPanel({
  collectionCardId,
  wantListId,
  onPricingUpdated,
  onRequestEdit,
}: MarketPricingPanelProps) {
  const [data, setData] = useState<PricingPanelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadPricing = useCallback(
    async (force = false) => {
      setError('');
      const endpoint = pricingEndpoint({ collectionCardId, wantListId }, force);
      if (!endpoint) return null;

      const response = await fetch(endpoint);
      const payload = await readJsonResponse<PricingPanelData & { error?: string; message?: string }>(
        response
      );

      if (!response.ok) {
        throw new Error(
          payload.error ?? payload.message ?? 'Unable to load market pricing.'
        );
      }

      setData(payload);
      return payload;
    },
    [collectionCardId, wantListId]
  );

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      try {
        await loadPricing(false);
      } catch (loadError) {
        if (!cancelled) {
          const message =
            loadError instanceof Error ? loadError.message : 'Unable to load market pricing.';
          setError(message);
          setData({
            configured: true,
            status: 'error',
            sourceLabel: 'CardSight sold comps',
            medianLabel: null,
            sampleSize: null,
            confidenceLabel: null,
            valuationEligible: false,
            lastUpdated: null,
            comparables: [],
            message,
            canRefresh: true,
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [loadPricing]);

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

  if (loading) {
    return (
      <div className={panelClass}>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ash-400">Market value</p>
        <p className="text-sm text-ash-300">Loading saved comps…</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={panelClass}>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ash-400">Market value</p>
        {error ? <p className="text-sm text-rose-500">{error}</p> : null}
      </div>
    );
  }

  if (!data.configured) {
    return (
      <div className={panelClass}>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ash-400">Market value</p>
        <p className="text-sm text-ash-300">{data.message ?? 'Market pricing is not configured.'}</p>
      </div>
    );
  }

  const showRefreshButton = data.canRefresh !== false;
  const refreshLabel =
    data.status === 'idle' || data.status === 'catalog_not_found'
      ? 'Load market comps'
      : 'Refresh comps';

  return (
    <div className={panelClass}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ash-400">Market value</p>
          <p className="mt-1 text-2xl font-semibold text-ash-50">
            {data.medianLabel ?? '—'}
          </p>
          <p className="mt-1 text-xs text-ash-400">{data.sourceLabel}</p>
        </div>
        {showRefreshButton ? (
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1 rounded border border-ink-600 px-3 py-1.5 text-xs font-medium text-ash-200 hover:bg-ink-800 disabled:opacity-60"
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

      {error ? <p className="text-sm text-rose-500">{error}</p> : null}
      {data.message ? <p className="text-sm text-ash-300">{data.message}</p> : null}
      {data.compsScopeNote ? (
        <p className="text-xs text-ash-400">{data.compsScopeNote}</p>
      ) : null}

      {data.status === 'incomplete_identity' && onRequestEdit ? (
        <button
          type="button"
          onClick={onRequestEdit}
          className="text-sm font-medium text-brand-500 hover:text-brand-400"
        >
          Edit card details
        </button>
      ) : null}

      <div className="flex flex-wrap gap-3 text-xs text-ash-400">
        {data.sampleSize != null ? <span>{data.sampleSize} recent sales</span> : null}
        {data.confidenceLabel ? <span>Confidence: {data.confidenceLabel}</span> : null}
        {data.lastUpdated ? (
          <span>Updated {formatPricingDate(data.lastUpdated) ?? data.lastUpdated}</span>
        ) : null}
      </div>

      {data.comparables.length > 0 ? (
        <ul className="space-y-2 border-t border-ink-700 pt-3">
          {data.comparables.map((comp, index) => (
            <li key={`${comp.title}-${index}`} className="flex items-start justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="truncate text-ash-100">{comp.title}</p>
                <div className="flex flex-wrap gap-2 text-xs text-ash-400">
                  {comp.gradeLabel ? <span>{comp.gradeLabel}</span> : null}
                  {comp.saleDateLabel ? <span>{comp.saleDateLabel}</span> : null}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="font-medium text-ash-50">{comp.salePriceLabel}</span>
                {comp.itemUrl ? (
                  <a
                    href={comp.itemUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-500 hover:text-brand-400"
                    aria-label="View sale"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
