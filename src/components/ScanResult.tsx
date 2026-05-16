'use client';
/* eslint-disable @next/next/no-img-element */

import { Loader2, RotateCcw, Save, Search } from 'lucide-react';
import { useEffect, useMemo, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { readJsonResponse } from '@/lib/http-json';
import type { ScannerResult } from '@/lib/scanner';
import {
  buildPopulationRows,
  buildScanDetailRows,
  confidenceLabel,
  formatGradeValue,
  getScanHeadline,
  getScanStatus,
  getScanSubheadline,
} from '@/lib/scanner-presenter';

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

type DetailRow = { label: string; value: string };

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

function statusStyles(status: ReturnType<typeof getScanStatus>) {
  if (status === 'verified') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-900';
  }

  if (status === 'partial') {
    return 'border-amber-200 bg-amber-50 text-amber-950';
  }

  return 'border-slate-200 bg-slate-50 text-slate-700';
}

function statusLabel(status: ReturnType<typeof getScanStatus>) {
  if (status === 'verified') {
    return 'PSA verified';
  }

  if (status === 'partial') {
    return 'Partial match';
  }

  return 'Needs input';
}

function DetailGrid({ rows }: { rows: DetailRow[] }) {
  return (
    <dl className="divide-y divide-slate-100">
      {rows.map((row) => (
        <DetailRowItem key={row.label} label={row.label} value={row.value} />
      ))}
    </dl>
  );
}

