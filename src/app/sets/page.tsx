'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { FetchErrorBanner } from '@/components/fetch-error-banner';
import { Eyebrow, Rule } from '@/components/editorial';
import { readJsonResponse } from '@/lib/http-json';
import type { SetListItem } from '@/lib/sets';
import { setPercent } from '@/lib/sets';

const SPORTS = ['Baseball', 'Basketball', 'Football', 'Soccer', 'Hockey', 'Other'];

function BitGridPreview({ owned, total }: { owned: number; total: number }) {
  const squares = Math.min(total, 80);
  const ownedCount = Math.round((owned / total) * squares);
  return (
    <div className="flex flex-wrap gap-[3px]">
      {Array.from({ length: squares }).map((_, i) => (
        <div key={i} className={`h-1 w-1 rounded-[1px] ${i < ownedCount ? 'bg-ink' : 'bg-rule'}`} />
      ))}
    </div>
  );
}

const inputCls = 'h-10 w-full rounded border border-rule bg-surface-2 px-3 text-[13px] text-ink outline-none focus:border-ink';

export default function SetsPage() {
  const [sets, setSets]     = useState<SetListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName]       = useState('');
  const [year, setYear]       = useState('');
  const [sport, setSport]     = useState('Baseball');
  const [totalCards, setTotalCards] = useState('');
  const [modalError, setModalError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/sets');
      const data = await readJsonResponse<{ sets?: SetListItem[]; error?: string }>(res);
      if (!res.ok) throw new Error(data.error ?? 'Unable to load sets.');
      setSets(data.sets ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load sets.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setModalError('');
    try {
      const res = await fetch('/api/sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          year: year.trim() ? Number.parseInt(year, 10) : null,
          sport,
          totalCards: Number.parseInt(totalCards, 10),
        }),
      });
      const data = await readJsonResponse<SetListItem & { error?: string }>(res);
      if (!res.ok) throw new Error(data.error ?? 'Unable to create set.');
      setModalOpen(false); setName(''); setYear(''); setTotalCards(''); setModalError('');
      await load();
    } catch (e) {
      setModalError(e instanceof Error ? e.message : 'Unable to create set.');
    } finally { setSaving(false); }
  }

  return (
    <section className="space-y-8">
      {/* Masthead */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <Eyebrow>Sets</Eyebrow>
          <h1 className="mt-1.5 font-serif italic text-[48px] leading-none tracking-tight text-ink">
            Track your sets.
          </h1>
        </div>
        <button type="button" onClick={() => setModalOpen(true)}
          className="inline-flex h-9 items-center gap-2 rounded-md bg-ink px-4 text-[13px] font-medium text-paper hover:bg-ink/90">
          + Track a set
        </button>
      </div>

      <Rule />

      {error && <FetchErrorBanner message={error} onRetry={() => void load()} />}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 animate-pulse rounded border border-rule bg-surface" />)}
        </div>
      ) : sets.length === 0 ? (
        <div className="py-24 text-center">
          <p className="font-serif italic text-[32px] text-ink-2">No sets tracked yet.</p>
          <p className="mt-2 text-[14px] text-ink-3">Add a set to start checking off card numbers.</p>
          <button type="button" onClick={() => setModalOpen(true)}
            className="mt-6 inline-flex h-9 items-center gap-2 rounded-md bg-ink px-4 text-[13px] font-medium text-paper hover:bg-ink/90">
            Track a set
          </button>
        </div>
      ) : (
        <ul className="space-y-3">
          {sets.map(set => {
            const pct = setPercent(set.cardsOwned, set.totalCards);
            return (
              <li key={set.id} className="rounded border border-rule bg-surface px-5 py-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-serif italic text-[22px] text-ink leading-tight">{set.name}</h2>
                    <p className="font-mono text-[10px] text-ink-3">
                      {[set.year, set.sport].filter(Boolean).join(' · ') || 'Set'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-serif italic text-[32px] leading-none text-ink">{pct}%</p>
                    <p className="font-mono text-[10px] text-ink-3">{set.cardsOwned}/{set.totalCards}</p>
                  </div>
                </div>
                <BitGridPreview owned={set.cardsOwned} total={set.totalCards} />
                <div className="flex items-center justify-between">
                  <p className="font-mono text-[10px] text-ink-3">{set.cardsOwned} of {set.totalCards} cards</p>
                  <Link href={`/sets/${set.id}` as Route}
                    className="font-mono text-[11px] text-ink-3 hover:text-ink">
                    View →
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Create set modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-4">
          <div className="max-h-[100dvh] w-full overflow-y-auto rounded-t-2xl border border-rule bg-surface p-6 shadow-popover sm:max-w-md sm:rounded">
            <h2 className="font-serif italic text-[28px] text-ink">Track a new set.</h2>
            <form className="mt-5 space-y-4" onSubmit={e => void handleCreate(e)}>
              {[
                { label: 'Set name', value: name, set: setName, required: true, type: 'text' },
                { label: 'Year', value: year, set: setYear, required: false, type: 'number', inputMode: 'numeric' as const },
              ].map(f => (
                <label key={f.label} className="block">
                  <Eyebrow className="mb-1.5">{f.label}{!f.required && <span className="normal-case text-ink-4 ml-1">(optional)</span>}</Eyebrow>
                  <input type={f.type} value={f.value} onChange={e => f.set(e.target.value)}
                    required={f.required} className={inputCls} />
                </label>
              ))}
              <label className="block">
                <Eyebrow className="mb-1.5">Sport</Eyebrow>
                <select value={sport} onChange={e => setSport(e.target.value)} className={inputCls}>
                  {SPORTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label className="block">
                <Eyebrow className="mb-1.5">Total cards in set</Eyebrow>
                <input type="number" min={1} required value={totalCards}
                  onChange={e => setTotalCards(e.target.value)} className={inputCls} />
              </label>
              {modalError && <p className="font-mono text-[11px] text-negative">{modalError}</p>}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving}
                  className="inline-flex flex-1 h-10 items-center justify-center gap-2 rounded-md bg-ink text-[13px] font-medium text-paper hover:bg-ink/90 disabled:opacity-50">
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {saving ? 'Creating…' : 'Create set'}
                </button>
                <button type="button" onClick={() => { setModalOpen(false); setModalError(''); }}
                  className="inline-flex h-10 items-center rounded border border-rule px-4 text-[13px] font-medium text-ink hover:bg-surface-2">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
