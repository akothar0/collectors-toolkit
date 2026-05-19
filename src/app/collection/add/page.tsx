'use client';

import Link from 'next/link';
import { Check, Loader2, Plus } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { ButtonGroup } from '@/components/ButtonGroup';
import { CollectionPhotoPicker } from '@/components/CollectionPhotoPicker';
import { GradeChips } from '@/components/GradeChips';
import { PlayerAutocomplete } from '@/components/PlayerAutocomplete';
import {
  GRADING_COMPANIES,
  PURCHASE_SOURCES,
  SPORTS,
  composeGraderPrefillNotes,
  type CardSearchResult,
  type GraderSessionPrefill,
} from '@/lib/collection';
import type { CollectionPhoto } from '@/lib/collection-photos';
import {
  makePendingCollectionPhotos,
  type PendingCollectionPhoto,
  uploadCollectionPhotoFiles,
} from '@/lib/collection-photo-client';
import { readJsonResponse } from '@/lib/http-json';

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function AddCardForm() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');
  const queryGrade = searchParams.get('grade') ?? undefined;
  const queryCompany = searchParams.get('company') ?? undefined;
  const queryPlayer = searchParams.get('player') ?? '';
  const queryYear = searchParams.get('year') ?? '';
  const querySet = searchParams.get('setName') ?? searchParams.get('set') ?? '';
  const queryCert = searchParams.get('cert') ?? '';

  const [player, setPlayer] = useState(queryPlayer);
  const [cardId, setCardId] = useState<string | null>(null);
  const [year, setYear] = useState(queryYear);
  const [sport, setSport] = useState<string>('Baseball');
  const [setName, setSetName] = useState(querySet);
  const [cardNumber, setCardNumber] = useState('');
  const [parallel, setParallel] = useState('');
  const [isRookie, setIsRookie] = useState(false);
  const [isAutograph, setIsAutograph] = useState(false);
  const [conditionType, setConditionType] = useState<'raw' | 'graded'>('raw');
  const [gradingCompany, setGradingCompany] = useState<string>('PSA');
  const [gradingCompanyOther, setGradingCompanyOther] = useState('');
  const [grade, setGrade] = useState<number | null>(null);
  const [certNumber, setCertNumber] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(todayIsoDate());
  const [purchaseSource, setPurchaseSource] = useState<string>('');
  const [purchaseUrl, setPurchaseUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [gradeSessionId, setGradeSessionId] = useState<string | null>(null);
  const [subGrades, setSubGrades] = useState<GraderSessionPrefill['subGrades']>(null);
  const [existingPhotos, setExistingPhotos] = useState<CollectionPhoto[]>([]);
  const [pendingPhotos, setPendingPhotos] = useState<PendingCollectionPhoto[]>([]);
  const pendingPhotosRef = useRef<PendingCollectionPhoto[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [savedCardId, setSavedCardId] = useState<string | null>(null);

  pendingPhotosRef.current = pendingPhotos;

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    let cancelled = false;

    async function loadPrefill() {
      try {
        const response = await fetch(`/api/grader/session/${sessionId}`);
        const data = await readJsonResponse<GraderSessionPrefill & { error?: string }>(response);
        if (!response.ok || cancelled) {
          return;
        }

        setGradeSessionId(data.sessionId);
        setConditionType('raw');
        setGrade(null);
        setGradingCompany('PSA');
        setCertNumber('');
        setSubGrades(data.subGrades);
        setExistingPhotos(
          data.frontImageUrl
            ? [{ id: 'prefill-0', imageUrl: data.frontImageUrl, position: 0 }]
            : []
        );
        setNotes(composeGraderPrefillNotes(data, queryGrade, queryCompany));
      } catch {
        // Prefill is optional.
      }
    }

    void loadPrefill();

    return () => {
      cancelled = true;
    };
  }, [sessionId, queryGrade, queryCompany]);

  useEffect(() => {
    if (sessionId) return;
    if (queryGrade || queryCompany || queryCert) {
      setConditionType('graded');
      if (queryGrade) setGrade(Number(queryGrade));
      if (queryCompany) setGradingCompany(queryCompany);
      if (queryCert) setCertNumber(queryCert);
    }
  }, [sessionId, queryGrade, queryCompany, queryCert]);

  useEffect(() => {
    return () => {
      for (const photo of pendingPhotosRef.current) {
        URL.revokeObjectURL(photo.previewUrl);
      }
    };
  }, []);

  function handleSelectCard(card: CardSearchResult) {
    setCardId(card.id);
    if (card.year) {
      setYear(String(card.year));
    }
    if (card.set_name) {
      setSetName(card.set_name);
    }
  }

  function resetForAnother() {
    const keepSport = sport;
    setPlayer('');
    setCardId(null);
    setYear('');
    setSport(keepSport);
    setSetName('');
    setCardNumber('');
    setParallel('');
    setIsRookie(false);
    setIsAutograph(false);
    setConditionType('raw');
    setGradingCompany('PSA');
    setGradingCompanyOther('');
    setGrade(null);
    setCertNumber('');
    setPurchasePrice('');
    setPurchaseDate(todayIsoDate());
    setPurchaseSource('');
    setPurchaseUrl('');
    setNotes('');
    setGradeSessionId(null);
    setSubGrades(null);
    setExistingPhotos([]);
    setPendingPhotos((current) => {
      for (const photo of current) {
        URL.revokeObjectURL(photo.previewUrl);
      }
      return [];
    });
    setError('');
    setSaved(false);
    setSavedCardId(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!player.trim()) {
      setError('Player name is required.');
      return;
    }

    if (conditionType === 'graded') {
      if (!grade) {
        setError('Select a grade for graded cards.');
        return;
      }
      const company = gradingCompany === 'Other' ? gradingCompanyOther.trim() : gradingCompany;
      if (!company) {
        setError('Select a grading company.');
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      const uploadedPhotoUrls = await uploadCollectionPhotoFiles(
        pendingPhotos.map((photo) => photo.file)
      );
      const photoUrls = [
        ...existingPhotos.map((photo) => photo.imageUrl),
        ...uploadedPhotoUrls,
      ];

      const resolvedCompany =
        conditionType === 'graded'
          ? gradingCompany === 'Other'
            ? gradingCompanyOther.trim()
            : gradingCompany
          : null;

      const response = await fetch('/api/collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardId,
          player: player.trim(),
          year: year.trim() ? Number.parseInt(year, 10) : null,
          sport,
          setName: setName.trim() || null,
          cardNumber: cardNumber.trim() || null,
          parallel: parallel.trim() || null,
          isRookie,
          isAutograph,
          conditionType,
          gradingCompany: resolvedCompany,
          grade: conditionType === 'graded' ? grade : null,
          certNumber: certNumber.trim() || null,
          subGrades: conditionType === 'raw' ? subGrades : null,
          gradeSessionId,
          frontImageUrl: photoUrls[0] ?? null,
          photoUrls,
          purchasePrice: purchasePrice.trim() ? Number.parseFloat(purchasePrice) : null,
          purchaseDate: purchaseDate || null,
          purchaseSource: purchaseSource || null,
          purchaseUrl: purchaseUrl.trim() || null,
          notes: notes.trim() || null,
        }),
      });

      const data = await readJsonResponse<{ collectionCardId?: string; error?: string }>(response);
      if (!response.ok) {
        throw new Error(data.error ?? 'Unable to add card.');
      }

      setSavedCardId(data.collectionCardId ?? null);
      setSaved(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to add card.');
    } finally {
      setLoading(false);
    }
  }

  if (saved) {
    return (
      <section className="mx-auto max-w-lg space-y-6 rounded border border-rule bg-surface p-8 text-center ">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-positive/30 bg-positive/10">
          <Check className="h-8 w-8 text-positive" />
        </div>
        <h1 className="font-serif italic text-[32px] text-ink">Added.</h1>
        <p className="text-[13px] text-ink-2">Your card was saved to your collection.</p>
        <div className="flex flex-col gap-3 pt-2">
          <button
            type="button"
            onClick={resetForAnother}
            className="inline-flex w-full items-center justify-center gap-2 rounded bg-ink px-6 py-3 text-sm font-medium text-white hover:bg-ink/90"
          >
            <Plus className="h-4 w-4" />
            Add Another Card
          </button>
          <Link
            href="/collection"
            className="inline-flex w-full items-center justify-center rounded border border-rule px-6 py-3 text-sm font-medium text-ink hover:bg-surface-2"
          >
            View Collection
          </Link>
        </div>
        {savedCardId ? (
          <p className="text-xs text-ink-3">Saved as {savedCardId.slice(0, 8)}…</p>
        ) : null}
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-2xl space-y-8">
      <div className="space-y-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3">Add a card</p>
        <h1 className="font-serif italic text-[48px] leading-none tracking-tight text-ink">
          Add a card.
        </h1>
        <p className="text-[14px] text-ink-2">Only player name is required — everything else is optional.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 rounded border border-rule bg-surface p-6  md:p-8">
        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold uppercase tracking-[0.18em] text-ink-2">
            Card identity
          </legend>
          <PlayerAutocomplete
            value={player}
            onChange={(value) => {
              setPlayer(value);
              setCardId(null);
            }}
            onSelectCard={handleSelectCard}
            required
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-ink">
              Year
              <input
                type="number"
                min={1900}
                max={2030}
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="mt-2 w-full rounded border border-rule bg-surface-2 px-4 py-3 text-sm text-ink placeholder:text-ink-3 outline-none focus:border-ink focus:ring-0 focus:ring-ink"
              />
            </label>
            <div>
              <ButtonGroup
                label="Sport"
                options={SPORTS}
                value={sport}
                onChange={setSport}
              />
            </div>
          </div>
        </fieldset>

        <details className="rounded border border-rule bg-surface-2 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-ink">
            Set details (optional)
          </summary>
          <div className="mt-4 space-y-4">
            <label className="block text-sm font-medium text-ink">
              Set name
              <input
                type="text"
                value={setName}
                onChange={(e) => setSetName(e.target.value)}
                className="mt-2 w-full rounded border border-rule bg-surface-2 px-4 py-3 text-sm text-ink placeholder:text-ink-3 outline-none focus:border-ink focus:ring-0 focus:ring-ink"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-ink">
                Card number
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder='e.g. "247"'
                  className="mt-2 w-full rounded border border-rule bg-surface-2 px-4 py-3 text-sm text-ink placeholder:text-ink-3 outline-none focus:border-ink focus:ring-0 focus:ring-ink"
                />
              </label>
              <label className="block text-sm font-medium text-ink">
                Parallel
                <input
                  type="text"
                  value={parallel}
                  onChange={(e) => setParallel(e.target.value)}
                  placeholder="Gold Refractor"
                  className="mt-2 w-full rounded border border-rule bg-surface-2 px-4 py-3 text-sm text-ink placeholder:text-ink-3 outline-none focus:border-ink focus:ring-0 focus:ring-ink"
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm text-ink">
                <input type="checkbox" checked={isRookie} onChange={(e) => setIsRookie(e.target.checked)} />
                Rookie card
              </label>
              <label className="flex items-center gap-2 text-sm text-ink">
                <input type="checkbox" checked={isAutograph} onChange={(e) => setIsAutograph(e.target.checked)} />
                Autograph
              </label>
            </div>
          </div>
        </details>

        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold uppercase tracking-[0.18em] text-ink-2">
            Condition
          </legend>
          <ButtonGroup
            options={[
              { value: 'raw', label: 'Raw' },
              { value: 'graded', label: 'Graded' },
            ]}
            value={conditionType}
            onChange={(value) => setConditionType(value as 'raw' | 'graded')}
          />
          {conditionType === 'graded' ? (
            <div className="space-y-4 rounded border border-rule bg-surface-2 p-4">
              <ButtonGroup
                label="Grading company"
                options={GRADING_COMPANIES}
                value={gradingCompany}
                onChange={setGradingCompany}
              />
              {gradingCompany === 'Other' ? (
                <input
                  type="text"
                  value={gradingCompanyOther}
                  onChange={(e) => setGradingCompanyOther(e.target.value)}
                  placeholder="Company name"
                  className="w-full rounded border border-rule bg-surface-2 px-4 py-3 text-sm text-ink placeholder:text-ink-3 outline-none focus:border-ink focus:ring-0 focus:ring-ink"
                />
              ) : null}
              <GradeChips value={grade} onChange={setGrade} />
              <label className="block text-sm font-medium text-ink">
                Cert number (optional)
                <input
                  type="text"
                  value={certNumber}
                  onChange={(e) => setCertNumber(e.target.value)}
                  className="mt-2 w-full rounded border border-rule bg-surface-2 px-4 py-3 text-sm text-ink placeholder:text-ink-3 outline-none focus:border-ink focus:ring-0 focus:ring-ink"
                />
              </label>
            </div>
          ) : null}
        </fieldset>

        <details className="rounded border border-rule bg-surface-2 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-ink">
            Purchase info (optional)
          </summary>
          <div className="mt-4 space-y-4">
            <label className="block text-sm font-medium text-ink">
              Purchase price
              <div className="relative mt-2">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-3">$</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  className="w-full rounded border border-rule bg-surface py-3 pl-8 pr-4 text-sm outline-none focus:border-ink focus:ring-0 focus:ring-ink"
                />
              </div>
            </label>
            <label className="block text-sm font-medium text-ink">
              Date purchased
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="mt-2 w-full rounded border border-rule bg-surface-2 px-4 py-3 text-sm text-ink placeholder:text-ink-3 outline-none focus:border-ink focus:ring-0 focus:ring-ink"
              />
            </label>
            <ButtonGroup
              label="Purchased from"
              options={[
                { value: '', label: 'None' },
                ...PURCHASE_SOURCES.map((source) => ({ value: source, label: source })),
              ]}
              value={purchaseSource}
              onChange={setPurchaseSource}
            />
            <label className="block text-sm font-medium text-ink">
              Original listing URL
              <input
                type="url"
                value={purchaseUrl}
                onChange={(e) => setPurchaseUrl(e.target.value)}
                className="mt-2 w-full rounded border border-rule bg-surface-2 px-4 py-3 text-sm text-ink placeholder:text-ink-3 outline-none focus:border-ink focus:ring-0 focus:ring-ink"
              />
            </label>
          </div>
        </details>

        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold uppercase tracking-[0.18em] text-ink-2">
            Photos (optional)
          </legend>
          <CollectionPhotoPicker
            existingPhotos={existingPhotos}
            pendingPhotos={pendingPhotos}
            onFilesSelected={(files) => {
              setPendingPhotos((current) => [...current, ...makePendingCollectionPhotos(files)]);
            }}
            onRemoveExisting={(photoId) => {
              setExistingPhotos((current) =>
                current
                  .filter((photo) => photo.id !== photoId)
                  .map((photo, index) => ({ ...photo, position: index }))
              );
            }}
            onRemovePending={(pendingId) => {
              setPendingPhotos((current) => {
                const target = current.find((photo) => photo.id === pendingId);
                if (target) {
                  URL.revokeObjectURL(target.previewUrl);
                }
                return current.filter((photo) => photo.id !== pendingId);
              });
            }}
            disabled={loading}
            helperText="Add up to 10 photos. If this card came from the AI grader, the grader image starts as your cover."
          />
        </fieldset>

        <label className="block text-sm font-medium text-ink">
          Notes (optional)
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="mt-2 w-full rounded border border-rule bg-surface-2 px-4 py-3 text-sm text-ink placeholder:text-ink-3 outline-none focus:border-ink focus:ring-0 focus:ring-ink"
          />
        </label>

        {error ? <p className="text-sm text-rose-400">{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded bg-ink px-6 py-3 text-sm font-medium text-white hover:bg-ink/90 disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Add to Collection
        </button>
      </form>

      <Link href="/collection" className="text-sm font-medium text-brand-500 hover:underline">
        Back to collection
      </Link>
    </section>
  );
}

export default function AddCardPage() {
  return (
    <Suspense fallback={<p className="text-ink-2">Loading form...</p>}>
      <AddCardForm />
    </Suspense>
  );
}
