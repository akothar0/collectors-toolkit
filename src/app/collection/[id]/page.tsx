'use client';
/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import type { Route } from 'next';
import { useParams, useRouter } from 'next/navigation';
import { CreditCard, ExternalLink, Loader2, Pencil, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { CollectionCardForm } from '@/components/CollectionCardForm';
import { ImageUpload } from '@/components/ImageUpload';
import {
  detailToFormValues,
  formValuesToPayload,
  type CollectionCardDetail,
} from '@/lib/collection-detail';
import {
  displayPlayer,
  displaySetName,
  formatDateLabel,
  formatGainLoss,
  formatGradeBadge,
  formatPlayerYearLine,
  formatPrice,
} from '@/lib/collection-presenter';
import { getCertUrl } from '@/lib/cert-number';
import { readJsonResponse } from '@/lib/http-json';

export default function CollectionCardDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const cardId = params.id;

  const [card, setCard] = useState<CollectionCardDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [notes, setNotes] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);

  const [valueEditing, setValueEditing] = useState(false);
  const [valueInput, setValueInput] = useState('');
  const [valueSaving, setValueSaving] = useState(false);

  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoKey, setPhotoKey] = useState(0);

  const [editing, setEditing] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [wantLoading, setWantLoading] = useState(false);

  const loadCard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/collection/${cardId}`);
      const data = await readJsonResponse<CollectionCardDetail & { error?: string }>(response);
      if (!response.ok) {
        throw new Error(data.error ?? 'Unable to load card.');
      }
      setCard(data);
      setNotes(data.notes ?? '');
      setValueInput(data.currentValue != null ? String(data.currentValue) : '');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load card.');
    } finally {
      setLoading(false);
    }
  }, [cardId]);

  useEffect(() => {
    void loadCard();
  }, [loadCard]);

  async function saveNotes() {
    if (!card || notes === (card.notes ?? '')) return;
    setNotesSaving(true);
    try {
      const response = await fetch(`/api/collection/${card.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      const data = await readJsonResponse<CollectionCardDetail & { error?: string }>(response);
      if (!response.ok) throw new Error(data.error ?? 'Unable to save notes.');
      setCard(data);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save notes.');
    } finally {
      setNotesSaving(false);
    }
  }

  async function saveValue() {
    if (!card) return;
    setValueSaving(true);
    try {
      const parsed = valueInput.trim() ? Number.parseFloat(valueInput) : null;
      const response = await fetch(`/api/collection/${card.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentValue: parsed }),
      });
      const data = await readJsonResponse<CollectionCardDetail & { error?: string }>(response);
      if (!response.ok) throw new Error(data.error ?? 'Unable to update value.');
      setCard(data);
      setValueEditing(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to update value.');
    } finally {
      setValueSaving(false);
    }
  }

  async function handlePhotoSelected(file: File | null) {
    if (!card || !file) return;
    setPhotoUploading(true);
    try {
      const formData = new FormData();
      formData.set('image', file);
      const uploadResponse = await fetch('/api/collection/image', { method: 'POST', body: formData });
      const uploadData = await readJsonResponse<{ imageUrl?: string; error?: string }>(uploadResponse);
      if (!uploadResponse.ok) throw new Error(uploadData.error ?? 'Unable to upload photo.');

      const response = await fetch(`/api/collection/${card.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frontImageUrl: uploadData.imageUrl }),
      });
      const data = await readJsonResponse<CollectionCardDetail & { error?: string }>(response);
      if (!response.ok) throw new Error(data.error ?? 'Unable to save photo.');
      setCard(data);
      setPhotoKey((k) => k + 1);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Unable to update photo.');
    } finally {
      setPhotoUploading(false);
    }
  }

  async function handleEditSubmit(values: ReturnType<typeof detailToFormValues>, photoFile: File | null) {
    if (!card) return;
    setEditLoading(true);
    setEditError('');

    try {
      let frontImageUrl = values.frontImageUrl;
      if (photoFile) {
        const formData = new FormData();
        formData.set('image', photoFile);
        const uploadResponse = await fetch('/api/collection/image', { method: 'POST', body: formData });
        const uploadData = await readJsonResponse<{ imageUrl?: string; error?: string }>(uploadResponse);
        if (!uploadResponse.ok) throw new Error(uploadData.error ?? 'Unable to upload photo.');
        frontImageUrl = uploadData.imageUrl ?? frontImageUrl;
      }

      const payload = { ...formValuesToPayload(values), frontImageUrl };
      const response = await fetch(`/api/collection/${card.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await readJsonResponse<CollectionCardDetail & { error?: string }>(response);
      if (!response.ok) throw new Error(data.error ?? 'Unable to save changes.');
      setCard(data);
      setNotes(data.notes ?? '');
      setValueInput(data.currentValue != null ? String(data.currentValue) : '');
      setEditing(false);
    } catch (submitError) {
      setEditError(submitError instanceof Error ? submitError.message : 'Unable to save changes.');
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDelete() {
    if (!card) return;
    setDeleteLoading(true);
    try {
      const response = await fetch(`/api/collection/${card.id}`, { method: 'DELETE' });
      const data = await readJsonResponse<{ success?: boolean; error?: string }>(response);
      if (!response.ok) throw new Error(data.error ?? 'Unable to delete card.');
      router.push('/collection');
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete card.');
      setDeleteLoading(false);
    }
  }

  async function handleAddToWantList() {
    if (!card) return;
    setWantLoading(true);
    try {
      const description = [displayPlayer(card), displaySetName(card)].filter(Boolean).join(' — ') || displayPlayer(card);
      const response = await fetch('/api/wantlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          player: card.player,
          year: card.year,
          setName: card.setName,
        }),
      });
      const data = await readJsonResponse<{ error?: string }>(response);
      if (!response.ok) throw new Error(data.error ?? 'Unable to add to want list.');
    } catch (wantError) {
      setError(wantError instanceof Error ? wantError.message : 'Unable to add to want list.');
    } finally {
      setWantLoading(false);
    }
  }

  if (loading) {
    return <p className="text-slate-600">Loading card...</p>;
  }

  if (error && !card) {
    return (
      <section className="space-y-4">
        <p className="text-rose-600">{error}</p>
        <Link href="/collection" className="text-brand-600 hover:underline">
          Back to collection
        </Link>
      </section>
    );
  }

  if (!card) {
    return null;
  }

  const player = displayPlayer(card);
  const setName = displaySetName(card);
  const badge = formatGradeBadge(card.conditionType, card.grade, card.gradingCompany);
  const certUrl = getCertUrl(card.gradingCompany, card.certNumber);
  const gainLoss = formatGainLoss(card.purchasePrice, card.currentValue);
  const purchasePriceLabel = formatPrice(card.purchasePrice);
  const currentValueLabel = formatPrice(card.currentValue);

  return (
    <section className="space-y-8">
      <Link href="/collection" className="text-sm font-medium text-brand-600 hover:underline">
        Back to collection
      </Link>

      {editing ? (
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-soft md:p-8">
          <h1 className="mb-6 text-2xl font-semibold tracking-tight text-slate-950">Edit card details</h1>
          <CollectionCardForm
            initialValues={detailToFormValues(card)}
            onSubmit={handleEditSubmit}
            onCancel={() => {
              setEditing(false);
              setEditError('');
            }}
            submitLabel="Save Changes"
            loading={editLoading}
            error={editError}
          />
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
          <div className="space-y-4">
            <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-100 shadow-soft">
              {card.frontImageUrl ? (
                <img src={card.frontImageUrl} alt={player} className="aspect-[3/4] w-full object-cover" />
              ) : (
                <div className="flex aspect-[3/4] items-center justify-center text-slate-300">
                  <CreditCard className="h-16 w-16" />
                </div>
              )}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Update photo</p>
              {photoUploading ? (
                <p className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                  <Loader2 className="h-4 w-4 animate-spin" /> Uploading...
                </p>
              ) : (
                <ImageUpload key={photoKey} onImageSelected={handlePhotoSelected} accept="image/*" maxSizeMB={10} />
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h1 className="font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight text-slate-950">
                {player}
              </h1>
              <p className="mt-2 text-lg text-slate-600">{formatPlayerYearLine(player, card.year)}</p>
              {setName ? <p className="mt-1 text-slate-500">{setName}</p> : null}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Grade</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{badge}</p>
              {card.gradingCompany && card.conditionType === 'graded' ? (
                <p className="text-sm text-slate-600">{card.gradingCompany}</p>
              ) : null}
              {card.certNumber ? (
                <p className="mt-1 text-sm text-slate-600">Cert #{card.certNumber}</p>
              ) : null}
              {certUrl ? (
                <a
                  href={certUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline"
                >
                  View cert lookup <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : null}
            </div>

            {(purchasePriceLabel || card.purchaseDate || card.purchaseSource) && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Purchase</p>
                <p className="mt-2 text-sm text-slate-700">
                  {[purchasePriceLabel, formatDateLabel(card.purchaseDate), card.purchaseSource]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Current value</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">
                    {currentValueLabel ?? 'Not set'}
                  </p>
                  {card.valueUpdatedAt ? (
                    <p className="text-xs text-slate-500">
                      Last updated {formatDateLabel(card.valueUpdatedAt)}
                    </p>
                  ) : null}
                </div>
                {!valueEditing ? (
                  <button
                    type="button"
                    onClick={() => setValueEditing(true)}
                    className="text-sm font-medium text-brand-600 hover:underline"
                  >
                    Update Value
                  </button>
                ) : null}
              </div>
              {valueEditing ? (
                <div className="mt-4 flex gap-2">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={valueInput}
                    onChange={(e) => setValueInput(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500"
                  />
                  <button
                    type="button"
                    onClick={saveValue}
                    disabled={valueSaving}
                    className="rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                  >
                    {valueSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setValueEditing(false);
                      setValueInput(card.currentValue != null ? String(card.currentValue) : '');
                    }}
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600"
                  >
                    Cancel
                  </button>
                </div>
              ) : null}
              {gainLoss ? (
                <p
                  className={`mt-3 text-sm font-medium ${gainLoss.delta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}
                >
                  {gainLoss.delta >= 0 ? '+' : ''}
                  {formatPrice(gainLoss.delta)} ({gainLoss.percent >= 0 ? '+' : ''}
                  {gainLoss.percent.toFixed(1)}%)
                </p>
              ) : null}
            </div>

            <label className="block rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Notes</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={saveNotes}
                rows={4}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500"
              />
              {notesSaving ? <p className="mt-1 text-xs text-slate-400">Saving...</p> : null}
            </label>

            <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-soft">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Provenance</p>
              {card.scanSession ? (
                <p>
                  Added via{' '}
                  <Link href={`/scanner/history/${card.scanId}` as Route} className="text-brand-600 hover:underline">
                    scanner scan
                  </Link>{' '}
                  on {formatDateLabel(card.scanSession.createdAt)}
                </p>
              ) : null}
              {card.gradeSession ? (
                <p>
                  Graded with{' '}
                  <Link href="/grader" className="text-brand-600 hover:underline">
                    AI grader
                  </Link>{' '}
                  on {formatDateLabel(card.gradeSession.createdAt)}
                </p>
              ) : null}
              {card.importItem ? (
                <p>
                  Imported from {card.importItem.rawSource ?? 'import'} on{' '}
                  {formatDateLabel(card.importItem.createdAt)}
                </p>
              ) : null}
              {!card.scanSession && !card.gradeSession && !card.importItem ? (
                <p>Added manually to collection.</p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Pencil className="h-4 w-4" /> Edit Details
              </button>
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100"
              >
                <Trash2 className="h-4 w-4" /> Delete
              </button>
              <button
                type="button"
                onClick={handleAddToWantList}
                disabled={wantLoading}
                className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100 disabled:opacity-60"
              >
                {wantLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Add to Want List
              </button>
            </div>

            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          </div>
        </div>
      )}

      {deleteOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-md rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-soft">
            <h2 className="text-lg font-semibold text-slate-950">Delete this card?</h2>
            <p className="mt-2 text-sm text-slate-600">This cannot be undone.</p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteOpen(false)}
                className="flex-1 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteLoading}
                className="flex-1 rounded-full bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-60"
              >
                {deleteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
