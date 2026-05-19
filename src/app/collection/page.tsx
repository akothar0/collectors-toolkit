'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { Grid3X3, List, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  GRADING_COMPANIES, SPORTS, buildCollectionQuery,
  type CollectionCardItem, type CollectionListFilters,
  type CollectionSortBy, type CollectionSortDir,
} from '@/lib/collection';
import {
  displayPlayer, displaySetName, formatGradeBadge, formatPrice,
} from '@/lib/collection-presenter';
import { FetchErrorBanner } from '@/components/fetch-error-banner';
import { Eyebrow, Rule } from '@/components/editorial';
import { Slab, type SlabHolding } from '@/components/Slab';
import { readJsonResponse } from '@/lib/http-json';

const SPORT_TINTS: Record<string, string> = {
  NBA: '#0c2340', NFL: '#8b1a1a', MLB: '#1a3a1a', WNBA: '#b8860b',
};

const SORT_OPTIONS: { value: `${CollectionSortBy}:${CollectionSortDir}`; label: string }[] = [
  { value: 'created_at:desc', label: 'Newest' },
  { value: 'created_at:asc',  label: 'Oldest' },
  { value: 'player:asc',      label: 'Player A–Z' },
  { value: 'grade:desc',      label: 'Grade ↓' },
  { value: 'grade:asc',       label: 'Grade ↑' },
];

function parseSortValue(v: string): Pick<CollectionListFilters, 'sortBy' | 'sortDir'> {
  const [sortBy, sortDir] = v.split(':') as [CollectionSortBy, CollectionSortDir];
  return { sortBy, sortDir };
}

function itemToSlab(item: CollectionCardItem): SlabHolding {
  return {
    player: displayPlayer(item),
    year: item.year ?? 2020,
    set: displaySetName(item) ?? '',
    grade: formatGradeBadge(item.conditionType, item.grade, item.gradingCompany),
    sport: item.sport ?? null,
    tint: SPORT_TINTS[item.sport ?? ''] ?? '#2d2e34',
    imageUrl: item.frontImageUrl ?? null,
  };
}

