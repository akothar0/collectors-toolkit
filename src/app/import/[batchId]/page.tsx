'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ImportBatch, ImportBatchItem } from '@/lib/import/types';

type EditableItem = ImportBatchItem & {
  selected: boolean;
  editedPlayer: string;
  editedYear: string;
  editedSet: string;
  editedGrade: string;
  editedCompany: string;
  editedPrice: string;
};

function confidenceBadge(c: string) {
  if (c === 'high') return 'bg-emerald-100 text-emerald-700';
  if (c === 'medium') return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-500';
}

export default function ImportReviewPage({ params }: { params: Promise<{ batchId: string }> }) {
  const router = useRouter();
  const [batchId, setBatchId] = useState<string>('');
  const [batch, setBatch] = useState<ImportBatch | null>(null);
  const [items, setItems] = useState<EditableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    params.then(({ batchId: id }) => {
      setBatchId(id);
      loadBatch(id);
    });
  }, [params]);

  async function loadBatch(id: string) {
    try {
      const res = await fetch(`/api/import/${id}`);
      const data = await res.json() as ImportBatch & { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to load batch.');
      setBatch(data);
      setItems(
        data.items.map((item) => ({
          ...item,
          selected: item.reviewStatus !== 'skipped',
          editedPlayer: item.parsedPlayer ?? '',
          editedYear: item.parsedYear != null ? String(item.parsedYear) : '',
          editedSet: item.parsedSet ?? '',
          editedGrade: item.parsedGrade != null ? String(item.parsedGrade) : '',
          editedCompany: item.parsedCompany ?? '',
          editedPrice: item.rawPrice != null ? String(item.rawPrice) : '',
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load import batch.');
    } finally {
      setLoading(false);
    }
  }

  function toggleAll(selected: boolean) {
    setItems((prev) => prev.map((item) => ({ ...item, selected })));
  }

  function deselectLowConfidence() {
    setItems((prev) => prev.map((item) => ({
      ...item,
      selected: item.parseConfidence !== 'low',
    })));
  }

  function updateItem(id: string, field: keyof EditableItem, value: string | boolean) {
    setItems((prev) =>
      prev.map((item) => item.id === id ? { ...item, [field]: value } : item)
    );
  }

  async function handleSave() {
    setSaving(true);
    setError('');

    const confirmedItems = items
      .filter((item) => item.selected)
      .map((item) => ({
        itemId: item.id,
        player: item.editedPlayer || item.parsedPlayer || null,
        year: item.editedYear ? Number(item.editedYear) : item.parsedYear,
        setName: item.editedSet || item.parsedSet || null,
        grade: item.editedGrade ? Number(item.editedGrade) : item.parsedGrade,
        gradingCompany: item.editedCompany || item.parsedCompany || null,
        purchasePrice: item.editedPrice ? Number(item.editedPrice) : item.rawPrice,
        purchaseDate: item.rawDate ?? null,
        cardId: item.cardId,
      }));

    if (confirmedItems.length === 0) {
      setError('No items selected.');
      setSaving(false);
      return;
    }

    try {
      const res = await fetch(`/api/import/${batchId}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmedItems }),
      });
      const json = await res.json() as { savedCount?: number; error?: string };
      if (!res.ok) throw new Error(json.error ?? 'Save failed.');
      router.push(`/import/${batchId}/success?count=${json.savedCount ?? 0}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.');
      setSaving(false);
    }
  }

  const selectedCount = items.filter((i) => i.selected).length;

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-2xl bg-slate-100" />
        ))}
      </div>
    );
  }

  if (error && !batch) {
    return (
      <div className="rounded-2xl bg-red-50 p-6 text-sm text-red-700">{error}</div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-soft">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-brand-600">Review Import</p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-slate-950">
          Review {batch?.totalParsed ?? 0} Cards
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {batch?.totalMatched ?? 0} automatically matched to card catalog ·{' '}
          Source: <span className="capitalize">{batch?.source.replace(/_/g, ' ')}</span>
        </p>
      </div>

      {/* Bulk actions */}
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => toggleAll(true)} className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-50">Select all</button>
        <button onClick={() => toggleAll(false)} className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-50">Deselect all</button>
        <button onClick={deselectLowConfidence} className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-50">Deselect low confidence</button>
        <span className="ml-auto text-sm text-slate-500">{selectedCount} selected</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-soft">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
              <th className="w-8 px-4 py-3" />
              <th className="px-4 py-3">Card Title</th>
              <th className="px-4 py-3">Player</th>
              <th className="px-4 py-3">Year</th>
              <th className="px-4 py-3">Set</th>
              <th className="px-4 py-3">Grade</th>
              <th className="px-4 py-3">Co.</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Conf.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {items.map((item) => (
              <tr key={item.id} className={`transition-colors ${item.selected ? '' : 'opacity-40'}`}>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={item.selected}
                    onChange={(e) => updateItem(item.id, 'selected', e.target.checked)}
                    className="h-4 w-4 rounded accent-brand-600"
                  />
                </td>
                <td className="max-w-[240px] px-4 py-3">
                  <p className="truncate text-xs text-slate-500" title={item.rawTitle}>{item.rawTitle}</p>
                </td>
                <td className="px-4 py-3">
                  <InlineInput value={item.editedPlayer} onChange={(v) => updateItem(item.id, 'editedPlayer', v)} placeholder={item.parsedPlayer ?? '—'} />
                </td>
                <td className="w-20 px-4 py-3">
                  <InlineInput value={item.editedYear} onChange={(v) => updateItem(item.id, 'editedYear', v)} placeholder={item.parsedYear != null ? String(item.parsedYear) : '—'} />
                </td>
                <td className="px-4 py-3">
                  <InlineInput value={item.editedSet} onChange={(v) => updateItem(item.id, 'editedSet', v)} placeholder={item.parsedSet ?? '—'} />
                </td>
                <td className="w-16 px-4 py-3">
                  <InlineInput value={item.editedGrade} onChange={(v) => updateItem(item.id, 'editedGrade', v)} placeholder={item.parsedGrade != null ? String(item.parsedGrade) : '—'} />
                </td>
                <td className="w-16 px-4 py-3">
                  <InlineInput value={item.editedCompany} onChange={(v) => updateItem(item.id, 'editedCompany', v)} placeholder={item.parsedCompany ?? '—'} />
                </td>
                <td className="w-20 px-4 py-3">
                  <InlineInput value={item.editedPrice} onChange={(v) => updateItem(item.id, 'editedPrice', v)} placeholder={item.rawPrice != null ? `$${item.rawPrice}` : '—'} />
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${confidenceBadge(item.parseConfidence)}`}>
                    {item.parseConfidence}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Save bar */}
      <div className="sticky bottom-4 flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-lg">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <span className="mr-auto text-sm text-slate-600">{selectedCount} cards will be added to your collection</span>
        <button
          onClick={handleSave}
          disabled={saving || selectedCount === 0}
          className="rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
        >
          {saving ? 'Saving…' : `Add ${selectedCount} Card${selectedCount === 1 ? '' : 's'} to Collection`}
        </button>
      </div>
    </div>
  );
}

function InlineInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full min-w-[60px] cursor-text rounded-lg border border-slate-200 bg-slate-50 px-1 py-0.5 text-sm text-slate-800 placeholder:text-slate-400 hover:border-slate-300 hover:bg-white focus:border-brand-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-200"
    />
  );
}
