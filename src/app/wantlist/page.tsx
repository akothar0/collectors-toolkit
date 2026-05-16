'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { buildWantListAddUrl, type WantListItem } from '@/lib/wantlist';
import { formatDateLabel, formatPrice } from '@/lib/collection-presenter';
import { readJsonResponse } from '@/lib/http-json';

export default function WantListPage() {
  const router = useRouter();
  const [items, setItems] = useState<WantListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [description, setDescription] = useState('');
  const [player, setPlayer] = useState('');
  const [year, setYear] = useState('');
  const [setName, setSetName] = useState('');
  const [targetGrade, setTargetGrade] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [adding, setAdding] = useState(false);

  const [fulfillPrompt, setFulfillPrompt] = useState<WantListItem | null>(null);

  async function loadItems() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/wantlist');
      const data = await readJsonResponse<{ items?: WantListItem[]; error?: string }>(response);
      if (!response.ok) throw new Error(data.error ?? 'Unable to load want list.');
      setItems(data.items ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load want list.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadItems();
  }, []);

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    if (!description.trim()) {
      setError('Description is required.');
      return;
    }

    setAdding(true);
    setError('');
    try {
      const response = await fetch('/api/wantlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description.trim(),
          player: player.trim() || null,
          year: year.trim() ? Number.parseInt(year, 10) : null,
          setName: setName.trim() || null,
          targetGrade: targetGrade.trim() ? Number.parseFloat(targetGrade) : null,
          targetPrice: targetPrice.trim() ? Number.parseFloat(targetPrice) : null,
          notes: notes.trim() || null,
        }),
      });
      const data = await readJsonResponse<WantListItem & { error?: string }>(response);
      if (!response.ok) throw new Error(data.error ?? 'Unable to add item.');

      setDescription('');
      setPlayer('');
      setYear('');
      setSetName('');
      setTargetGrade('');
      setTargetPrice('');
      setNotes('');
      await loadItems();
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : 'Unable to add item.');
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const response = await fetch(`/api/wantlist/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const data = await readJsonResponse<{ error?: string }>(response);
        throw new Error(data.error ?? 'Unable to delete item.');
      }
      setItems((current) => current.filter((item) => item.id !== id));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete item.');
    }
  }

  async function handleMarkFound(item: WantListItem) {
    try {
      const response = await fetch(`/api/wantlist/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fulfilled: true }),
      });
      if (!response.ok) {
        const data = await readJsonResponse<{ error?: string }>(response);
        throw new Error(data.error ?? 'Unable to mark as found.');
      }
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      setFulfillPrompt(item);
    } catch (foundError) {
      setError(foundError instanceof Error ? foundError.message : 'Unable to mark as found.');
    }
  }

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight text-slate-950">
            Want List
          </h1>
          <p className="mt-2 text-slate-600">
            Track cards you are hunting.{' '}
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-sm font-medium">
              {loading ? '…' : items.length}
            </span>
          </p>
        </div>
      </div>

      <form
        onSubmit={handleAdd}
        className="space-y-4 rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-soft md:p-8"
      >
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Add item</h2>
        <label className="block text-sm font-medium text-slate-700">
          Description <span className="text-rose-500">*</span>
          <input
            type="text"
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="2011 Topps Update Mike Trout RC"
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block text-sm font-medium text-slate-700">
            Player
            <input
              type="text"
              value={player}
              onChange={(e) => setPlayer(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Year
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Set
            <input
              type="text"
              value={setName}
              onChange={(e) => setSetName(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500"
            />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">
            Target grade
            <input
              type="number"
              step="0.5"
              min={1}
              max={10}
              value={targetGrade}
              onChange={(e) => setTargetGrade(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Target price ($)
            <input
              type="number"
              min={0}
              step="0.01"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500"
            />
          </label>
        </div>
        <label className="block text-sm font-medium text-slate-700">
          Notes
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500"
          />
        </label>
        <button
          type="submit"
          disabled={adding}
          className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Add to Want List
        </button>
      </form>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {loading ? (
        <p className="text-slate-600">Loading...</p>
      ) : items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-600">
          No active want list items.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-3 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-soft sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-semibold text-slate-950">{item.description}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {[item.player, item.year, item.setName].filter(Boolean).join(' · ') || 'No details'}
                  {item.targetGrade != null ? ` · Target grade ${item.targetGrade}` : ''}
                  {item.targetPrice != null ? ` · ${formatPrice(item.targetPrice)}` : ''}
                </p>
                <p className="mt-1 text-xs text-slate-400">Added {formatDateLabel(item.createdAt)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleMarkFound(item)}
                  className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
                >
                  Mark Found
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {fulfillPrompt ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-md rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-soft">
            <h2 className="text-lg font-semibold text-slate-950">Card marked as found</h2>
            <p className="mt-2 text-sm text-slate-600">Want to add this to your collection?</p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setFulfillPrompt(null)}
                className="flex-1 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
              >
                Not now
              </button>
              <button
                type="button"
                onClick={() => router.push(buildWantListAddUrl(fulfillPrompt) as Route)}
                className="flex-1 rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                Add to Collection
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
