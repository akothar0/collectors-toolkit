'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { Share2 } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FetchErrorBanner } from '@/components/fetch-error-banner';
import { Eyebrow, Rule } from '@/components/editorial';
import { readJsonResponse } from '@/lib/http-json';
import { setPercent, type SetProgressDetail } from '@/lib/sets';

type FilterMode = 'all' | 'missing';

export default function SetDetailPage() {
  const params = useParams<{ setId: string }>();
  const setId = params.setId;

  const [data,     setData]     = useState<SetProgressDetail | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [filter,   setFilter]   = useState<FilterMode>('all');
  const [copied,   setCopied]   = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/sets/${setId}/progress`);
      const payload = await readJsonResponse<SetProgressDetail & { error?: string }>(res);
      if (!res.ok) throw new Error(payload.error ?? 'Unable to load set.');
      setData(payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load set.');
    } finally { setLoading(false); }
  }, [setId]);

  useEffect(() => { void load(); }, [load]);

  const slots = useMemo(() => {
    if (!data) return [];
    return Array.from({ length: data.set.totalCards }, (_, i) => {
      const number = String(i + 1);
      return { number, owned: Boolean(data.cardChecklist[number]) };
    });
  }, [data]);

  const visibleSlots = useMemo(() =>
    filter === 'missing' ? slots.filter(s => !s.owned) : slots
  , [filter, slots]);

  async function toggleCard(cardNumber: string, owned: boolean) {
    setToggling(cardNumber);
    try {
      const res = await fetch(`/api/sets/${setId}/progress`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardNumber, owned: !owned }),
      });
      const payload = await readJsonResponse<SetProgressDetail & { error?: string }>(res);
      if (!res.ok) throw new Error(payload.error ?? 'Unable to update card.');
      setData(payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to update card.');
    } finally { setToggling(null); }
  }

  async function shareProgress() {
    if (!data) return;
    const text = `I have ${data.cardsOwned}/${data.set.totalCards} cards in ${data.set.name}!`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch { setError('Unable to copy.'); }
  }

  if (loading) {
    return (
      <section className="space-y-6">
        <div className="h-16 animate-pulse rounded border border-rule bg-surface" />
        <div className="h-1 animate-pulse rounded bg-rule" />
        <div className="grid grid-cols-[repeat(20,1fr)] gap-1">
          {[...Array(40)].map((_, i) => <div key={i} className="aspect-square animate-pulse rounded bg-rule" />)}
        </div>
      </section>
    );
  }

  if (error && !data) {
    return (
      <section className="space-y-4">
        <Link href="/sets" className="font-mono text-[11px] text-ink-3 hover:text-ink">← All sets</Link>
        <FetchErrorBanner message={error} onRetry={() => void load()} />
      </section>
    );
  }

  if (!data) return null;

  const percent = setPercent(data.cardsOwned, data.set.totalCards);
  const missingSlots = slots.filter(s => !s.owned);

  return (
    <section className="space-y-8">
      <Link href={'/sets' as Route} className="font-mono text-[11px] text-ink-3 hover:text-ink">← All sets</Link>

      {/* Masthead */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif italic text-[40px] leading-tight text-ink">{data.set.name}</h1>
          <p className="font-mono text-[11px] text-ink-3">
            {[data.set.year, data.set.sport].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-serif italic text-[56px] leading-none text-ink">{percent}%</p>
          <p className="font-mono text-[10px] text-ink-3">
            {data.cardsOwned}/{data.set.totalCards} complete
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 overflow-hidden rounded-full bg-rule">
        <div className="h-full rounded-full bg-ink transition-all" style={{ width: `${percent}%` }} />
      </div>

      {error && <FetchErrorBanner message={error} onRetry={() => void load()} />}

      {/* Controls */}
      <div className="flex items-center gap-2">
        {(['all', 'missing'] as const).map(f => (
          <button key={f} type="button" onClick={() => setFilter(f)}
            className={`rounded border px-3 py-1.5 font-mono text-[11px] transition-colors ${
              filter === f ? 'border-ink bg-ink text-paper' : 'border-rule text-ink-3 hover:border-ink hover:text-ink'
            }`}>
            {f === 'all' ? 'All' : 'Missing only'}
          </button>
        ))}
        <button type="button" onClick={() => void shareProgress()}
          className="ml-auto inline-flex items-center gap-1.5 rounded border border-rule px-3 py-1.5 font-mono text-[11px] text-ink-3 hover:border-ink hover:text-ink">
          <Share2 className="h-3 w-3" />
          {copied ? 'Copied!' : 'Share'}
        </button>
      </div>

      {/* Bit-grid */}
      <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(20, minmax(0, 1fr))' }}>
        {visibleSlots.map(slot => (
          <button key={slot.number} type="button" disabled={toggling === slot.number}
            onClick={() => void toggleCard(slot.number, slot.owned)}
            title={`#${slot.number}`}
            className={`flex aspect-square items-center justify-center rounded-[2px] font-mono text-[9px] transition-colors disabled:opacity-60 ${
              slot.owned
                ? 'bg-ink text-paper'
                : 'bg-rule text-ink-3 hover:bg-ink/20'
            }`}>
            {slot.number}
          </button>
        ))}
      </div>

      {/* Hunting list */}
      {filter === 'all' && missingSlots.length > 0 && (
        <div>
          <Rule className="mb-5" />
          <Eyebrow className="mb-3">Still hunting</Eyebrow>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {missingSlots.slice(0, 36).map(slot => {
              const query = new URLSearchParams({ _nkw: `${data.set.name} #${slot.number}`, LH_Sold: '1', LH_Complete: '1' });
              return (
                <div key={slot.number} className="flex items-center justify-between gap-3 rounded border border-rule px-3 py-2">
                  <span className="font-mono text-[11px] text-ink">#{slot.number}</span>
                  <a href={`https://www.ebay.com/sch/i.html?${query}`} target="_blank" rel="noreferrer"
                    className="font-mono text-[10px] text-accent hover:underline">
                    eBay →
                  </a>
                </div>
              );
            })}
          </div>
          {missingSlots.length > 36 && (
            <p className="mt-3 font-mono text-[10px] text-ink-3">+{missingSlots.length - 36} more — switch to &ldquo;Missing only&rdquo; view to see all</p>
          )}
        </div>
      )}
    </section>
  );
}
