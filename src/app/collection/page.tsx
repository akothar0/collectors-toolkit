'use client';
/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import type { Route } from 'next';
import { CreditCard, Grid3X3, List, Plus, Upload } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  GRADING_COMPANIES,
  SPORTS,
  buildCollectionQuery,
  type CollectionCardItem,
  type CollectionListFilters,
  type CollectionSortBy,
  type CollectionSortDir,
} from '@/lib/collection';
import {
  displayPlayer,
  displaySetName,
  formatGradeBadge,
  formatPlayerYearLine,
  formatPrice,
} from '@/lib/collection-presenter';
import { readJsonResponse } from '@/lib/http-json';

type ViewMode = 'grid' | 'list';

const SORT_OPTIONS: { value: `${CollectionSortBy}:${CollectionSortDir}`; label: string }[] = [
  { value: 'created_at:desc', label: 'Newest' },
  { value: 'created_at:asc', label: 'Oldest' },
  { value: 'player:asc', label: 'Player A-Z' },
  { value: 'grade:desc', label: 'Grade high to low' },
  { value: 'grade:asc', label: 'Grade low to high' },
];

function parseSortValue(value: string): Pick<CollectionListFilters, 'sortBy' | 'sortDir'> {
  const [sortBy, sortDir] = value.split(':') as [CollectionSortBy, CollectionSortDir];
  return { sortBy, sortDir };
}

