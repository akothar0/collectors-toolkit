'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useParams, useRouter } from 'next/navigation';
import { ExternalLink, Loader2, Pencil, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CollectionCardForm } from '@/components/CollectionCardForm';
import { CollectionPhotoCarousel } from '@/components/CollectionPhotoCarousel';
import { CollectionPhotoPicker } from '@/components/CollectionPhotoPicker';
import { Eyebrow, Rule } from '@/components/editorial';
import { Slab, type SlabHolding } from '@/components/Slab';
import { detailToFormValues, formValuesToPayload, type CollectionCardDetail } from '@/lib/collection-detail';
import { makePendingCollectionPhotos, type PendingCollectionPhoto, uploadCollectionPhotoFiles } from '@/lib/collection-photo-client';
import { displayPlayer, displaySetName, formatDateLabel, formatGainLoss, formatGradeBadge, formatPrice } from '@/lib/collection-presenter';
import { MarketCompsSection } from '@/components/pricing/MarketCompsSection';
import { PriceHistorySparkline } from '@/components/pricing/PriceHistorySparkline';
import { getCertUrl } from '@/lib/cert-number';
import { readJsonResponse } from '@/lib/http-json';

const SPORT_TINTS: Record<string, string> = {
  NBA: '#0c2340', NFL: '#8b1a1a', MLB: '#1a3a1a', WNBA: '#b8860b',
};

