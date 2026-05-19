'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { Share2 } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FetchErrorBanner } from '@/components/fetch-error-banner';
import { ProgressBar } from '@/components/progress-bar';
import { readJsonResponse } from '@/lib/http-json';
import { setPercent, type SetProgressDetail } from '@/lib/sets';

type FilterMode = 'all' | 'missing';

export default function SetDetailPage() {
  const params = useParams<{ setId: string }>();
  const setId = params.setId;
  const [data, setData] = useState<SetProgressDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [copied, setCopied] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/sets/${setId}/progress`);
      const payload = await readJsonResponse<SetProgressDetail & { error?: string }>(response);
      if (!response.ok) throw new Error(payload.error ?? 'Unable to load set.');
      setData(payload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load set.');
    } finally {
      setLoading(false);
    }
  }, [setId]);

  useEffect(() => {
    void load();
  }, [load]);

  const slots = useMemo(() => {
    if (!data) return [];
    return Array.from({ length: data.set.totalCards }, (_, index) => {
      const number = String(index + 1);
      return { number, owned: Boolean(data.cardChecklist[number]) };
    });
  }, [data]);

  const visibleSlots = useMemo(() => {
    if (filter === 'missing') {
      return slots.filter((slot) => !slot.owned);
    }
    return slots;
  }, [filter, slots]);

  async function toggleCard(cardNumber: string, owned: boolean) {
    setToggling(cardNumber);
    try {
      const response = await fetch(`/api/sets/${setId}/progress`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardNumber, owned: !owned }),
      });
      const payload = await readJsonResponse<SetProgressDetail & { error?: string }>(response);
      if (!response.ok) throw new Error(payload.error ?? 'Unable to update card.');
      setData(payload);
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : 'Unable to update card.');
    } finally {
      setToggling(null);
    }
  }

  async function shareProgress() {
    if (!data) return;
    const text = `I have ${data.cardsOwned}/${data.set.totalCards} cards in ${data.set.name}!`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Unable to copy share text.');
    }
  }

  if (loading) {
    return (
      <section className="space-y-6">
        <div className="h-24 animate-pulse rounded-3xl bg-slate-100" />
        <div className="h-4 animate-pulse rounded-full bg-slate-100" />
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
          {Array.from({ length: 24 }).map((_, index) => (
            <div key={index} className="aspect-square animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      </section>
    );
  }

  if (error && !data) {
    return (
      <section className="space-y-6">
        <Link href={'/sets' as Route} className="text-sm text-brand-600 hover:underline">
          ← All sets
        </Link>
        <FetchErrorBanner message={error} onRetry={() => void load()} />
      </section>
    );
  }

  if (!data) return null;

  const percent = setPercent(data.cardsOwned, data.set.totalCards);

  return (
    <section className="space-y-8">
      <Link href={'/sets' as Route} className="text-sm text-brand-600 hover:underline">
        ← All sets
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-slate-950">
            {data.set.name}
          </h1>
          {data.set.year ? (
            <p className="mt-1 text-lg text-slate-600">{data.set.year}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => void shareProgress()}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <Share2 className="h-4 w-4" />
          {copied ? 'Copied!' : 'Share Progress'}
        </button>
      </div>

      {error ? <FetchErrorBanner message={error} onRetry={() => void load()} /> : null}

      <ProgressBar
        value={data.cardsOwned}
        max={data.set.totalCards}
        label={`${data.cardsOwned}/${data.set.totalCards} cards (${percent}%)`}
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`min-h-11 rounded-full px-4 py-2 text-sm font-medium ${
            filter === 'all' ? 'bg-slate-900 text-white' : 'border border-slate-200 text-slate-700'
          }`}
        >
          Show all
        </button>
        <button
          type="button"
          onClick={() => setFilter('missing')}
          className={`min-h-11 rounded-full px-4 py-2 text-sm font-medium ${
            filter === 'missing'
              ? 'bg-slate-900 text-white'
              : 'border border-slate-200 text-slate-700'
          }`}
        >
          Show missing only
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
        {visibleSlots.map((slot) => (
          <button
            key={slot.number}
            type="button"
            disabled={toggling === slot.number}
            onClick={() => void toggleCard(slot.number, slot.owned)}
            className={`flex aspect-square items-center justify-center rounded-lg border text-sm font-semibold transition-colors ${
              slot.owned
                ? 'border-emerald-600 bg-emerald-600 text-white'
                : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'
            }`}
          >
            {slot.number}
          </button>
        ))}
      </div>
    </section>
  );
}
