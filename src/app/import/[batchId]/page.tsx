'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Eyebrow, Rule } from '@/components/editorial';
import { Slab, type SlabHolding } from '@/components/Slab';
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

// ── Confidence pill ───────────────────────────────────────────────────────
function ConfPill({ conf }: { conf: string }) {
  const cls =
    conf === 'high'   ? 'bg-positive/10 text-positive' :
    conf === 'medium' ? 'bg-warn/10 text-warn' :
                        'bg-negative/10 text-negative';
  return (
    <span className={`inline-flex items-center gap-1 rounded px-1.5 py-px font-mono text-[9px] tracking-[0.1em] ${cls}`}>
      <span className="h-1 w-1 rounded-full bg-current" />
      {conf.toUpperCase()}
    </span>
  );
}

// ── Inline editable cell ──────────────────────────────────────────────────
function EditCell({ value, onChange, placeholder, mono, wide }: {
  value: string; onChange: (v: string) => void; placeholder: string;
  mono?: boolean; wide?: boolean;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full rounded border border-rule bg-surface-2 px-2 py-1 outline-none focus:border-ink ${
        mono ? 'font-mono text-[11px]' : 'font-serif italic text-[14px]'
      } ${wide ? 'min-w-[120px]' : 'min-w-[60px]'} text-ink placeholder:text-ink-3`}
    />
  );
}

// ── Sport-derived slab tint ───────────────────────────────────────────────
const SPORT_TINTS: Record<string, string> = {
  NBA: '#0c2340', NFL: '#8b1a1a', MLB: '#1a3a1a', WNBA: '#b8860b', Soccer: '#1a3a2a',
};

function itemSlab(item: ImportBatchItem): SlabHolding {
  const tint =
    item.parseConfidence === 'high' ? '#1f1d6b' :
    item.parseConfidence === 'medium' ? '#0d322b' :
    SPORT_TINTS[''] ?? '#5c594f';
  return {
    player: item.parsedPlayer ?? 'Unknown',
    year: item.parsedYear ?? 2020,
    set: item.parsedSet ?? '',
    grade: item.parsedGrade != null && item.parsedCompany
      ? `${item.parsedCompany} ${item.parsedGrade}`
      : 'Raw',
    tint,
    accent: '#f4ddc1',
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────

export default function ImportReviewPage({ params }: { params: Promise<{ batchId: string }> }) {
  const router = useRouter();
  const [batchId, setBatchId] = useState('');
  const [batch, setBatch] = useState<ImportBatch | null>(null);
  const [items, setItems] = useState<EditableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    params.then(({ batchId: id }) => {
      setBatchId(id);
      void loadBatch(id);
    });
  }, [params]);

  async function loadBatch(id: string) {
    try {
      const res = await fetch(`/api/import/${id}`);
      const data = await res.json() as ImportBatch & { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to load batch.');
      setBatch(data);
      setItems(data.items.map(item => ({
        ...item,
        selected: item.reviewStatus !== 'skipped',
        editedPlayer: item.parsedPlayer ?? '',
        editedYear: item.parsedYear != null ? String(item.parsedYear) : '',
        editedSet: item.parsedSet ?? '',
        editedGrade: item.parsedGrade != null ? String(item.parsedGrade) : '',
        editedCompany: item.parsedCompany ?? '',
        editedPrice: item.rawPrice != null ? String(item.rawPrice) : '',
      })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load import batch.');
    } finally {
      setLoading(false);
    }
  }

  function toggleAll(selected: boolean) {
    setItems(prev => prev.map(item => ({ ...item, selected })));
  }

  function deselectLowConfidence() {
    setItems(prev => prev.map(item => ({ ...item, selected: item.parseConfidence !== 'low' })));
  }

  function updateItem(id: string, field: keyof EditableItem, value: string | boolean) {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    const confirmedItems = items.filter(i => i.selected).map(item => ({
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

    if (confirmedItems.length === 0) { setError('No items selected.'); setSaving(false); return; }

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

  const selectedCount = items.filter(i => i.selected).length;
  const matchedCount = batch?.totalMatched ?? 0;

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <section className="space-y-4">
        <div className="h-20 animate-pulse rounded border border-rule bg-surface" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded border border-rule-soft bg-surface" />
        ))}
      </section>
    );
  }

  if (error && !batch) {
    return (
      <div className="rounded border border-negative/30 bg-negative/5 px-4 py-3 font-mono text-[11px] text-negative">{error}</div>
    );
  }

  return (
    <section className="space-y-6">
      {/* Header */}
      <div>
        <Eyebrow>Import review</Eyebrow>
        <h1 className="mt-1.5 font-serif italic text-[40px] leading-none tracking-tight text-ink">
          Review <span className="text-accent">{batch?.totalParsed ?? 0} cards.</span>
        </h1>
        <p className="mt-2 font-mono text-[11px] text-ink-3">
          {matchedCount} matched to catalog
          {' · '}
          {(batch?.totalParsed ?? 0) - matchedCount} need attention
          {' · '}
          <span className="capitalize">{batch?.source.replace(/_/g, ' ')}</span>
        </p>
      </div>

      <Rule />

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { label: 'Select all',             action: () => toggleAll(true) },
          { label: 'Deselect all',           action: () => toggleAll(false) },
          { label: 'Deselect low confidence', action: deselectLowConfidence },
        ].map(b => (
          <button key={b.label} type="button" onClick={b.action}
            className="rounded border border-rule px-3 py-1.5 font-mono text-[11px] text-ink-3 hover:border-ink hover:text-ink transition-colors">
            {b.label}
          </button>
        ))}
        <span className="ml-auto font-mono text-[11px] text-ink-3">{selectedCount} selected</span>
        <button type="button" onClick={handleSave} disabled={saving || selectedCount === 0}
          className="inline-flex h-8 items-center gap-2 rounded-md bg-ink px-4 font-mono text-[11px] text-paper hover:bg-ink/90 disabled:opacity-40">
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
          {saving ? 'Saving…' : `Save ${selectedCount} to collection`}
        </button>
      </div>

      {error && (
        <p className="font-mono text-[11px] text-negative">{error}</p>
      )}

      {/* Table header */}
      <div className="hidden lg:grid lg:grid-cols-[32px_56px_1fr_100px_80px_80px] lg:gap-3 lg:rounded-t lg:border lg:border-rule lg:bg-surface-2 lg:px-4 lg:py-2.5">
        {['', 'CARD', 'IDENTITY & TITLE', 'PRICE', 'GRADE', 'CONF.'].map(h => (
          <Eyebrow key={h}>{h}</Eyebrow>
        ))}
      </div>

      {/* Rows */}
      <div className="rounded border border-rule bg-surface overflow-hidden -mt-3">
        {items.map((item, idx) => (
          <div key={item.id}
            className={`border-b border-rule-soft last:border-b-0 px-4 py-3 transition-opacity ${item.selected ? '' : 'opacity-40'}`}>

            {/* Desktop row */}
            <div className="hidden lg:grid lg:grid-cols-[32px_56px_1fr_100px_80px_80px] lg:gap-3 lg:items-center">
              {/* Checkbox */}
              <input type="checkbox" checked={item.selected}
                onChange={e => updateItem(item.id, 'selected', e.target.checked)}
                className="h-4 w-4 accent-ink cursor-pointer" />

              {/* Slab */}
              <div className="flex justify-center">
                <Slab holding={itemSlab(item)} width={36} height={54} showLabel={false} />
              </div>

              {/* Identity + raw title */}
              <div className="min-w-0 space-y-1.5">
                <div className="flex items-center gap-2">
                  <EditCell value={item.editedPlayer} onChange={v => updateItem(item.id, 'editedPlayer', v)}
                    placeholder={item.parsedPlayer ?? 'Player'} wide />
                  {item.editedYear || item.parsedYear ? (
                    <EditCell value={item.editedYear} onChange={v => updateItem(item.id, 'editedYear', v)}
                      placeholder={item.parsedYear ? String(item.parsedYear) : 'Year'} mono />
                  ) : null}
                </div>
                <p className="truncate font-mono text-[10px] text-ink-3" title={item.rawTitle}>{item.rawTitle}</p>
              </div>

              {/* Price */}
              <div>
                <EditCell value={item.editedPrice} onChange={v => updateItem(item.id, 'editedPrice', v)}
                  placeholder={item.rawPrice != null ? `$${item.rawPrice}` : '—'} mono />
              </div>

              {/* Grade */}
              <div>
                <EditCell value={item.editedGrade} onChange={v => updateItem(item.id, 'editedGrade', v)}
                  placeholder={item.parsedGrade != null ? String(item.parsedGrade) : '—'} mono />
              </div>

              {/* Confidence */}
              <div className="flex justify-center">
                <ConfPill conf={item.parseConfidence} />
              </div>
            </div>

            {/* Mobile row */}
            <div className="flex items-start gap-3 lg:hidden">
              <input type="checkbox" checked={item.selected}
                onChange={e => updateItem(item.id, 'selected', e.target.checked)}
                className="mt-1 h-4 w-4 accent-ink cursor-pointer" />
              <Slab holding={itemSlab(item)} width={36} height={54} showLabel={false} />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-serif italic text-[14px] text-ink truncate">
                    {item.editedPlayer || item.parsedPlayer || 'Unknown player'}
                  </p>
                  <ConfPill conf={item.parseConfidence} />
                </div>
                <p className="font-mono text-[10px] text-ink-3 truncate">{item.rawTitle}</p>
                <div className="flex flex-wrap gap-2">
                  {item.rawPrice != null && (
                    <span className="font-serif italic text-[14px] text-ink">${item.rawPrice}</span>
                  )}
                  {item.parsedGrade != null && (
                    <span className="font-mono text-[11px] text-ink-3">
                      {item.parsedCompany ? `${item.parsedCompany} ` : ''}{item.parsedGrade}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Sticky save footer */}
      <div className="sticky bottom-4 flex items-center gap-4 rounded border border-rule bg-surface px-5 py-3 shadow-popover">
        <span className="font-mono text-[11px] text-ink-3">
          {selectedCount} card{selectedCount !== 1 ? 's' : ''} selected
          {' · '}
          {matchedCount} matched
        </span>
        <button type="button" onClick={handleSave} disabled={saving || selectedCount === 0}
          className="ml-auto inline-flex h-9 items-center gap-2 rounded-md bg-ink px-5 text-[13px] font-medium text-paper hover:bg-ink/90 disabled:opacity-40">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {saving ? 'Saving…' : 'Save to collection'}
        </button>
      </div>
    </section>
  );
}