export default function CollectionCardDetailPage() {
  const params  = useParams<{ id: string }>();
  const router  = useRouter();
  const cardId  = params.id;

  const [card,         setCard]         = useState<CollectionCardDetail | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [notes,        setNotes]        = useState('');
  const [notesSaving,  setNotesSaving]  = useState(false);
  const [valueEditing, setValueEditing] = useState(false);
  const [valueInput,   setValueInput]   = useState('');
  const [valueSaving,  setValueSaving]  = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [pendingPhotos,  setPendingPhotos]  = useState<PendingCollectionPhoto[]>([]);
  const [editing,      setEditing]      = useState(false);
  const [editLoading,  setEditLoading]  = useState(false);
  const [editError,    setEditError]    = useState('');
  const [deleteOpen,   setDeleteOpen]   = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [wantLoading,  setWantLoading]  = useState(false);

  const pendingPhotosRef = useRef<PendingCollectionPhoto[]>([]);
  pendingPhotosRef.current = pendingPhotos;

  const loadCard = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/collection/${cardId}`);
      const data = await readJsonResponse<CollectionCardDetail & { error?: string }>(res);
      if (res.status === 404) { router.replace('/collection'); return; }
      if (!res.ok) throw new Error(data.error ?? 'Unable to load card.');
      setCard(data);
      setNotes(data.notes ?? '');
      setValueInput(data.currentValue != null ? String(data.currentValue) : '');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load card.');
    } finally { setLoading(false); }
  }, [cardId, router]);

  useEffect(() => { void loadCard(); }, [loadCard]);
  useEffect(() => () => { pendingPhotosRef.current.forEach(p => URL.revokeObjectURL(p.previewUrl)); }, []);

  async function saveNotes() {
    if (!card || notes === (card.notes ?? '')) return;
    setNotesSaving(true);
    try {
      const res = await fetch(`/api/collection/${card.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notes }) });
      const data = await readJsonResponse<CollectionCardDetail & { error?: string }>(res);
      if (!res.ok) throw new Error(data.error ?? 'Unable to save notes.');
      setCard(data);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save notes.'); }
    finally { setNotesSaving(false); }
  }

  async function saveValue() {
    if (!card) return;
    setValueSaving(true);
    try {
      const parsed = valueInput.trim() ? Number.parseFloat(valueInput) : null;
      const res = await fetch(`/api/collection/${card.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentValue: parsed }) });
      const data = await readJsonResponse<CollectionCardDetail & { error?: string }>(res);
      if (!res.ok) throw new Error(data.error ?? 'Unable to update value.');
      setCard(data); setValueEditing(false);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to update value.'); }
    finally { setValueSaving(false); }
  }

  async function handleAddPhotos() {
    if (!card || pendingPhotos.length === 0) return;
    setPhotoUploading(true);
    try {
      const urls = await uploadCollectionPhotoFiles(pendingPhotos.map(p => p.file));
      const res = await fetch(`/api/collection/${card.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ appendPhotoUrls: urls }) });
      const data = await readJsonResponse<CollectionCardDetail & { error?: string }>(res);
      if (!res.ok) throw new Error(data.error ?? 'Unable to save photos.');
      setCard(data);
      setPendingPhotos(cur => { cur.forEach(p => URL.revokeObjectURL(p.previewUrl)); return []; });
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to update photos.'); }
    finally { setPhotoUploading(false); }
  }

  async function handleRemovePhoto(photoId: string) {
    if (!card) return;
    setPhotoUploading(true);
    try {
      const res = await fetch(`/api/collection/${card.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ removePhotoIds: [photoId] }) });
      const data = await readJsonResponse<CollectionCardDetail & { error?: string }>(res);
      if (!res.ok) throw new Error(data.error ?? 'Unable to remove photo.');
      setCard(data);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to remove photo.'); }
    finally { setPhotoUploading(false); }
  }

  async function handleEditSubmit(values: ReturnType<typeof detailToFormValues>, photoFiles: File[], _removed: string[]) {
    if (!card) return;
    setEditLoading(true); setEditError('');
    try {
      const urls = await uploadCollectionPhotoFiles(photoFiles);
      const photoUrls = [...values.photos.map(p => p.imageUrl), ...urls];
      const payload = { ...formValuesToPayload(values), frontImageUrl: photoUrls[0] ?? null, photoUrls };
      const res = await fetch(`/api/collection/${card.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await readJsonResponse<CollectionCardDetail & { error?: string }>(res);
      if (!res.ok) throw new Error(data.error ?? 'Unable to save changes.');
      setCard(data); setNotes(data.notes ?? ''); setValueInput(data.currentValue != null ? String(data.currentValue) : '');
      setEditing(false);
    } catch (e) { setEditError(e instanceof Error ? e.message : 'Unable to save changes.'); }
    finally { setEditLoading(false); }
  }

  async function handleDelete() {
    if (!card) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/collection/${card.id}`, { method: 'DELETE' });
      const data = await readJsonResponse<{ success?: boolean; error?: string }>(res);
      if (!res.ok) throw new Error(data.error ?? 'Unable to delete card.');
      router.push('/collection');
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to delete card.'); setDeleteLoading(false); }
  }

  async function handleAddToWantList() {
    if (!card) return;
    setWantLoading(true);
    try {
      const description = [displayPlayer(card), displaySetName(card)].filter(Boolean).join(' — ') || displayPlayer(card);
      const res = await fetch('/api/wantlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ description, player: card.player, year: card.year, setName: card.setName }) });
      const data = await readJsonResponse<{ error?: string }>(res);
      if (!res.ok) throw new Error(data.error ?? 'Unable to add to want list.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to add to want list.'); }
    finally { setWantLoading(false); }
  }

  if (loading) {
    return (
      <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
        <div className="aspect-[2/3] animate-pulse rounded border border-rule bg-surface" />
        <div className="space-y-4">
          {[60, 120, 80, 100].map(h => <div key={h} className={`h-${h > 100 ? 24 : h > 80 ? 20 : h > 60 ? 14 : 10} animate-pulse rounded border border-rule bg-surface`} />)}
        </div>
      </div>
    );
  }

  if (error && !card) {
    return (
      <div className="space-y-3">
        <p className="font-mono text-[11px] text-negative">{error}</p>
        <Link href="/collection" className="font-mono text-[11px] text-accent hover:underline">← Back to collection</Link>
      </div>
    );
  }

  if (!card) return null;

  const player = displayPlayer(card);
  const setName = displaySetName(card);
  const badge = formatGradeBadge(card.conditionType, card.grade, card.gradingCompany);
  const certUrl = getCertUrl(card.gradingCompany, card.certNumber);
  const gainLoss = formatGainLoss(card.purchasePrice, card.currentValue);
  const purchasePriceLabel = formatPrice(card.purchasePrice);
  const currentValueLabel = formatPrice(card.currentValue);

  const heroSlab: SlabHolding = {
    player,
    year: card.year ?? 2020,
    set: setName ?? '',
    grade: badge,
    sport: card.sport ?? null,
    tint: SPORT_TINTS[card.sport ?? ''] ?? '#2d2e34',
    imageUrl: card.photos[0]?.imageUrl ?? card.frontImageUrl ?? null,
  };

  return (
    <section className="space-y-6">
      <Link href="/collection" className="font-mono text-[11px] text-ink-3 hover:text-ink">← Collection</Link>

      {editing ? (
        <div className="rounded border border-rule bg-surface p-6">
          <h2 className="mb-6 font-serif italic text-[28px] text-ink">Edit card details</h2>
          <CollectionCardForm
            initialValues={detailToFormValues(card)}
            onSubmit={handleEditSubmit}
            onCancel={() => { setEditing(false); setEditError(''); }}
            submitLabel="Save changes"
            loading={editLoading}
            error={editError}
          />
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
          {/* Left — slab + photos */}
          <div className="space-y-4">
            <div className="flex justify-center">
              <Slab holding={heroSlab} width={250} height={375} flavor="light" />
            </div>
            <CollectionPhotoCarousel photos={card.photos} alt={player} />
            <div className="rounded border border-rule bg-surface p-4">
              <Eyebrow className="mb-3">Photos</Eyebrow>
              <CollectionPhotoPicker
                existingPhotos={card.photos}
                pendingPhotos={pendingPhotos}
                onFilesSelected={files => setPendingPhotos(cur => [...cur, ...makePendingCollectionPhotos(files)])}
                onRemoveExisting={handleRemovePhoto}
                onRemovePending={id => setPendingPhotos(cur => {
                  const t = cur.find(p => p.id === id);
                  if (t) URL.revokeObjectURL(t.previewUrl);
                  return cur.filter(p => p.id !== id);
                })}
                disabled={photoUploading}
                helperText={card.photos.length > 0 ? "Swipe through saved photos above. Add more or remove shots you no longer want." : "Add front, back, and detail shots."}
              />
              {pendingPhotos.length > 0 && (
                <button type="button" onClick={handleAddPhotos} disabled={photoUploading}
                  className="mt-3 inline-flex h-9 items-center gap-2 rounded-md bg-ink px-4 text-[13px] font-medium text-paper hover:bg-ink/90 disabled:opacity-50">
                  {photoUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Upload selected photos'}
                </button>
              )}
            </div>
          </div>

          {/* Right — info */}
          <div className="space-y-5">
            {/* Heading */}
            <div>
              <h1 className="font-serif italic text-[44px] leading-tight text-ink">{player}</h1>
              <p className="font-mono text-[11px] text-ink-3">
                {[card.year, setName, card.cardNumber ? `#${card.cardNumber}` : null, card.sport].filter(Boolean).join(' · ')}
              </p>
            </div>

            <Rule />

            {/* Grade + cert */}
            <div className="flex items-start justify-between gap-4 rounded border border-rule px-4 py-3">
              <div>
                <Eyebrow className="mb-1">Grade</Eyebrow>
                <p className="font-serif italic text-[28px] leading-none text-ink">{badge}</p>
              </div>
              {(card.certNumber || certUrl) && (
                <div className="text-right">
                  {card.certNumber && <p className="font-mono text-[12px] text-ink">#{card.certNumber}</p>}
                  {certUrl && (
                    <a href={certUrl} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1 font-mono text-[10px] text-accent hover:underline">
                      Verify <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Purchase */}
            {(purchasePriceLabel || card.purchaseDate || card.purchaseSource) && (
              <div>
                <Eyebrow className="mb-1">Purchase</Eyebrow>
                <p className="text-[13px] text-ink-2">
                  {[purchasePriceLabel, formatDateLabel(card.purchaseDate), card.purchaseSource].filter(Boolean).join(' · ')}
                </p>
              </div>
            )}

            {/* Current value */}
            <div>
              <div className="flex items-baseline justify-between">
                <Eyebrow>Current value</Eyebrow>
                {!valueEditing && (
                  <button type="button" onClick={() => setValueEditing(true)}
                    className="font-mono text-[10px] text-ink-3 hover:text-ink">EDIT</button>
                )}
              </div>
              <p className="mt-1 font-serif italic text-[28px] leading-none text-ink">
                {currentValueLabel ?? 'Not set'}
              </p>
              {gainLoss && (
                <p className={`mt-1 font-mono text-[11px] ${gainLoss.delta >= 0 ? 'text-positive' : 'text-negative'}`}>
                  {gainLoss.delta >= 0 ? '+' : ''}{formatPrice(gainLoss.delta)} ({gainLoss.percent >= 0 ? '+' : ''}{gainLoss.percent.toFixed(1)}%)
                </p>
              )}
              {valueEditing && (
                <div className="mt-3 flex gap-2">
                  <input type="number" min={0} step="0.01" value={valueInput}
                    onChange={e => setValueInput(e.target.value)}
                    className="flex-1 rounded border border-rule bg-surface-2 px-3 py-2 text-[13px] text-ink outline-none focus:border-ink" />
                  <button type="button" onClick={saveValue} disabled={valueSaving}
                    className="inline-flex h-9 items-center gap-1.5 rounded-md bg-ink px-3 text-[13px] font-medium text-paper hover:bg-ink/90 disabled:opacity-50">
                    {valueSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                  </button>
                  <button type="button" onClick={() => { setValueEditing(false); setValueInput(card.currentValue != null ? String(card.currentValue) : ''); }}
                    className="inline-flex h-9 items-center rounded border border-rule px-3 text-[13px] text-ink-2 hover:bg-surface-2">
                    Cancel
                  </button>
                </div>
              )}
            </div>

            <MarketCompsSection
              collectionCardId={card.id}
              slabDefaults={{
                gradingCompany: card.gradingCompany,
                grade: card.grade,
              }}
              onPricingUpdated={loadCard}
              onRequestEdit={() => setEditing(true)}
            />

            <PriceHistorySparkline
              collectionCardId={card.id}
              purchaseDate={card.purchaseDate}
              purchasePrice={card.purchasePrice}
            />

            {/* Notes */}
            <label className="block">
              <Eyebrow className="mb-1.5">Notes</Eyebrow>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} onBlur={saveNotes} rows={4}
                className="w-full rounded border border-rule bg-surface-2 px-3 py-2.5 text-[13px] text-ink outline-none focus:border-ink" />
              {notesSaving && <p className="mt-1 font-mono text-[10px] text-ink-3">Saving…</p>}
            </label>

            {/* Provenance */}
            <div>
              <Eyebrow className="mb-2">Provenance</Eyebrow>
              <p className="text-[13px] text-ink-2">
                {card.scanSession ? <>Scanned on {formatDateLabel(card.scanSession.createdAt)}{' · '}<Link href={`/scanner/history/${card.scanId}` as Route} className="text-accent hover:underline">view scan</Link></> :
                 card.gradeSession ? <>Graded {formatDateLabel(card.gradeSession.createdAt)}</> :
                 card.importItem ? <>Imported from {card.importItem.rawSource ?? 'import'} on {formatDateLabel(card.importItem.createdAt)}</> :
                 'Added manually to collection.'}
              </p>
            </div>

            {error && <p className="font-mono text-[11px] text-negative">{error}</p>}

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-2">
              <button type="button" onClick={() => setEditing(true)}
                className="inline-flex items-center gap-2 rounded border border-rule px-4 py-2 text-[13px] font-medium text-ink hover:bg-surface-2">
                <Pencil className="h-3.5 w-3.5" /> Edit details
              </button>
              <button type="button" onClick={() => setDeleteOpen(true)}
                className="inline-flex items-center gap-2 rounded border border-negative/30 px-4 py-2 text-[13px] font-medium text-negative hover:bg-negative/5">
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
              <button type="button" onClick={handleAddToWantList} disabled={wantLoading}
                className="inline-flex items-center gap-2 rounded border border-rule px-4 py-2 text-[13px] font-medium text-ink-2 hover:bg-surface-2 disabled:opacity-50">
                {wantLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Add to want list
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="w-full max-w-sm rounded border border-rule bg-surface p-6 shadow-popover">
            <h2 className="font-serif italic text-[24px] text-ink">Delete this card?</h2>
            <p className="mt-1.5 text-[13px] text-ink-2">This cannot be undone.</p>
            <div className="mt-6 flex gap-3">
              <button type="button" onClick={() => setDeleteOpen(false)}
                className="flex-1 rounded border border-rule px-4 py-2 text-[13px] font-medium text-ink hover:bg-surface-2">
                Cancel
              </button>
              <button type="button" onClick={handleDelete} disabled={deleteLoading}
                className="flex-1 rounded-md bg-negative px-4 py-2 text-[13px] font-medium text-white hover:bg-negative/90 disabled:opacity-60">
                {deleteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
