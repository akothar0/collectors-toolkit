'use client';
/* eslint-disable @next/next/no-img-element */

import { Loader2, RotateCcw, Save, Search } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { ScannerResult } from '@/lib/scanner';

type ScanResultProps = {
  scan: ScannerResult;
  onTryAgain?: () => void;
  onQuotaUpdate?: (remaining: number) => void;
};

type SaveFormState = {
  player: string;
  year: string;
  setName: string;
  parallel: string;
  cardNumber: string;
  sport: string;
  manufacturer: string;
  certNumber: string;
  gradingCompany: string;
  grade: string;
  gradeDescription: string;
  qualifierCode: string;
  autographGrade: string;
  popAtGrade: string;
  popHigher: string;
  purchasePrice: string;
  purchaseDate: string;
  notes: string;
};

function buildSaveForm(scan: ScannerResult): SaveFormState {
  return {
    player: scan.cardPlayer ?? '',
    year: scan.cardYear?.toString() ?? '',
    setName: scan.cardSet ?? '',
    parallel: scan.cardParallel ?? '',
    cardNumber: scan.cardNumber ?? '',
    sport: scan.cardSport ?? '',
    manufacturer: scan.cardManufacturer ?? '',
    certNumber: scan.certNumber ?? scan.ocrCertNumber ?? '',
    gradingCompany: scan.gradingCompany ?? scan.ocrGradingCompany ?? '',
    grade: scan.officialGrade?.toString() ?? '',
    gradeDescription: scan.gradeDescription ?? '',
    qualifierCode: scan.qualifierCode ?? '',
    autographGrade: scan.autographGrade?.toString() ?? '',
    popAtGrade: scan.popAtGrade?.toString() ?? '',
    popHigher: scan.popHigher?.toString() ?? '',
    purchasePrice: '',
    purchaseDate: '',
    notes: '',
  };
}

function gradeLabel(grade: number | null, company: string | null) {
  if (grade === null || !company) {
    return null;
  }

  const gradeText = Number.isInteger(grade) ? grade.toFixed(0) : grade.toString();
  return `${company} ${gradeText}`;
}

function gradeTone(grade: number | null) {
  if (grade === null) {
    return 'bg-slate-100 text-slate-700 ring-slate-200';
  }

  if (grade >= 9.5) {
    return 'bg-gradient-to-r from-amber-300 to-yellow-400 text-slate-950 ring-amber-200';
  }

  if (grade >= 9) {
    return 'bg-emerald-100 text-emerald-900 ring-emerald-200';
  }

  if (grade >= 8.5) {
    return 'bg-teal-100 text-teal-900 ring-teal-200';
  }

  if (grade >= 8) {
    return 'bg-sky-100 text-sky-900 ring-sky-200';
  }

  if (grade >= 7) {
    return 'bg-slate-200 text-slate-800 ring-slate-300';
  }

  return 'bg-slate-100 text-slate-500 ring-slate-200';
}

function formatGrade(grade: number | null) {
  if (grade === null) {
    return 'Unverified';
  }

  return Number.isInteger(grade) ? grade.toFixed(0) : grade.toFixed(1);
}