export default function CollectionPage() {
  const router = useRouter();
  const [items, setItems]         = useState<CollectionCardItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [sport, setSport]         = useState('All');
  const [condition, setCondition] = useState('All');
  const [company, setCompany]     = useState('All');
  const [sortValue, setSortValue] = useState('created_at:desc');
  const [search, setSearch]       = useState('');
  const [viewMode, setViewMode]   = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    const stored = window.localStorage.getItem('collection-view-mode');
    if (stored === 'grid' || stored === 'list') setViewMode(stored);
  }, []);
  useEffect(() => {
    window.localStorage.setItem('collection-view-mode', viewMode);
  }, [viewMode]);

  const filters = useMemo<CollectionListFilters>(() => ({
    ...parseSortValue(sortValue),
    sport: sport !== 'All' ? sport : undefined,
    conditionType: condition === 'Graded' ? 'graded' : condition === 'Raw' ? 'raw' : undefined,
    gradingCompany: company !== 'All' ? company : undefined,
    search: search.trim() || undefined,
  }), [sport, condition, company, sortValue, search]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setError('');
      try {
        const query = buildCollectionQuery(filters);
        const res = await fetch(`/api/collection${query ? `?${query}` : ''}`);
        const data = await readJsonResponse<{ items?: CollectionCardItem[]; error?: string }>(res);
        if (!res.ok) throw new Error(data.error ?? 'Unable to load collection.');
        if (!cancelled) setItems(data.items ?? []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Unable to load collection.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    const t = window.setTimeout(() => { void load(); }, filters.search ? 300 : 0);
    return () => { cancelled = true; window.clearTimeout(t); };
  }, [filters]);

  const gradedCount = items.filter(i => i.conditionType === 'graded').length;
  const rawCount = items.filter(i => i.conditionType !== 'graded').length;
  const totalValue = items.reduce((s, i) => s + (i.currentValue ?? i.purchasePrice ?? 0), 0);

  return (
    <section className="space-y-6">
      {/* Masthead */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <Eyebrow>Your collection</Eyebrow>
          <h1 className="mt-1 font-serif italic text-[48px] leading-none tracking-tight text-ink">
            {loading ? '…' : <><span className="text-accent">{items.length}</span> cards.</>}
          </h1>
          {!loading && items.length > 0 && (
            <p className="mt-1.5 font-mono text-[11px] text-ink-3">
              {gradedCount} graded · {rawCount} raw
              {totalValue > 0 ? ` · ${formatPrice(totalValue) ?? ''}` : ''}
            </p>
          )}
        </div>
        <Link href="/collection/add" className="inline-flex h-9 items-center gap-2 rounded-md bg-ink px-4 text-[13px] font-medium text-paper hover:bg-ink/90">
          + Add card
        </Link>
      </div>

      <Rule />

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* View toggle */}
        <div className="flex rounded border border-rule overflow-hidden">
          {([{ mode: 'grid', icon: <Grid3X3 className="h-3.5 w-3.5" /> }, { mode: 'list', icon: <List className="h-3.5 w-3.5" /> }] as const).map(v => (
            <button key={v.mode} type="button" onClick={() => setViewMode(v.mode)}
              className={`flex h-8 w-8 items-center justify-center transition-colors ${viewMode === v.mode ? 'bg-ink text-paper' : 'text-ink-3 hover:text-ink'}`}>
              {v.icon}
            </button>
          ))}
        </div>

        {/* Filters */}
        {[
          { label: 'Sport', value: sport, options: ['All', ...SPORTS], set: setSport },
          { label: 'Condition', value: condition, options: ['All', 'Graded', 'Raw'], set: setCondition },
          { label: 'Company', value: company, options: ['All', ...GRADING_COMPANIES.filter(c => c !== 'Other')], set: setCompany },
        ].map(f => (
          <select key={f.label} value={f.value} onChange={e => f.set(e.target.value)}
            className="h-8 rounded border border-rule bg-surface px-2.5 font-mono text-[11px] text-ink-2 outline-none focus:border-ink hover:border-ink-2 transition-colors">
            {f.options.map(o => <option key={o} value={o}>{o === 'All' ? f.label + ': All' : o}</option>)}
          </select>
        ))}

        <select value={sortValue} onChange={e => setSortValue(e.target.value)}
          className="h-8 rounded border border-rule bg-surface px-2.5 font-mono text-[11px] text-ink-2 outline-none focus:border-ink hover:border-ink-2 transition-colors">
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        {/* Search */}
        <div className="ml-auto flex items-center gap-2 rounded border border-rule px-2.5 h-8">
          <Search className="h-3 w-3 text-ink-3" />
          <input type="search" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search player or set…"
            className="w-40 bg-transparent font-mono text-[11px] text-ink placeholder:text-ink-3 outline-none" />
        </div>
      </div>

      {error && <FetchErrorBanner message={error} onRetry={() => { void (async () => {
        setLoading(true); setError('');
        try {
          const res = await fetch(`/api/collection?${buildCollectionQuery(filters)}`);
          const data = await readJsonResponse<{ items?: CollectionCardItem[]; error?: string }>(res);
          if (!res.ok) throw new Error(data.error ?? 'Unable to load collection.');
          setItems(data.items ?? []);
        } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load collection.'); }
        finally { setLoading(false); }
      })(); }} />}

      {/* Content */}
      {loading ? (
        <CollectionSkeleton viewMode={viewMode} />
      ) : items.length === 0 ? (
        <EmptyCollection />
      ) : viewMode === 'grid' ? (
        <div className="grid gap-5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {items.map(item => <GridCard key={item.id} item={item} />)}
        </div>
      ) : (
        <TableView items={items} onSelect={id => router.push(`/collection/${id}` as Route)} />
      )}
    </section>
  );
}

