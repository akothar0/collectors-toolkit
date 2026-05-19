'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { Layers, Plus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { FetchErrorBanner } from '@/components/fetch-error-banner';
import { ProgressBar } from '@/components/progress-bar';
import { readJsonResponse } from '@/lib/http-json';
import type { SetListItem } from '@/lib/sets';

const SPORTS = ['Baseball', 'Basketball', 'Football', 'Soccer', 'Hockey', 'Other'];

export default function SetsPage() {
  const [sets, setSets] = useState<SetListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [year, setYear] = useState('');
  const [sport, setSport] = useState('Baseball');
  const [totalCards, setTotalCards] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/sets');
      const data = await readJsonResponse<{ sets?: SetListItem[]; error?: string }>(response);
      if (!response.ok) throw new Error(data.error ?? 'Unable to load sets.');
      setSets(data.sets ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load sets.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          year: year.trim() ? Number.parseInt(year, 10) : null,
          sport,
          totalCards: Number.parseInt(totalCards, 10),
        }),
      });
      const data = await readJsonResponse<SetListItem & { error?: string }>(response);
      if (!response.ok) throw new Error(data.error ?? 'Unable to create set.');
      setModalOpen(false);
      setName('');
      setYear('');
      setTotalCards('');
      await load();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to create set.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-brand-600">Sets</p>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
            Set Completion
          </h1>
          <p className="max-w-2xl text-base leading-7 text-slate-600">
            Track which card numbers you own in each set you are building.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brand-600 px-5 py-3 text-sm font-medium text-white hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" />
          Track a New Set
        </button>
      </div>

      {error && !modalOpen ? <FetchErrorBanner message={error} onRetry={() => void load()} /> : null}

      {loading ? (
        <ul className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <li key={index} className="h-24 animate-pulse rounded-[1.75rem] bg-slate-100" />
          ))}
        </ul>
      ) : sets.length === 0 ? (
        <div className="rounded-[1.75rem] border border-dashed border-slate-200 bg-white px-8 py-16 text-center shadow-soft">
          <Layers className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-4 text-lg font-medium text-slate-950">No sets tracked</p>
          <p className="mt-2 text-sm text-slate-600">Add a set to start checking off card numbers.</p>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="mt-6 inline-flex min-h-11 items-center rounded-full bg-brand-600 px-5 py-3 text-sm font-medium text-white hover:bg-brand-700"
          >
            Track a Set
          </button>
        </div>
      ) : (
        <ul className="space-y-4">
          {sets.map((set) => (
            <li
              key={set.id}
              className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-soft"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">{set.name}</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {[set.year, set.sport].filter(Boolean).join(' · ') || 'Set'}
                  </p>
                </div>
                <Link
                  href={`/sets/${set.id}` as Route}
                  className="inline-flex min-h-11 items-center rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  View
                </Link>
              </div>
              <div className="mt-4">
                <ProgressBar value={set.cardsOwned} max={set.totalCards} />
              </div>
            </li>
          ))}
        </ul>
      )}

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 sm:items-center sm:p-4">
          <div className="max-h-[100dvh] w-full overflow-y-auto rounded-t-3xl border border-slate-200 bg-white p-6 shadow-soft sm:max-w-lg sm:rounded-3xl">
            <h2 className="text-xl font-semibold text-slate-950">Track a New Set</h2>
            <form className="mt-6 space-y-4" onSubmit={(event) => void handleCreate(event)}>
              <label className="block space-y-2 text-sm">
                <span className="font-medium text-slate-700">Set Name</span>
                <input
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="min-h-11 w-full rounded-xl border border-slate-200 px-3"
                />
              </label>
              <label className="block space-y-2 text-sm">
                <span className="font-medium text-slate-700">Year</span>
                <input
                  value={year}
                  onChange={(event) => setYear(event.target.value)}
                  inputMode="numeric"
                  className="min-h-11 w-full rounded-xl border border-slate-200 px-3"
                />
              </label>
              <label className="block space-y-2 text-sm">
                <span className="font-medium text-slate-700">Sport</span>
                <select
                  value={sport}
                  onChange={(event) => setSport(event.target.value)}
                  className="min-h-11 w-full rounded-xl border border-slate-200 px-3"
                >
                  {SPORTS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-2 text-sm">
                <span className="font-medium text-slate-700">Total Cards</span>
                <input
                  required
                  value={totalCards}
                  onChange={(event) => setTotalCards(event.target.value)}
                  inputMode="numeric"
                  min={1}
                  className="min-h-11 w-full rounded-xl border border-slate-200 px-3"
                />
              </label>
              {error ? <p className="text-sm text-rose-600">{error}</p> : null}
              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="min-h-11 flex-1 rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Create Set'}
                </button>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="min-h-11 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
