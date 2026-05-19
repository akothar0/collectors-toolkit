'use client';

import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { ChevronDown, ExternalLink, Heart, Loader2, Plus, Trash2 } from 'lucide-react';
import { FetchErrorBanner } from '@/components/fetch-error-banner';
import { useEffect, useState } from 'react';
import { buildWantListAddUrl, type WantListItem } from '@/lib/wantlist';
import { formatDateLabel, formatPrice } from '@/lib/collection-presenter';
import { readJsonResponse } from '@/lib/http-json';

function buildEbaySoldCompsUrl(description: string) {
  const params = new URLSearchParams({
    _nkw: description,
    LH_Sold: '1',
    LH_Complete: '1',
  });
  return `https://www.ebay.com/sch/i.html?${params.toString()}`;
}

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
  const [showMoreDetails, setShowMoreDetails] = useState(false);

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
      setShowMoreDetails(false);
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
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight text-ash-50">
            Want List
          </h1>
          <p className="mt-2 text-ash-300">
            Cards you're hunting.{' '}
            <span className="rounded-full border border-ink-700 bg-ink-800 px-2 py-0.5 text-sm font-medium">
              {loading ? '…' : items.length}
            </span>
          </p>
        </div>
      </div>

      {error ? <FetchErrorBanner message={error} onRetry={() => void loadItems()} /> : null}

      <div className="pb-36 md:pb-0">
        {loading ? (
          <ul className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <li key={index} className="h-20 animate-pulse rounded bg-ink-800" />
            ))}
          </ul>
        ) : items.length === 0 ? (
          <div className="rounded border border-dashed border-ink-700 bg-ink-900 px-8 py-16 text-center ">
            <Heart className="mx-auto h-12 w-12 text-ash-400" />
            <p className="mt-4 text-lg font-medium text-ash-50">Nothing on your list.</p>
            <p className="mt-2 text-sm text-ash-300">Add cards you're hunting — track prices and mark them found.</p>
            <button
              type="button"
              onClick={() => document.getElementById('wantlist-description')?.focus()}
              className="mt-6 inline-flex min-h-11 items-center gap-2 rounded bg-brand-500 px-5 py-3 text-sm font-medium text-white hover:bg-brand-400"
            >
              <Plus className="h-4 w-4" />
              Add Item
            </button>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-3 rounded border border-ink-700 bg-ink-900 p-5  sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold text-ash-50">{item.description}</p>
                  <p className="mt-1 text-sm text-ash-300">
                    {[item.player, item.year, item.setName].filter(Boolean).join(' · ') || 'No details'}
                    {item.targetGrade != null ? ` · Target grade ${item.targetGrade}` : ''}
                    {item.targetPrice != null ? ` · ${formatPrice(item.targetPrice)}` : ''}
                  </p>
                  <p className="mt-1 text-xs text-ash-500">Added {formatDateLabel(item.createdAt)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={buildEbaySoldCompsUrl(item.description)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded border border-ink-700 px-4 py-2 text-sm text-ash-300 hover:bg-ink-800"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Find on eBay
                  </a>
                  <button
                    type="button"
                    onClick={() => handleMarkFound(item)}
                    className="rounded border border-emerald-800 bg-emerald-950 px-4 py-2 text-sm font-medium text-emerald-400 hover:bg-emerald-900"
                  >
                    Mark Found
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="inline-flex items-center gap-1 rounded border border-ink-700 px-4 py-2 text-sm text-ash-300 hover:bg-ink-800"
                  >
                    <Trash2 className="h-4 w-4" /> Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form
        onSubmit={handleAdd}
        className="fixed inset-x-0 z-30 border-t border-ink-700 bg-ink-900/95 px-4 py-3 shadow-[0_-8px_30px_rgba(15,23,42,0.06)] backdrop-blur bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:relative md:inset-auto md:bottom-auto md:rounded md:border md:p-6 md: lg:p-8"
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-3">
          <div className="flex gap-2">
            <input
              type="text"
              id="wantlist-description"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add to want list..."
              className="min-h-11 flex-1 rounded border border-ink-700 bg-ink-800 px-4 py-2 text-sm text-ash-50 placeholder:text-ash-500 outline-none focus:border-brand-500/50 focus:ring-0 focus:ring-brand-500"
            />
            <button
              type="submit"
              disabled={adding}
              className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded bg-brand-500 px-5 py-2 text-sm font-medium text-white hover:bg-brand-400 disabled:opacity-60"
            >
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowMoreDetails((open) => !open)}
            className="inline-flex items-center gap-1 self-start text-sm font-medium text-ash-300 hover:text-ash-50"
          >
            {showMoreDetails ? 'Fewer details' : 'More details'}
            <ChevronDown
              className={`h-4 w-4 transition-transform ${showMoreDetails ? 'rotate-180' : ''}`}
            />
          </button>

          {showMoreDetails ? (
            <div className="space-y-4 border-t border-ink-800 pt-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block text-sm font-medium text-ash-200">
                  Player
                  <input
                    type="text"
                    value={player}
                    onChange={(e) => setPlayer(e.target.value)}
                    className="mt-2 w-full rounded border border-ink-700 px-4 py-3 text-sm outline-none focus:border-brand-500/50 focus:ring-0 focus:ring-brand-500"
                  />
                </label>
                <label className="block text-sm font-medium text-ash-200">
                  Year
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="mt-2 w-full rounded border border-ink-700 px-4 py-3 text-sm outline-none focus:border-brand-500/50 focus:ring-0 focus:ring-brand-500"
                  />
                </label>
                <label className="block text-sm font-medium text-ash-200">
                  Set
                  <input
                    type="text"
                    value={setName}
                    onChange={(e) => setSetName(e.target.value)}
                    className="mt-2 w-full rounded border border-ink-700 px-4 py-3 text-sm outline-none focus:border-brand-500/50 focus:ring-0 focus:ring-brand-500"
                  />
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-ash-200">
                  Target grade
                  <input
                    type="number"
                    step="0.5"
                    min={1}
                    max={10}
                    value={targetGrade}
                    onChange={(e) => setTargetGrade(e.target.value)}
                    className="mt-2 w-full rounded border border-ink-700 px-4 py-3 text-sm outline-none focus:border-brand-500/50 focus:ring-0 focus:ring-brand-500"
                  />
                </label>
                <label className="block text-sm font-medium text-ash-200">
                  Target price ($)
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    className="mt-2 w-full rounded border border-ink-700 px-4 py-3 text-sm outline-none focus:border-brand-500/50 focus:ring-0 focus:ring-brand-500"
                  />
                </label>
              </div>
              <label className="block text-sm font-medium text-ash-200">
                Notes
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="mt-2 w-full rounded border border-ink-700 px-4 py-3 text-sm outline-none focus:border-brand-500/50 focus:ring-0 focus:ring-brand-500"
                />
              </label>
            </div>
          ) : null}
        </div>
      </form>

      {fulfillPrompt ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4">
          <div className="w-full max-w-md rounded border border-ink-700 bg-ink-900 p-6 ">
            <h2 className="text-lg font-semibold text-ash-50">Card marked as found</h2>
            <p className="mt-2 text-sm text-ash-300">Want to add this to your collection?</p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setFulfillPrompt(null)}
                className="flex-1 rounded border border-ink-700 px-4 py-2 text-sm font-medium text-ash-200"
              >
                Not now
              </button>
              <button
                type="button"
                onClick={() => router.push(buildWantListAddUrl(fulfillPrompt) as Route)}
                className="flex-1 rounded bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-400"
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
