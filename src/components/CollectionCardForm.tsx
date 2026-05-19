'use client';

import { Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ButtonGroup } from '@/components/ButtonGroup';
import { CollectionPhotoPicker } from '@/components/CollectionPhotoPicker';
import { Eyebrow } from '@/components/editorial';
import { GradeChips } from '@/components/GradeChips';
import { PlayerAutocomplete } from '@/components/PlayerAutocomplete';
import { GRADING_COMPANIES, PURCHASE_SOURCES, SPORTS } from '@/lib/collection';
import { makePendingCollectionPhotos, type PendingCollectionPhoto } from '@/lib/collection-photo-client';
import type { CardSearchResult } from '@/lib/collection';
import type { CollectionFormValues } from '@/lib/collection-detail';

type CollectionCardFormProps = {
  initialValues: CollectionFormValues;
  onSubmit: (values: CollectionFormValues, photoFiles: File[], removedPhotoIds: string[]) => Promise<void>;
  onCancel?: () => void;
  submitLabel: string;
  loading?: boolean;
  error?: string;
};

const inputCls = 'mt-1.5 w-full rounded border border-rule bg-surface-2 px-3 py-2.5 text-[13px] text-ink placeholder:text-ink-3 outline-none focus:border-ink';
const labelCls = 'block text-[11px] font-medium text-ink-3';