export default function CollectionPage() {
  const [items, setItems] = useState<CollectionCardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [sportFilter, setSportFilter] = useState('All');
  const [conditionFilter, setConditionFilter] = useState('All');
  const [companyFilter, setCompanyFilter] = useState('All');
  const [sortValue, setSortValue] = useState('created_at:desc');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  useEffect(() => {
    const stored = window.localStorage.getItem('collection-view-mode');
    if (stored === 'grid' || stored === 'list') {
      setViewMode(stored);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem('collection-view-mode', viewMode);
  }, [viewMode]);

  const filters = useMemo<CollectionListFilters>(() => {
    const { sortBy, sortDir } = parseSortValue(sortValue);
    return {
      sport: sportFilter !== 'All' ? sportFilter : undefined,
      conditionType:
        conditionFilter === 'Graded' ? 'graded' : conditionFilter === 'Raw' ? 'raw' : undefined,
      gradingCompany: companyFilter !== 'All' ? companyFilter : undefined,
      search: search.trim() || undefined,
      sortBy,
      sortDir,
    };
  }, [sportFilter, conditionFilter, companyFilter, sortValue, search]);

  useEffect(() => {
    let cancelled = false;

    async function loadCollection() {
      setLoading(true);
      setError('');

      try {
        const query = buildCollectionQuery(filters);
        const response = await fetch(`/api/collection${query ? `?${query}` : ''}`);
        const data = await readJsonResponse<{ items?: CollectionCardItem[]; error?: string }>(response);

        if (!response.ok) {
          throw new Error(data.error ?? 'Unable to load collection.');
        }

        if (!cancelled) {
          setItems(data.items ?? []);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load collection.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    const debounceMs = filters.search ? 300 : 0;
    const timer = window.setTimeout(() => {
      void loadCollection();
    }, debounceMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [filters]);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight text-slate-950">
              My Collection
            </h1>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-600">
              {loading ? '…' : items.length}
            </span>
          </div>
          <p className="text-slate-600">Track owned cards, grades, and purchase details.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={'/collection/add' as Route}
            className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" />
            Add Card
          </Link>
          <Link
            href={'/import' as Route}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Upload className="h-4 w-4" />
            Import
          </Link>
        </div>
      </div>

      <div className="sticky top-0 z-10 space-y-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-soft backdrop-blur">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search player or set..."
            className="flex-1 rounded-full border border-slate-200 px-4 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`rounded-full border p-2 ${viewMode === 'grid' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600'}`}
              aria-label="Grid view"
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`rounded-full border p-2 ${viewMode === 'list' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600'}`}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <FilterSelect
            label="Sport"
            value={sportFilter}
            options={['All', ...SPORTS]}
            onChange={setSportFilter}
          />
          <FilterSelect
            label="Condition"
            value={conditionFilter}
            options={['All', 'Graded', 'Raw']}
            onChange={setConditionFilter}
          />
          <FilterSelect
            label="Company"
            value={companyFilter}
            options={['All', ...GRADING_COMPANIES.filter((c) => c !== 'Other')]}
            onChange={setCompanyFilter}
          />
          <FilterSelect
            label="Sort"
            value={sortValue}
            options={SORT_OPTIONS.map((o) => o.value)}
            labels={SORT_OPTIONS.reduce<Record<string, string>>((acc, o) => {
              acc[o.value] = o.label;
              return acc;
            }, {})}
            onChange={setSortValue}
          />
        </div>
      </div>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {loading ? (
        <CollectionSkeleton viewMode={viewMode} />
      ) : items.length === 0 ? (
        <EmptyCollection />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <CollectionGridCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <CollectionListTable items={items} />
      )}
    </section>
  );
}

function FilterSelect({
  label,
  value,
  options,
  labels,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  labels?: Record<string, string>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-600">
      <span className="font-medium">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 outline-none focus:border-brand-400"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {labels?.[option] ?? option}
          </option>
        ))}
      </select>
    </label>
  );
}

function CollectionGridCard({ item }: { item: CollectionCardItem }) {
  const player = displayPlayer(item);
  const year = item.year;
  const setName = displaySetName(item);
  const badge = formatGradeBadge(item.conditionType, item.grade, item.gradingCompany);
  const price = formatPrice(item.purchasePrice);

  return (
    <article className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-soft">
      <div className="aspect-[3/4] bg-slate-100">
        {item.frontImageUrl ? (
          <img src={item.frontImageUrl} alt={player} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-300">
            <CreditCard className="h-12 w-12" />
          </div>
        )}
      </div>
      <div className="space-y-2 p-4">
        <p className="font-semibold tracking-tight text-slate-950">{formatPlayerYearLine(player, year)}</p>
        {setName ? <p className="truncate text-sm text-slate-500">{setName}</p> : null}
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{badge}</span>
          {price ? <span className="text-xs text-slate-500">{price}</span> : null}
        </div>
      </div>
    </article>
  );
}

function CollectionListTable({ items }: { items: CollectionCardItem[] }) {
  return (
    <div className="overflow-x-auto rounded-[1.5rem] border border-slate-200 bg-white shadow-soft">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-[0.14em] text-slate-500">
          <tr>
            <th className="px-4 py-3">Photo</th>
            <th className="px-4 py-3">Player</th>
            <th className="px-4 py-3">Year</th>
            <th className="px-4 py-3">Set</th>
            <th className="px-4 py-3">Grade</th>
            <th className="px-4 py-3">Company</th>
            <th className="px-4 py-3">Bought</th>
            <th className="px-4 py-3">Paid</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const player = displayPlayer(item);
            const price = formatPrice(item.purchasePrice);
            return (
              <tr key={item.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3">
                  {item.frontImageUrl ? (
                    <img src={item.frontImageUrl} alt="" className="h-12 w-9 rounded object-cover" />
                  ) : (
                    <div className="flex h-12 w-9 items-center justify-center rounded bg-slate-100 text-slate-300">
                      <CreditCard className="h-5 w-5" />
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 font-medium text-slate-900">{player}</td>
                <td className="px-4 py-3 text-slate-600">{item.year ?? '—'}</td>
                <td className="max-w-[12rem] truncate px-4 py-3 text-slate-600">{displaySetName(item) ?? '—'}</td>
                <td className="px-4 py-3 text-slate-600">
                  {item.conditionType === 'graded' && item.grade != null ? item.grade : 'Raw'}
                </td>
                <td className="px-4 py-3 text-slate-600">{item.gradingCompany ?? '—'}</td>
                <td className="px-4 py-3 text-slate-600">{item.purchaseDate ?? '—'}</td>
                <td className="px-4 py-3 text-slate-600">{price ?? '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CollectionSkeleton({ viewMode }: { viewMode: ViewMode }) {
  const count = viewMode === 'grid' ? 9 : 6;

  if (viewMode === 'list') {
    return (
      <div className="space-y-2 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-soft">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="h-12 animate-pulse rounded-xl bg-slate-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-soft">
          <div className="aspect-[3/4] animate-pulse bg-slate-100" />
          <div className="space-y-2 p-4">
            <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyCollection() {
  return (
    <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50 px-8 py-16 text-center">
      <CreditCard className="mx-auto h-12 w-12 text-slate-300" />
      <h2 className="mt-4 text-xl font-semibold text-slate-900">No cards yet.</h2>
      <p className="mt-2 text-sm text-slate-600">Add your first card manually or import purchases later.</p>
      <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link
          href={'/collection/add' as Route}
          className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-medium text-white hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" />
          Add Your First Card
        </Link>
        <Link
          href={'/import' as Route}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <Upload className="h-4 w-4" />
          Import from eBay
        </Link>
      </div>
    </div>
  );
}