export function ScanResult({ scan, onTryAgain, onQuotaUpdate }: ScanResultProps) {
  const [result, setResult] = useState(scan);
  const [manualCert, setManualCert] = useState(scan.ocrCertNumber ?? scan.certNumber ?? '');
  const [manualLoading, setManualLoading] = useState(false);
  const [manualError, setManualError] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(!scan.certLookupSuccess);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saveForm, setSaveForm] = useState<SaveFormState>(buildSaveForm(scan));

  useEffect(() => {
    setResult(scan);
    setManualCert(scan.ocrCertNumber ?? scan.certNumber ?? '');
    setShowSaveForm(!scan.certLookupSuccess);
    setSaveSuccess('');
    setSaveError('');
    setManualError('');
    setSaveForm(buildSaveForm(scan));
  }, [scan]);

  const title = useMemo(() => {
    if (!result.certLookupSuccess) {
      return 'Cert lookup unavailable';
    }

    const year = result.cardYear ? `${result.cardYear} ` : '';
    const manufacturer = result.cardManufacturer ? `${result.cardManufacturer} ` : '';
    const player = result.cardPlayer ?? 'Unknown card';
    return `${year}${manufacturer}${player}`.trim();
  }, [result]);

  const subtitle = useMemo(() => {
    const pieces = [result.cardParallel, result.cardNumber].filter((value) => value && value.trim().length > 0);
    return pieces.length > 0 ? pieces.join(' · ') : null;
  }, [result.cardNumber, result.cardParallel]);

  async function runManualLookup() {
    if (!manualCert.trim()) {
      setManualError('Enter a cert number first.');
      return;
    }

    setManualLoading(true);
    setManualError('');

    try {
      const formData = new FormData();
      formData.set('manualCertNumber', manualCert.trim());
      if (result.imageUrl) {
        formData.set('imageUrl', result.imageUrl);
      }

      const response = await fetch('/api/scanner/scan', {
        method: 'POST',
        body: formData,
      });

      const nextResult = (await response.json()) as ScannerResult;
      if (!response.ok) {
        throw new Error(nextResult.error ?? 'Lookup failed');
      }

      setResult(nextResult);
      setShowSaveForm(!nextResult.certLookupSuccess);
      setSaveForm(buildSaveForm(nextResult));
      if (typeof (nextResult as ScannerResult & { remainingScans?: number }).remainingScans === 'number') {
        onQuotaUpdate?.((nextResult as ScannerResult & { remainingScans?: number }).remainingScans as number);
      }
    } catch (error) {
      setManualError(error instanceof Error ? error.message : 'Lookup failed');
    } finally {
      setManualLoading(false);
    }
  }

  async function saveToCollection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveLoading(true);
    setSaveError('');
    setSaveSuccess('');

    try {
      const payload = {
        scanId: result.scanId,
        imageUrl: result.imageUrl,
        cardId: result.cardId,
        player: saveForm.player,
        year: saveForm.year ? Number.parseInt(saveForm.year, 10) : null,
        setName: saveForm.setName,
        parallel: saveForm.parallel,
        cardNumber: saveForm.cardNumber,
        sport: saveForm.sport,
        manufacturer: saveForm.manufacturer,
        certNumber: saveForm.certNumber,
        gradingCompany: saveForm.gradingCompany,
        grade: saveForm.grade ? Number.parseFloat(saveForm.grade) : null,
        gradeDescription: saveForm.gradeDescription,
        qualifierCode: saveForm.qualifierCode,
        autographGrade: saveForm.autographGrade ? Number.parseFloat(saveForm.autographGrade) : null,
        popAtGrade: saveForm.popAtGrade ? Number.parseInt(saveForm.popAtGrade, 10) : null,
        popHigher: saveForm.popHigher ? Number.parseInt(saveForm.popHigher, 10) : null,
        purchasePrice: saveForm.purchasePrice ? Number.parseFloat(saveForm.purchasePrice) : null,
        purchaseDate: saveForm.purchaseDate || null,
        notes: saveForm.notes,
        conditionType: result.certLookupSuccess ? 'graded' : 'raw',
      };

      const response = await fetch('/api/collection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const json = (await response.json()) as { error?: string; collectionCardId?: string };
      if (!response.ok) {
        throw new Error(json.error ?? 'Unable to save collection entry');
      }

      setSaveSuccess(json.collectionCardId ? 'Saved to collection.' : 'Saved.');
      setShowSaveForm(false);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Unable to save collection entry');
    } finally {
      setSaveLoading(false);
    }
  }

  const gradeBadge = gradeLabel(result.officialGrade, result.gradingCompany ?? result.ocrGradingCompany);

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
      <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-soft">
        <div className="border-b border-slate-200 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-600">Scan result</p>
          <p className="mt-1 text-sm text-slate-500">Review the slab photo, then save the card or retry the lookup.</p>
        </div>

        <div className="bg-slate-950 p-4">
          <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-900">
            <img src={result.imageUrl} alt="Uploaded slab" className="h-[360px] w-full object-cover md:h-[460px]" />
          </div>
        </div>
      </div>

      <div className="space-y-5">
        {result.error ? (
          <div className="rounded-[1.75rem] border border-amber-200 bg-amber-50 p-5 text-amber-950">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">Scan status</p>
            <p className="mt-2 text-base leading-7">{result.error}</p>
            {onTryAgain ? (
              <button
                type="button"
                onClick={onTryAgain}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-900"
              >
                <RotateCcw className="h-4 w-4" />
                Try again
              </button>
            ) : null}
          </div>
        ) : null}

        {result.ocrCertNumber ? null : (
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-soft">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Manual cert lookup</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">Enter the PSA cert number if the label text was too small or partially obscured.</p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                value={manualCert}
                onChange={(event) => setManualCert(event.target.value)}
                inputMode="numeric"
                placeholder="Cert number"
                className="h-11 flex-1 rounded-full border border-slate-200 bg-white px-4 text-sm text-slate-950 outline-none ring-0 transition-colors placeholder:text-slate-400 focus:border-brand-300"
              />
              <button
                type="button"
                onClick={runManualLookup}
                disabled={manualLoading}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-brand-600 px-5 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {manualLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Look up
              </button>
            </div>
            {manualError ? <p className="mt-3 text-sm text-rose-600">{manualError}</p> : null}
          </div>
        )}

        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-soft">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-600">Verified card</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{title}</h2>
              {subtitle ? <p className="mt-2 text-sm text-slate-500">{subtitle}</p> : null}
            </div>

            {gradeBadge ? (
              <div className={`rounded-2xl px-4 py-3 text-right ring-1 ${gradeTone(result.officialGrade)}`}>
                <div className="text-sm font-medium uppercase tracking-[0.18em]">
                  {gradeBadge}
                  {result.qualifierCode ? ` (${result.qualifierCode})` : ''}
                </div>
                <div className="mt-1 text-3xl font-semibold">{formatGrade(result.officialGrade)}</div>
              </div>
            ) : (
              <div className="rounded-2xl bg-slate-100 px-4 py-3 text-right text-slate-500 ring-1 ring-slate-200">
                <div className="text-sm font-medium uppercase tracking-[0.18em]">Awaiting PSA match</div>
              </div>
            )}
          </div>

          {result.gradeDescription ? <p className="mt-4 text-sm font-medium text-slate-600">{result.gradeDescription}</p> : null}

          {result.autographGrade !== null ? (
            <div className="mt-4 inline-flex rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700">
              Auto Grade: {Number.isInteger(result.autographGrade) ? result.autographGrade.toFixed(0) : result.autographGrade.toFixed(1)}
            </div>
          ) : null}

          {result.certLookupSuccess ? (
            <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Pop {result.popAtGrade ?? '—'} at this grade · {result.popHigher ?? '—'} higher · {result.popWithQualifier ?? '—'} with qualifiers
            </div>
          ) : null}
        </div>

        {!result.certLookupSuccess ? (
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-soft">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Manual save</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Cert lookup unavailable. Enter the card details below to save this scan to your collection.
            </p>
            <form className="mt-5 space-y-4" onSubmit={saveToCollection}>
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  value={saveForm.player}
                  onChange={(event) => setSaveForm((current) => ({ ...current, player: event.target.value }))}
                  placeholder="Player"
                  className="h-11 rounded-full border border-slate-200 px-4 text-sm outline-none focus:border-brand-300"
                />
                <input
                  value={saveForm.year}
                  onChange={(event) => setSaveForm((current) => ({ ...current, year: event.target.value }))}
                  placeholder="Year"
                  inputMode="numeric"
                  className="h-11 rounded-full border border-slate-200 px-4 text-sm outline-none focus:border-brand-300"
                />
                <input
                  value={saveForm.setName}
                  onChange={(event) => setSaveForm((current) => ({ ...current, setName: event.target.value }))}
                  placeholder="Set"
                  className="h-11 rounded-full border border-slate-200 px-4 text-sm outline-none focus:border-brand-300"
                />
                <input
                  value={saveForm.parallel}
                  onChange={(event) => setSaveForm((current) => ({ ...current, parallel: event.target.value }))}
                  placeholder="Parallel"
                  className="h-11 rounded-full border border-slate-200 px-4 text-sm outline-none focus:border-brand-300"
                />
                <input
                  value={saveForm.cardNumber}
                  onChange={(event) => setSaveForm((current) => ({ ...current, cardNumber: event.target.value }))}
                  placeholder="Card #"
                  className="h-11 rounded-full border border-slate-200 px-4 text-sm outline-none focus:border-brand-300"
                />
                <input
                  value={saveForm.gradingCompany}
                  onChange={(event) => setSaveForm((current) => ({ ...current, gradingCompany: event.target.value }))}
                  placeholder="Grading company"
                  className="h-11 rounded-full border border-slate-200 px-4 text-sm outline-none focus:border-brand-300"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <input
                  value={saveForm.grade}
                  onChange={(event) => setSaveForm((current) => ({ ...current, grade: event.target.value }))}
                  placeholder="Grade"
                  inputMode="decimal"
                  className="h-11 rounded-full border border-slate-200 px-4 text-sm outline-none focus:border-brand-300"
                />
                <input
                  value={saveForm.autographGrade}
                  onChange={(event) => setSaveForm((current) => ({ ...current, autographGrade: event.target.value }))}
                  placeholder="Auto grade"
                  inputMode="decimal"
                  className="h-11 rounded-full border border-slate-200 px-4 text-sm outline-none focus:border-brand-300"
                />
                <input
                  value={saveForm.certNumber}
                  onChange={(event) => setSaveForm((current) => ({ ...current, certNumber: event.target.value }))}
                  placeholder="Cert #"
                  className="h-11 rounded-full border border-slate-200 px-4 text-sm outline-none focus:border-brand-300"
                />
              </div>

              <textarea
                value={saveForm.notes}
                onChange={(event) => setSaveForm((current) => ({ ...current, notes: event.target.value }))}
                placeholder="Notes"
                rows={4}
                className="w-full rounded-[1.25rem] border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-300"
              />

              <div className="grid gap-3 md:grid-cols-2">
                <input
                  value={saveForm.purchasePrice}
                  onChange={(event) => setSaveForm((current) => ({ ...current, purchasePrice: event.target.value }))}
                  placeholder="Purchase price"
                  inputMode="decimal"
                  className="h-11 rounded-full border border-slate-200 px-4 text-sm outline-none focus:border-brand-300"
                />
                <input
                  value={saveForm.purchaseDate}
                  onChange={(event) => setSaveForm((current) => ({ ...current, purchaseDate: event.target.value }))}
                  type="date"
                  className="h-11 rounded-full border border-slate-200 px-4 text-sm outline-none focus:border-brand-300"
                />
              </div>

              <button
                type="submit"
                disabled={saveLoading}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-600 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {saveLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save to Collection
              </button>
              {saveError ? <p className="text-sm text-rose-600">{saveError}</p> : null}
              {saveSuccess ? <p className="text-sm text-emerald-700">{saveSuccess}</p> : null}
            </form>
          </div>
        ) : (
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-soft">
            <button
              type="button"
              onClick={() => setShowSaveForm((current) => !current)}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-600 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-700"
            >
              <Save className="h-4 w-4" />
              Save to Collection
            </button>

            {showSaveForm ? (
              <form className="mt-5 space-y-4" onSubmit={saveToCollection}>
                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    value={saveForm.purchasePrice}
                    onChange={(event) => setSaveForm((current) => ({ ...current, purchasePrice: event.target.value }))}
                    placeholder="Purchase price"
                    inputMode="decimal"
                    className="h-11 rounded-full border border-slate-200 px-4 text-sm outline-none focus:border-brand-300"
                  />
                  <input
                    value={saveForm.purchaseDate}
                    onChange={(event) => setSaveForm((current) => ({ ...current, purchaseDate: event.target.value }))}
                    type="date"
                    className="h-11 rounded-full border border-slate-200 px-4 text-sm outline-none focus:border-brand-300"
                  />
                </div>
                <textarea
                  value={saveForm.notes}
                  onChange={(event) => setSaveForm((current) => ({ ...current, notes: event.target.value }))}
                  placeholder="Notes"
                  rows={4}
                  className="w-full rounded-[1.25rem] border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-300"
                />
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-600 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {saveLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save to Collection
                </button>
                {saveError ? <p className="text-sm text-rose-600">{saveError}</p> : null}
                {saveSuccess ? <p className="text-sm text-emerald-700">{saveSuccess}</p> : null}
              </form>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