function DetailRowItem({ label, value }: DetailRow) {
  return (
    <div className="grid grid-cols-[minmax(0,0.42fr)_minmax(0,1fr)] gap-4 px-1 py-3.5">
      <dt className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">{label}</dt>
      <dd className="text-sm font-medium text-slate-900">{value}</dd>
    </div>
  );
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

  const status = useMemo(() => getScanStatus(result), [result]);
  const headline = useMemo(() => getScanHeadline(result), [result]);
  const subheadline = useMemo(() => getScanSubheadline(result), [result]);
  const detailRows = useMemo(() => buildScanDetailRows(result), [result]);
  const populationRows = useMemo(() => buildPopulationRows(result), [result]);
  const hasImage = Boolean(result.imageUrl?.trim());

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

      const nextResult = await readJsonResponse<ScannerResult & { remainingScans?: number }>(response);
      if (!response.ok) {
        throw new Error(nextResult.error ?? 'Lookup failed');
      }

      setResult(nextResult);
      setShowSaveForm(!nextResult.certLookupSuccess);
      setSaveForm(buildSaveForm(nextResult));
      if (typeof nextResult.remainingScans === 'number') {
        onQuotaUpdate?.(nextResult.remainingScans);
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await readJsonResponse<{ error?: string; collectionCardId?: string }>(response);
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

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-600">Scan result</p>
          <p className="mt-1 text-sm text-slate-500">Structured card details from your slab photo and cert lookup.</p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${statusStyles(status)}`}>
          {statusLabel(status)}
        </span>
      </div>

      {result.error ? (
        <ErrorBanner error={result.error} onTryAgain={onTryAgain} />
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-soft">
          <div className="border-b border-slate-100 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Slab photo</p>
          </div>
          {hasImage ? (
            <div className="bg-slate-950 p-3">
              <img
                src={result.imageUrl}
                alt="Uploaded slab"
                className="h-[320px] w-full rounded-[1.25rem] object-cover md:h-[420px]"
              />
            </div>
          ) : (
            <div className="flex h-[220px] items-center justify-center bg-slate-50 px-6 text-sm text-slate-500">
              No preview image stored for this scan.
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-soft">
            <div className="flex items-start justify-between gap-4">
              <HeadlineBlock headline={headline} subheadline={subheadline} />
              <div className="shrink-0 text-right">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Grade</p>
                <p className="mt-1 text-3xl font-semibold text-slate-950">{formatGradeValue(result.officialGrade)}</p>
                <p className="mt-1 text-xs text-slate-500">{result.gradingCompany ?? result.ocrGradingCompany ?? '—'}</p>
              </div>
            </div>

            {result.gradeDescription ? (
              <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">{result.gradeDescription}</p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                {confidenceLabel(result.ocrConfidence)}
              </span>
              {result.ocrCertNumber ? (
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                  OCR cert {result.ocrCertNumber}
                </span>
              ) : null}
              {result.isDualCert ? (
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                  Dual cert
                </span>
              ) : null}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-soft">
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Card details</p>
            <DetailGrid rows={detailRows} />
          </div>

          {populationRows.length > 0 ? (
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-soft">
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Population</p>
              <DetailGrid rows={populationRows} />
            </div>
          ) : null}
        </div>
      </div>

      {!result.certLookupSuccess && !result.ocrCertNumber ? (
        <ManualLookupPanel
          manualCert={manualCert}
          manualError={manualError}
          manualLoading={manualLoading}
          onCertChange={setManualCert}
          onLookup={runManualLookup}
        />
      ) : null}

      <SavePanel
        result={result}
        showSaveForm={showSaveForm}
        saveForm={saveForm}
        saveLoading={saveLoading}
        saveError={saveError}
        saveSuccess={saveSuccess}
        onToggleSave={() => setShowSaveForm((current) => !current)}
        onSave={saveToCollection}
        onSaveFormChange={setSaveForm}
      />
    </section>
  );
}

function ErrorBanner({ error, onTryAgain }: { error: string; onTryAgain?: () => void }) {
  return (
    <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 px-5 py-4">
      <p className="text-sm leading-7 text-amber-950">{error}</p>
      {onTryAgain ? (
        <button
          type="button"
          onClick={onTryAgain}
          className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-900"
        >
          <RotateCcw className="h-4 w-4" />
          Scan another slab
        </button>
      ) : null}
    </div>
  );
}

function HeadlineBlock({ headline, subheadline }: { headline: string; subheadline: string | null }) {
  return (
    <div className="min-w-0">
      <h2 className="truncate text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">{headline}</h2>
      {subheadline ? <p className="mt-2 text-sm text-slate-500">{subheadline}</p> : null}
    </div>
  );
}

function ManualLookupPanel({
  manualCert,
  manualError,
  manualLoading,
  onCertChange,
  onLookup,
}: {
  manualCert: string;
  manualError: string;
  manualLoading: boolean;
  onCertChange: (value: string) => void;
  onLookup: () => void;
}) {
  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-soft">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Manual PSA lookup</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">Enter the cert number if the label was hard to read.</p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          value={manualCert}
          onChange={(event) => onCertChange(event.target.value)}
          inputMode="numeric"
          placeholder="Cert number"
          className="h-11 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-950 outline-none focus:border-brand-300"
        />
        <button
          type="button"
          onClick={onLookup}
          disabled={manualLoading}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {manualLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Look up cert
        </button>
      </div>
      {manualError ? <p className="mt-3 text-sm text-rose-600">{manualError}</p> : null}
    </div>
  );
}

function SavePanel({
  result,
  showSaveForm,
  saveForm,
  saveLoading,
  saveError,
  saveSuccess,
  onToggleSave,
  onSave,
  onSaveFormChange,
}: {
  result: ScannerResult;
  showSaveForm: boolean;
  saveForm: SaveFormState;
  saveLoading: boolean;
  saveError: string;
  saveSuccess: string;
  onToggleSave: () => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  onSaveFormChange: Dispatch<SetStateAction<SaveFormState>>;
}) {
  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Collection</p>
          <p className="mt-1 text-sm text-slate-600">
            {result.certLookupSuccess
              ? 'Save this verified slab to your collection.'
              : 'Add card details manually if cert lookup did not complete.'}
          </p>
        </div>
        {result.certLookupSuccess ? (
          <button
            type="button"
            onClick={onToggleSave}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50"
          >
            <Save className="h-4 w-4" />
            {showSaveForm ? 'Hide form' : 'Save to collection'}
          </button>
        ) : null}
      </div>

      {(showSaveForm || !result.certLookupSuccess) && (
        <form className="mt-5 space-y-4" onSubmit={onSave}>
          {!result.certLookupSuccess ? (
            <div className="grid gap-3 md:grid-cols-2">
              <input
                value={saveForm.player}
                onChange={(event) => onSaveFormChange((current) => ({ ...current, player: event.target.value }))}
                placeholder="Player"
                className="h-11 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-brand-300"
              />
              <input
                value={saveForm.year}
                onChange={(event) => onSaveFormChange((current) => ({ ...current, year: event.target.value }))}
                placeholder="Year"
                inputMode="numeric"
                className="h-11 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-brand-300"
              />
              <input
                value={saveForm.setName}
                onChange={(event) => onSaveFormChange((current) => ({ ...current, setName: event.target.value }))}
                placeholder="Set"
                className="h-11 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-brand-300"
              />
              <input
                value={saveForm.parallel}
                onChange={(event) => onSaveFormChange((current) => ({ ...current, parallel: event.target.value }))}
                placeholder="Parallel"
                className="h-11 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-brand-300"
              />
              <input
                value={saveForm.cardNumber}
                onChange={(event) => onSaveFormChange((current) => ({ ...current, cardNumber: event.target.value }))}
                placeholder="Card #"
                className="h-11 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-brand-300"
              />
              <input
                value={saveForm.gradingCompany}
                onChange={(event) => onSaveFormChange((current) => ({ ...current, gradingCompany: event.target.value }))}
                placeholder="Grading company"
                className="h-11 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-brand-300"
              />
              <input
                value={saveForm.grade}
                onChange={(event) => onSaveFormChange((current) => ({ ...current, grade: event.target.value }))}
                placeholder="Grade"
                inputMode="decimal"
                className="h-11 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-brand-300"
              />
              <input
                value={saveForm.certNumber}
                onChange={(event) => onSaveFormChange((current) => ({ ...current, certNumber: event.target.value }))}
                placeholder="Cert #"
                className="h-11 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-brand-300"
              />
            </div>
          ) : null}

          <PurchaseFields saveForm={saveForm} onSaveFormChange={onSaveFormChange} />

          <button
            type="submit"
            disabled={saveLoading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saveLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save to collection
          </button>
          {saveError ? <p className="text-sm text-rose-600">{saveError}</p> : null}
          {saveSuccess ? <p className="text-sm text-emerald-700">{saveSuccess}</p> : null}
        </form>
      )}
    </div>
  );
}

function PurchaseFields({
  saveForm,
  onSaveFormChange,
}: {
  saveForm: SaveFormState;
  onSaveFormChange: Dispatch<SetStateAction<SaveFormState>>;
}) {
  return (
    <>
      <PurchaseInputs saveForm={saveForm} onSaveFormChange={onSaveFormChange} />
      <textarea
        value={saveForm.notes}
        onChange={(event) => onSaveFormChange((current) => ({ ...current, notes: event.target.value }))}
        placeholder="Notes"
        rows={4}
        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-300"
      />
    </>
  );
}

function PurchaseInputs({
  saveForm,
  onSaveFormChange,
}: {
  saveForm: SaveFormState;
  onSaveFormChange: Dispatch<SetStateAction<SaveFormState>>;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <input
        value={saveForm.purchasePrice}
        onChange={(event) => onSaveFormChange((current) => ({ ...current, purchasePrice: event.target.value }))}
        placeholder="Purchase price"
        inputMode="decimal"
        className="h-11 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-brand-300"
      />
      <input
        value={saveForm.purchaseDate}
        onChange={(event) => onSaveFormChange((current) => ({ ...current, purchaseDate: event.target.value }))}
        type="date"
        className="h-11 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-brand-300"
      />
    </div>
  );
}
