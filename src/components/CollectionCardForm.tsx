'use client';
/* eslint-disable @next/next/no-img-element */

import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ButtonGroup } from '@/components/ButtonGroup';
import { GradeChips } from '@/components/GradeChips';
import { ImageUpload } from '@/components/ImageUpload';
import { PlayerAutocomplete } from '@/components/PlayerAutocomplete';
import { GRADING_COMPANIES, PURCHASE_SOURCES, SPORTS } from '@/lib/collection';
import type { CardSearchResult } from '@/lib/collection';
import type { CollectionFormValues } from '@/lib/collection-detail';

type CollectionCardFormProps = {
  initialValues: CollectionFormValues;
  onSubmit: (values: CollectionFormValues, photoFile: File | null) => Promise<void>;
  onCancel?: () => void;
  submitLabel: string;
  loading?: boolean;
  error?: string;
};

export function CollectionCardForm({
  initialValues,
  onSubmit,
  onCancel,
  submitLabel,
  loading = false,
  error = '',
}: CollectionCardFormProps) {
  const [values, setValues] = useState(initialValues);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [uploadKey, setUploadKey] = useState(0);

  useEffect(() => {
    setValues(initialValues);
    setPhotoFile(null);
    setUploadKey((k) => k + 1);
  }, [initialValues]);

  function update<K extends keyof CollectionFormValues>(key: K, value: CollectionFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function handleSelectCard(card: CardSearchResult) {
    update('cardId', card.id);
    if (card.year) update('year', String(card.year));
    if (card.set_name) update('setName', card.set_name);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!values.player.trim()) {
      return;
    }

    await onSubmit(values, photoFile);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
          Card identity
        </legend>
        <PlayerAutocomplete
          value={values.player}
          onChange={(player) => {
            update('player', player);
            update('cardId', null);
          }}
          onSelectCard={handleSelectCard}
          required
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">
            Year
            <input
              type="number"
              min={1900}
              max={2030}
              value={values.year}
              onChange={(e) => update('year', e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500"
            />
          </label>
          <ButtonGroup label="Sport" options={SPORTS} value={values.sport} onChange={(sport) => update('sport', sport)} />
        </div>
      </fieldset>

      <details className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4" open>
        <summary className="cursor-pointer text-sm font-semibold text-slate-800">Set details (optional)</summary>
        <div className="mt-4 space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Set name
            <input
              type="text"
              value={values.setName}
              onChange={(e) => update('setName', e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Card number
              <input
                type="text"
                value={values.cardNumber}
                onChange={(e) => update('cardNumber', e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Parallel
              <input
                type="text"
                value={values.parallel}
                onChange={(e) => update('parallel', e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500"
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={values.isRookie}
                onChange={(e) => update('isRookie', e.target.checked)}
              />
              Rookie card
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={values.isAutograph}
                onChange={(e) => update('isAutograph', e.target.checked)}
              />
              Autograph
            </label>
          </div>
        </div>
      </details>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Condition</legend>
        <ButtonGroup
          options={[
            { value: 'raw', label: 'Raw' },
            { value: 'graded', label: 'Graded' },
          ]}
          value={values.conditionType}
          onChange={(conditionType) => update('conditionType', conditionType as 'raw' | 'graded')}
        />
        {values.conditionType === 'graded' ? (
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
            <ButtonGroup
              label="Grading company"
              options={GRADING_COMPANIES}
              value={values.gradingCompany}
              onChange={(gradingCompany) => update('gradingCompany', gradingCompany)}
            />
            {values.gradingCompany === 'Other' ? (
              <input
                type="text"
                value={values.gradingCompanyOther}
                onChange={(e) => update('gradingCompanyOther', e.target.value)}
                placeholder="Company name"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500"
              />
            ) : null}
            <GradeChips value={values.grade} onChange={(grade) => update('grade', grade)} />
            <label className="block text-sm font-medium text-slate-700">
              Cert number (optional)
              <input
                type="text"
                value={values.certNumber}
                onChange={(e) => update('certNumber', e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500"
              />
            </label>
          </div>
        ) : null}
      </fieldset>

      <details className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
        <summary className="cursor-pointer text-sm font-semibold text-slate-800">Purchase info (optional)</summary>
        <div className="mt-4 space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Purchase price
            <div className="relative mt-2">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">$</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={values.purchasePrice}
                onChange={(e) => update('purchasePrice', e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-8 pr-4 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Date purchased
            <input
              type="date"
              value={values.purchaseDate}
              onChange={(e) => update('purchaseDate', e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500"
            />
          </label>
          <ButtonGroup
            label="Purchased from"
            options={[
              { value: '', label: 'None' },
              ...PURCHASE_SOURCES.map((source) => ({ value: source, label: source })),
            ]}
            value={values.purchaseSource}
            onChange={(purchaseSource) => update('purchaseSource', purchaseSource)}
          />
          <label className="block text-sm font-medium text-slate-700">
            Original listing URL
            <input
              type="url"
              value={values.purchaseUrl}
              onChange={(e) => update('purchaseUrl', e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500"
            />
          </label>
        </div>
      </details>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Photo (optional)</legend>
        {values.frontImageUrl && !photoFile ? (
          <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <img src={values.frontImageUrl} alt="Current" className="h-20 w-14 rounded-lg object-cover" />
            <p className="text-sm text-slate-600">Current photo on file. Upload below to replace.</p>
          </div>
        ) : null}
        <ImageUpload key={uploadKey} onImageSelected={setPhotoFile} accept="image/*" maxSizeMB={10} />
      </fieldset>

      <label className="block text-sm font-medium text-slate-700">
        Notes (optional)
        <textarea
          value={values.notes}
          onChange={(e) => update('notes', e.target.value)}
          rows={4}
          className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500"
        />
      </label>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex flex-1 items-center justify-center rounded-full border border-slate-200 px-6 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
        ) : null}
        <button
          type="submit"
          disabled={loading}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