export function CollectionCardForm({
  initialValues, onSubmit, onCancel, submitLabel, loading = false, error = '',
}: CollectionCardFormProps) {
  const [values, setValues] = useState(initialValues);
  const [pendingPhotos, setPendingPhotos] = useState<PendingCollectionPhoto[]>([]);
  const [removedPhotoIds, setRemovedPhotoIds] = useState<string[]>([]);
  const pendingPhotosRef = useRef<PendingCollectionPhoto[]>([]);
  pendingPhotosRef.current = pendingPhotos;

  useEffect(() => {
    setValues(initialValues);
    setRemovedPhotoIds([]);
    setPendingPhotos(current => {
      current.forEach(p => URL.revokeObjectURL(p.previewUrl));
      return [];
    });
  }, [initialValues]);

  useEffect(() => {
    return () => { pendingPhotosRef.current.forEach(p => URL.revokeObjectURL(p.previewUrl)); };
  }, []);

  function update<K extends keyof CollectionFormValues>(key: K, value: CollectionFormValues[K]) {
    setValues(cur => ({ ...cur, [key]: value }));
  }

  function handleSelectCard(card: CardSearchResult) {
    update('cardId', card.id);
    if (card.year) update('year', String(card.year));
    if (card.set_name) update('setName', card.set_name);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.player.trim()) return;
    await onSubmit(values, pendingPhotos.map(p => p.file), removedPhotoIds);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-7">

      {/* Card identity */}
      <section className="space-y-4">
        <Eyebrow>Card identity</Eyebrow>
        <PlayerAutocomplete value={values.player}
          onChange={player => { update('player', player); update('cardId', null); }}
          onSelectCard={handleSelectCard} required />
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelCls}>
            Year
            <input type="number" min={1900} max={2030} value={values.year}
              onChange={e => update('year', e.target.value)} className={inputCls} />
          </label>
          <ButtonGroup label="Sport" options={SPORTS} value={values.sport}
            onChange={sport => update('sport', sport)} />
        </div>
      </section>

      {/* Set details */}
      <details className="rounded border border-rule bg-surface-2 p-4" open>
        <summary className="cursor-pointer text-[13px] font-medium text-ink">Set details <span className="text-ink-3">(optional)</span></summary>
        <div className="mt-4 space-y-4">
          <label className={labelCls}>
            Set name
            <input type="text" value={values.setName} onChange={e => update('setName', e.target.value)} className={inputCls} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelCls}>
              Card number
              <input type="text" value={values.cardNumber} onChange={e => update('cardNumber', e.target.value)} className={inputCls} />
            </label>
            <label className={labelCls}>
              Parallel
              <input type="text" value={values.parallel} onChange={e => update('parallel', e.target.value)} className={inputCls} />
            </label>
          </div>
          <div className="flex flex-wrap gap-4">
            {[{ key: 'isRookie' as const, label: 'Rookie card' }, { key: 'isAutograph' as const, label: 'Autograph' }].map(f => (
              <label key={f.key} className="flex items-center gap-2 text-[13px] text-ink-2">
                <input type="checkbox" checked={values[f.key] as boolean}
                  onChange={e => update(f.key, e.target.checked)} className="accent-ink" />
                {f.label}
              </label>
            ))}
          </div>
        </div>
      </details>

      {/* Condition */}
      <section className="space-y-4">
        <Eyebrow>Condition</Eyebrow>
        <ButtonGroup options={[{ value: 'raw', label: 'Raw' }, { value: 'graded', label: 'Graded' }]}
          value={values.conditionType}
          onChange={v => update('conditionType', v as 'raw' | 'graded')} />
        {values.conditionType === 'graded' && (
          <div className="space-y-4 rounded border border-rule bg-surface-2 p-4">
            <ButtonGroup label="Grading company" options={GRADING_COMPANIES} value={values.gradingCompany}
              onChange={v => update('gradingCompany', v)} />
            {values.gradingCompany === 'Other' && (
              <input type="text" value={values.gradingCompanyOther}
                onChange={e => update('gradingCompanyOther', e.target.value)}
                placeholder="Company name" className={inputCls} />
            )}
            <GradeChips value={values.grade} onChange={g => update('grade', g)} />
            <label className={labelCls}>
              Cert number <span className="text-ink-4">(optional)</span>
              <input type="text" value={values.certNumber}
                onChange={e => update('certNumber', e.target.value)} className={inputCls} />
            </label>
          </div>
        )}
      </section>

      {/* Purchase info */}
      <details className="rounded border border-rule bg-surface-2 p-4">
        <summary className="cursor-pointer text-[13px] font-medium text-ink">Purchase info <span className="text-ink-3">(optional)</span></summary>
        <div className="mt-4 space-y-4">
          <label className={labelCls}>
            Purchase price
            <div className="relative mt-1.5">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 text-[13px]">$</span>
              <input type="number" min={0} step="0.01" value={values.purchasePrice}
                onChange={e => update('purchasePrice', e.target.value)}
                className="w-full rounded border border-rule bg-surface-2 py-2.5 pl-7 pr-3 text-[13px] text-ink outline-none focus:border-ink" />
            </div>
          </label>
          <label className={labelCls}>
            Date purchased
            <input type="date" value={values.purchaseDate}
              onChange={e => update('purchaseDate', e.target.value)} className={inputCls} />
          </label>
          <ButtonGroup label="Purchased from"
            options={[{ value: '', label: 'None' }, ...PURCHASE_SOURCES.map(s => ({ value: s, label: s }))]}
            value={values.purchaseSource}
            onChange={v => update('purchaseSource', v)} />
          <label className={labelCls}>
            Original listing URL
            <input type="url" value={values.purchaseUrl}
              onChange={e => update('purchaseUrl', e.target.value)} className={inputCls} />
          </label>
        </div>
      </details>

      {/* Photos */}
      <section className="space-y-3">
        <Eyebrow>Photos <span className="normal-case text-ink-4">(optional)</span></Eyebrow>
        <CollectionPhotoPicker
          existingPhotos={values.photos} pendingPhotos={pendingPhotos}
          onFilesSelected={files => setPendingPhotos(cur => [...cur, ...makePendingCollectionPhotos(files)])}
          onRemoveExisting={photoId => {
            setValues(cur => {
              const next = cur.photos.filter(p => p.id !== photoId);
              return { ...cur, photos: next, frontImageUrl: next[0]?.imageUrl ?? null };
            });
            setRemovedPhotoIds(cur => cur.includes(photoId) ? cur : [...cur, photoId]);
          }}
          onRemovePending={id => setPendingPhotos(cur => {
            const t = cur.find(p => p.id === id);
            if (t) URL.revokeObjectURL(t.previewUrl);
            return cur.filter(p => p.id !== id);
          })}
          disabled={loading} />
      </section>

      {/* Notes */}
      <label className={labelCls}>
        Notes <span className="text-ink-4">(optional)</span>
        <textarea value={values.notes} onChange={e => update('notes', e.target.value)} rows={4}
          className="mt-1.5 w-full rounded border border-rule bg-surface-2 px-3 py-2.5 text-[13px] text-ink placeholder:text-ink-3 outline-none focus:border-ink" />
      </label>

      {error && <p className="font-mono text-[11px] text-negative">{error}</p>}

      <div className="flex flex-col gap-3 sm:flex-row">
        {onCancel && (
          <button type="button" onClick={onCancel}
            className="inline-flex flex-1 items-center justify-center rounded border border-rule px-5 py-2.5 text-[13px] font-medium text-ink hover:bg-surface-2">
            Cancel
          </button>
        )}
        <button type="submit" disabled={loading}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-ink px-5 py-2.5 text-[13px] font-medium text-paper hover:bg-ink/90 disabled:opacity-50">
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
