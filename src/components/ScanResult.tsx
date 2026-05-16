'use client';
/* eslint-disable @next/next/no-img-element */

import { ExternalLink, Loader2, RotateCcw, Save, Search } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { readJsonResponse } from '@/lib/http-json';
import { getPSACertUrl } from '@/lib/cert-number';
import {
  confidenceLabel,
  formatCatalogText,
  formatGradeValue,
  getVerifiedSubtitle,
  getVerifiedTitle,
  needsCertConfirmation,
} from '@/lib/scanner-presenter';
import type { ScannerResult } from '@/lib/scanner';

type ScanResultProps = {
  scan: ScannerResult;
  onTryAgain?: () => void;
  onQuotaUpdate?: (remaining: number) => void;
};

export function ScanResult({ scan, onTryAgain, onQuotaUpdate }: ScanResultProps) {
  const [result, setResult] = useState(scan);
  const [certInput, setCertInput] = useState(scan.ocrCertNumber ?? scan.certNumber ?? '');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    setResult(scan);
    setCertInput(scan.ocrCertNumber ?? scan.certNumber ?? '');
    setLookupError('');
    setSaveSuccess('');
    setSaveError('');
  }, [scan]);

  const title = useMemo(() => getVerifiedTitle(result), [result]);
  const subtitle = useMemo(() => getVerifiedSubtitle(result), [result]);
  const showCertPrompt = useMemo(() => needsCertConfirmation(result), [result]);
  const psaUrl = useMemo(() => getPSACertUrl(result.certNumber), [result.certNumber]);
  const hasImage = Boolean(result.imageUrl?.trim());

  async function lookupCert() {
    if (!certInput.trim()) {
      setLookupError('Enter your PSA cert number.');
      return;
    }

    setLookupLoading(true);
    setLookupError('');

    try {
      const formData = new FormData();
      formData.set('manualCertNumber', certInput.trim());
      if (result.imageUrl) {
        formData.set('imageUrl', result.imageUrl);
      }

      const response = await fetch('/api/scanner/scan', {
        method: 'POST',
        body: formData,
      });

      const nextResult = await readJsonResponse<ScannerResult & { remainingScans?: number }>(response);
      if (!response.ok) {
        throw new Error(nextResult.error ?? 'PSA lookup failed.');
      }

      setResult(nextResult);
      if (typeof nextResult.remainingScans === 'number') {
        onQuotaUpdate?.(nextResult.remainingScans);
      }
    } catch (error) {
      setLookupError(error instanceof Error ? error.message : 'PSA lookup failed.');
    } finally {
      setLookupLoading(false);
    }
  }

  async function saveToCollection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!result.certLookupSuccess) {
      return;
    }

    setSaveLoading(true);
    setSaveError('');
    setSaveSuccess('');

    try {
      const response = await fetch('/api/collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scanId: result.scanId,
          imageUrl: result.imageUrl,
          cardId: result.cardId,
          player: result.cardPlayer,
          year: result.cardYear,
          setName: result.cardSet ?? result.cardManufacturer,
          parallel: result.cardParallel,
          cardNumber: result.cardNumber,
          sport: result.cardSport,
          manufacturer: result.cardManufacturer,
          certNumber: result.certNumber,
          gradingCompany: result.gradingCompany,
          grade: result.officialGrade,
          gradeDescription: result.gradeDescription,
          qualifierCode: result.qualifierCode,
          autographGrade: result.autographGrade,
          popAtGrade: result.popAtGrade,
          popHigher: result.popHigher,
          conditionType: 'graded',
        }),
      });

      const json = await readJsonResponse<{ error?: string }>(response);
      if (!response.ok) {
        throw new Error(json.error ?? 'Unable to save.');
      }

      setSaveSuccess('Saved to your collection.');
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Unable to save.');
    } finally {
      setSaveLoading(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-soft">
      <ResultHeader result={result} onTryAgain={onTryAgain} />

      <div className="grid gap-0 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="border-b border-slate-100 bg-slate-950 p-4 lg:border-b-0 lg:border-r">
          {hasImage ? (
            <img src={result.imageUrl} alt="Scanned slab" className="h-[280px] w-full rounded-2xl object-cover lg:h-full lg:min-h-[360px]" />
          ) : (
            <div className="flex h-[280px] items-center justify-center rounded-2xl bg-slate-900 text-sm text-slate-400">
              No slab photo
            </div>
          )}
        </div>

        <div className="space-y-5 p-6">
          {result.certLookupSuccess && title ? (
            <VerifiedSummary
              title={title}
              subtitle={subtitle}
              grade={result.officialGrade}
              gradeDescription={result.gradeDescription}
              certNumber={result.certNumber}
              psaUrl={psaUrl}
            />
          ) : (
            <PendingSummary
              certInput={certInput}
              confidence={result.ocrConfidence}
              error={result.error}
              lookupError={lookupError}
              lookupLoading={lookupLoading}
              ocrCert={result.ocrCertNumber}
              showCertPrompt={showCertPrompt}
              onCertChange={setCertInput}
              onLookup={lookupCert}
            />
          )}

          {result.certLookupSuccess ? (
            <form className="space-y-3 border-t border-slate-100 pt-5" onSubmit={saveToCollection}>
              <button
                type="submit"
                disabled={saveLoading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-70"
              >
                {saveLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save to collection
              </button>
              {saveError ? <p className="text-sm text-rose-600">{saveError}</p> : null}
              {saveSuccess ? <p className="text-sm text-emerald-700">{saveSuccess}</p> : null}
            </form>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function ResultHeader({ result, onTryAgain }: { result: ScannerResult; onTryAgain?: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">Scan result</p>
        <p className="mt-1 text-sm text-slate-500">
          {result.certLookupSuccess ? 'PSA verified' : 'Confirm your PSA cert number'}
        </p>
      </div>
      {onTryAgain ? (
        <button
          type="button"
          onClick={onTryAgain}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          <RotateCcw className="h-4 w-4" />
          Scan again
        </button>
      ) : null}
    </div>
  );
}

function VerifiedSummary({
  title,
  subtitle,
  grade,
  gradeDescription,
  certNumber,
  psaUrl,
}: {
  title: string;
  subtitle: string | null;
  grade: number | null;
  gradeDescription: string | null;
  certNumber: string | null;
  psaUrl: string | null;
}) {
  return (
    <div className="space-y-4">
      <SummaryTop title={title} subtitle={subtitle} grade={grade} />
      {gradeDescription ? (
        <p className="text-sm text-slate-600">{formatCatalogText(gradeDescription)}</p>
      ) : null}
      <div className="rounded-xl bg-slate-50 px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">PSA cert</p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <p className="text-lg font-semibold tracking-tight text-slate-950">{certNumber}</p>
          {psaUrl ? (
            <a
              href={psaUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline"
            >
              View on PSA
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SummaryTop({
  title,
  subtitle,
  grade,
}: {
  title: string;
  subtitle: string | null;
  grade: number | null;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-950">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      <GradeBadge grade={grade} />
    </div>
  );
}

function GradeBadge({ grade }: { grade: number | null }) {
  return (
    <div className="shrink-0 rounded-2xl bg-brand-50 px-4 py-3 text-right ring-1 ring-brand-100">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-600">PSA</p>
      <p className="text-3xl font-semibold text-slate-950">{formatGradeValue(grade)}</p>
    </div>
  );
}

function PendingSummary({
  certInput,
  confidence,
  error,
  lookupError,
  lookupLoading,
  ocrCert,
  showCertPrompt,
  onCertChange,
  onLookup,
}: {
  certInput: string;
  confidence: ScannerResult['ocrConfidence'];
  error?: string;
  lookupError: string;
  lookupLoading: boolean;
  ocrCert: string | null;
  showCertPrompt: boolean;
  onCertChange: (value: string) => void;
  onLookup: () => void;
}) {
  return (
    <div className="space-y-4">
      {error ? <p className="text-sm leading-6 text-amber-800">{error}</p> : null}

      {showCertPrompt ? (
        <>
          <p className="text-sm text-slate-600">
            {ocrCert
              ? 'PSA did not recognize the number we read. Confirm the cert below and fetch again.'
              : 'Enter your PSA cert number to load card details.'}
          </p>
          {ocrCert ? (
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
              {confidenceLabel(confidence)}
              {ocrCert ? ` · detected ${ocrCert}` : ''}
            </p>
          ) : null}
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={certInput}
              onChange={(event) => onCertChange(event.target.value)}
              inputMode="numeric"
              placeholder="PSA cert number"
              className="h-11 flex-1 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-brand-300"
            />
            <button
              type="button"
              onClick={onLookup}
              disabled={lookupLoading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-70"
            >
              {lookupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Fetch from PSA
            </button>
          </div>
          {lookupError ? <p className="text-sm text-rose-600">{lookupError}</p> : null}
        </>
      ) : null}
    </div>
  );
}