function GridCard({ item }: { item: CollectionCardItem }) {
  const player = displayPlayer(item);
  const badge = formatGradeBadge(item.conditionType, item.grade, item.gradingCompany);
  const value = formatPrice(item.currentValue ?? item.purchasePrice);
  return (
    <Link href={`/collection/${item.id}` as Route} className="group block space-y-2">
      <div className="flex justify-center">
        <Slab holding={itemToSlab(item)} width={140} height={210} flavor="light"
          className="transition-transform group-hover:scale-[1.02]" />
      </div>
      <div className="space-y-0.5">
        <p className="font-serif italic text-[14px] text-ink truncate">{player}</p>
        <p className="font-mono text-[10px] text-ink-3">
          {item.year ? `${item.year} · ` : ''}{badge}
        </p>
        {value && <p className="font-serif italic text-[13px] text-ink-2">{value}</p>}
      </div>
    </Link>
  );
}

function TableView({ items, onSelect }: { items: CollectionCardItem[]; onSelect: (id: string) => void }) {
  return (
    <div className="rounded border border-rule overflow-hidden">
      <div className="hidden lg:grid lg:grid-cols-[32px_56px_1fr_80px_80px_90px] lg:gap-3 lg:bg-surface-2 lg:px-4 lg:py-2.5 border-b border-rule">
        {['#', 'CARD', 'PLAYER · SET', 'SPORT', 'GRADE', 'VALUE'].map(h => <Eyebrow key={h}>{h}</Eyebrow>)}
      </div>
      {items.map((item, i) => {
        const player = displayPlayer(item);
        const set = displaySetName(item);
        const badge = formatGradeBadge(item.conditionType, item.grade, item.gradingCompany);
        const value = formatPrice(item.currentValue ?? item.purchasePrice);
        return (
          <div key={item.id} onClick={() => onSelect(item.id)}
            className="flex cursor-pointer items-center gap-3 border-b border-rule-soft last:border-b-0 px-4 py-3 hover:bg-surface-2 lg:grid lg:grid-cols-[32px_56px_1fr_80px_80px_90px]">
            <span className="hidden lg:block font-mono text-[10px] text-ink-4">{String(i + 1).padStart(2, '0')}</span>
            <div className="flex justify-center">
              <Slab holding={itemToSlab(item)} width={36} height={54} showLabel={false} flavor="light" />
            </div>
            <div className="min-w-0">
              <p className="font-serif italic text-[14px] text-ink truncate">{player}</p>
              {set && <p className="font-mono text-[10px] text-ink-3 truncate">{set}</p>}
            </div>
            <span className="font-mono text-[11px] text-ink-3">{item.sport ?? '—'}</span>
            <span className="font-mono text-[11px] text-ink-2">{badge}</span>
            <span className="font-serif italic text-[14px] text-ink text-right">{value ?? '—'}</span>
          </div>
        );
      })}
    </div>
  );
}

function CollectionSkeleton({ viewMode }: { viewMode: 'grid' | 'list' }) {
  return viewMode === 'grid' ? (
    <div className="grid gap-5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="aspect-[2/3] animate-pulse rounded bg-rule" />
          <div className="h-3 w-3/4 animate-pulse rounded bg-rule" />
        </div>
      ))}
    </div>
  ) : (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-14 animate-pulse rounded border border-rule bg-surface" />
      ))}
    </div>
  );
}

function EmptyCollection() {
  return (
    <div className="py-24 text-center">
      <p className="font-serif italic text-[32px] text-ink-2">Your collection is empty.</p>
      <p className="mt-2 text-[14px] text-ink-3">Capture your first card.</p>
      <div className="mt-6 flex justify-center gap-3">
        <Link href="/collection/add" className="inline-flex h-9 items-center gap-2 rounded-md bg-ink px-4 text-[13px] font-medium text-paper hover:bg-ink/90">
          Add manually
        </Link>
        <Link href="/import" className="inline-flex h-9 items-center gap-2 rounded border border-rule px-4 text-[13px] font-medium text-ink hover:bg-surface-2">
          Import
        </Link>
      </div>
    </div>
  );
}
