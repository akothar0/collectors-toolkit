'use client';
/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import type { Route } from 'next';
import { BadgeCheck, ExternalLink, Loader2, RotateCcw, Save, Search, X } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { readJsonResponse } from '@/lib/http-json';
import { getCertUrl } from '@/lib/cert-number';
import {
  confidenceLabel,
  formatAutographGradeLabel,
  formatCatalogText,
  formatGradeValue,
  formatPopCount,
  formatSubGradesLabel,
  getCertLinkLabel,
  getCertRegistryLabel,
  getGraderLabel,
  getVerificationDetail,
  getVerificationHeadline,
  getVerifiedCategoryLabel,
  getVerifiedSubtitle,
  getVerifiedTitle,
  hasRegistryPopulationStats,
  needsCertConfirmation,
} from '@/lib/scanner-presenter';
import type { OcrGradingCompany, ScannerResult } from '@/lib/scanner';

const GRADER_OPTIONS: OcrGradingCompany[] = ['PSA', 'BGS', 'SGC', 'CGC'];
const PURCHASE_SOURCES = ['eBay', 'LCS', 'Trade', 'Gift', 'Other'] as const;

type ScanResultProps = {
  scan: ScannerResult;
  onTryAgain?: () => void;
  onQuotaUpdate?: (remaining: number) => void;
  readOnly?: boolean;
};

function resolveGraderInput(scan: ScannerResult): OcrGradingCompany {
  if (scan.ocrGradingCompany && scan.ocrGradingCompany !== 'UNKNOWN') {
    return scan.ocrGradingCompany;
  }

  if (
    scan.gradingCompany === 'PSA' ||
    scan.gradingCompany === 'BGS' ||
    scan.gradingCompany === 'SGC' ||
    scan.gradingCompany === 'CGC'
  ) {
    return scan.gradingCompany;
  }

  return 'PSA';
}

export function ScanResult({ scan, onTryAgain, onQuotaUpdate, readOnly = false }: ScanResultProps) {
  const [result, setResult] = useState(scan);
  const [certInput, setCertInput] = useState(scan.ocrCertNumber ?? scan.certNumber ?? '');
  const [graderInput, setGraderInput] = useState<OcrGradingCompany>(resolveGraderInput(scan));
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [saveOverlayOpen, setSaveOverlayOpen] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [purchaseSource, setPurchaseSource] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    setResult(scan);
    setCertInput(scan.ocrCertNumber ?? scan.certNumber ?? '');
    setGraderInput(resolveGraderInput(scan));
    setLookupError('');
    setSaveSuccess(scan.savedToCollection ? 'Saved to your collection.' : '');
    setSaveError('');
    setSaveOverlayOpen(false);
  }, [scan]);

  const title = useMemo(() => getVerifiedTitle(result), [result]);
  const subtitle = useMemo(() => getVerifiedSubtitle(result), [result]);
  const showCertPrompt = useMemo(() => needsCertConfirmation(result), [result]);
  const collectionAddHref = useMemo(() => {
    const params = new URLSearchParams();
    if (result.cardPlayer) params.set('player', result.cardPlayer);
    if (result.cardYear) params.set('year', String(result.cardYear));
    const setVal = result.cardSet ?? result.cardManufacturer;
    if (setVal) params.set('set', setVal);
    if (result.officialGrade != null) params.set('grade', String(result.officialGrade));
    if (result.gradingCompany) params.set('company', result.gradingCompany);
    if (result.certNumber) params.set('cert', result.certNumber);
    const qs = params.toString();
    return `/collection/add${qs ? `?${qs}` : ''}`;
  }, [result]);
  const certUrl = useMemo(
    () => getCertUrl(result.gradingCompany, result.certNumber),
    [result.gradingCompany, result.certNumber]
  );
  const hasImage = Boolean(result.imageUrl?.trim());
  const alreadySaved = Boolean(result.savedToCollection || result.collectionCardId);

  async function lookupCert() {
    if (!certInput.trim()) {
      setLookupError('Enter your cert number.');
      return;
    }

    setLookupLoading(true);
    setLookupError('');

    try {
      const formData = new FormData();
      formData.set('manualCertNumber', certInput.trim());
      formData.set('manualGradingCompany', graderInput);
      if (result.imageUrl) {
        formData.set('imageUrl', result.imageUrl);
      }

      const response = await fetch('/api/scanner/scan', {
        method: 'POST',
        body: formData,
      });

      const nextResult = await readJsonResponse<ScannerResult & { remainingScans?: number }>(response);
      if (!response.ok) {
        throw new Error(nextResult.error ?? 'Cert lookup failed.');
      }

      setResult(nextResult);
      if (typeof nextResult.remainingScans === 'number') {
        onQuotaUpdate?.(nextResult.remainingScans);
      }
    } catch (error) {
      setLookupError(error instanceof Error ? error.message : 'Cert lookup failed.');
    } finally {
      setLookupLoading(false);
    }
  }

  async function saveToCollection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!result.certLookupSuccess || alreadySaved) {
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
          subGrades: result.subGrades,
          popAtGrade: result.popAtGrade,
          popHigher: result.popHigher,
          conditionType: 'graded',
          purchasePrice: purchasePrice.trim() ? Number.parseFloat(purchasePrice) : null,
          purchaseDate: purchaseDate.trim() || null,
          purchaseSource: purchaseSource.trim() || null,
          notes: notes.trim() || null,
        }),
      });

      const json = await readJsonResponse<{
        error?: string;
        collectionCardId?: string;
        alreadySaved?: boolean;
      }>(response);
      if (!response.ok) {
        throw new Error(json.error ?? 'Unable to save.');
      }

      setResult({
        ...result,
        savedToCollection: true,
        collectionCardId: json.collectionCardId ?? result.collectionCardId,
      });
      setSaveSuccess('Saved to your collection.');
      setSaveOverlayOpen(false);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Unable to save.');
    } finally {
      setSaveLoading(false);
    }
  }

  return (
    <section className="relative overflow-hidden rounded border border-ink-700 bg-ink-900">
      <ResultHeader result={result} onTryAgain={readOnly ? undefined : onTryAgain} />

      <ScanGrid>
        <div className="border-b border-ink-800 bg-ink-950 p-4 lg:border-b-0 lg:border-r">
          {hasImage ? (
            <img
              src={result.imageUrl}
              alt="Scanned slab"
              className="h-[280px] w-full rounded object-cover lg:h-full lg:min-h-[360px]"
            />
          ) : (
            <div className="flex h-[280px] items-center justify-center rounded bg-ink-900 text-sm text-ash-500">
              No slab photo
            </div>
          )}
        </div>

        <div className="space-y-5 p-6">
          {result.certLookupSuccess && title ? (
            <VerifiedSummary
              scan={result}
              title={title}
              subtitle={subtitle}
              grade={result.officialGrade}
              gradeDescription={result.gradeDescription}
              certNumber={result.certNumber}
              certUrl={certUrl}
            />
          ) : (
            <PendingSummary
              certInput={certInput}
              graderInput={graderInput}
              confidence={result.ocrConfidence}
              gradingCompany={result.gradingCompany ?? result.ocrGradingCompany}
              error={result.error}
              lookupError={lookupError}
              lookupLoading={lookupLoading}
              ocrCert={result.ocrCertNumber}
              certUrl={getCertUrl(graderInput, certInput || result.ocrCertNumber)}
              showCertPrompt={showCertPrompt}
              readOnly={readOnly}
              onCertChange={setCertInput}
              onGraderChange={setGraderInput}
              onLookup={lookupCert}
            />
          )}

          {alreadySaved && !readOnly ? (
            <div className="space-y-1 border-t border-ink-800 pt-4">
              <p className="text-sm font-medium text-emerald-400">In your collection</p>
              <Link href="/collection" className="text-sm font-medium text-brand-500 hover:text-brand-400 hover:underline underline-offset-4">
                View →
              </Link>
            </div>
          ) : null}
          {saveSuccess && !readOnly && !alreadySaved ? (
            <p className="border-t border-ink-800 pt-4 text-sm text-emerald-400">
              Saved.{' '}
              <Link href="/collection" className="font-medium text-brand-500 hover:underline underline-offset-4">
                View in collection →
              </Link>
            </p>
          ) : null}
        </div>
      </ScanGrid>

      {!readOnly ? (
        <div className="flex flex-col gap-3 border-t border-ink-700 p-6 sm:flex-row sm:items-center">
          <Link
            href={collectionAddHref as Route}
            className="inline-flex h-11 flex-1 items-center justify-center rounded bg-brand-500 px-6 text-sm font-semibold text-white hover:bg-brand-400"
          >
            Add to Collection
          </Link>
          <div className="flex items-center gap-4">
            {!alreadySaved ? (
              <button
                type="button"
                onClick={() => setSaveOverlayOpen(true)}
                className="text-sm font-medium text-brand-500 hover:text-brand-400 hover:underline underline-offset-4"
              >
                or save with notes →
              </button>
            ) : null}
            {onTryAgain ? (
              <button
                type="button"
                onClick={onTryAgain}
                className="text-sm font-medium text-ash-400 hover:text-ash-200 hover:underline underline-offset-4"
              >
                Scan another →
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {saveOverlayOpen ? (
        <SaveOverlay
          purchasePrice={purchasePrice}
          purchaseDate={purchaseDate}
          purchaseSource={purchaseSource}
          notes={notes}
          saveLoading={saveLoading}
          saveError={saveError}
          onClose={() => setSaveOverlayOpen(false)}
          onPurchasePriceChange={setPurchasePrice}
          onPurchaseDateChange={setPurchaseDate}
          onPurchaseSourceChange={setPurchaseSource}
          onNotesChange={setNotes}
          onSubmit={saveToCollection}
        />
      ) : null}
    </section>
  );
}

function ScanGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-0 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">{children}</div>;
}

function ScanSaveSection({ children }: { children: React.ReactNode }) {
  return <div className="space-y-3 border-t border-ink-800 pt-5">{children}</div>;
}

function ResultHeader({ result, onTryAgain }: { result: ScannerResult; onTryAgain?: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-800 px-6 py-4">
      <ResultHeaderCopy result={result} />
      {onTryAgain ? (
        <button
          type="button"
          onClick={onTryAgain}
          className="text-sm font-medium text-ash-400 hover:text-ash-200 hover:underline underline-offset-4"
        >
          Scan another →
        </button>
      ) : null}
    </div>
  );
}

function ResultHeaderCopy({ result }: { result: ScannerResult }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-ash-500">Scan Result</p>
      <p className="mt-1 text-sm text-ash-400">
        {result.certLookupSuccess
          ? getVerificationHeadline(result)
          : `Confirm your ${getGraderLabel(result.gradingCompany ?? result.ocrGradingCompany)} cert number`}
      </p>
    </div>
  );
}

function VerifiedSummary({
  scan,
  title,
  subtitle,
  grade,
  gradeDescription,
  certNumber,
  certUrl,
}: {
  scan: ScannerResult;
  title: string;
  subtitle: string | null;
  grade: number | null;
  gradeDescription: string | null;
  certNumber: string | null;
  certUrl: string | null;
}) {
  const subGradesLabel = formatSubGradesLabel(scan.subGrades);

  return (
    <div className="space-y-4">
      <VerificationBanner scan={scan} />
      <SummaryTop title={title} subtitle={subtitle} grade={grade} gradingCompany={scan.gradingCompany} />
      {gradeDescription ? (
        <p className="text-sm text-ash-300">{formatCatalogText(gradeDescription)}</p>
      ) : null}
      {subGradesLabel ? <p className="text-sm font-medium text-ash-200">Subgrades: {subGradesLabel}</p> : null}
      <VerifiedStats scan={scan} />
      <div className="rounded bg-ink-800 px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-ash-500">
          {getCertRegistryLabel(scan.gradingCompany)}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <p className="text-lg font-semibold tracking-tight text-ash-50">{certNumber}</p>
          {certUrl ? (
            <a
              href={certUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium text-brand-500 hover:underline"
            >
              {getCertLinkLabel(scan.gradingCompany)}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function VerificationBanner({ scan }: { scan: ScannerResult }) {
  return (
    <div
      className="flex gap-3 rounded border border-emerald-800 bg-emerald-950 px-4 py-4"
      role="status"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-emerald-500 text-white">
        <BadgeCheck className="h-4 w-4" aria-hidden />
      </div>
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-semibold text-emerald-300">{getVerificationHeadline(scan)}</p>
        <p className="text-sm leading-6 text-emerald-400/80">{getVerificationDetail(scan)}</p>
      </div>
    </div>
  );
}

function SummaryTop({
  title,
  subtitle,
  grade,
  gradingCompany,
}: {
  title: string;
  subtitle: string | null;
  grade: number | null;
  gradingCompany: string | null;
}) {
  return (
    <SummaryTopLayout title={title} subtitle={subtitle} grade={grade} gradingCompany={gradingCompany} />
  );
}

function SummaryTopLayout({
  title,
  subtitle,
  grade,
  gradingCompany,
}: {
  title: string;
  subtitle: string | null;
  grade: number | null;
  gradingCompany: string | null;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-ash-50">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-ash-400">{subtitle}</p> : null}
      </div>
      <GradeBadge grade={grade} gradingCompany={gradingCompany} />
    </div>
  );
}

function VerifiedStats({ scan }: { scan: ScannerResult }) {
  const category = getVerifiedCategoryLabel(scan);
  const autographLabel = formatAutographGradeLabel(scan.autographGrade);
  const showPopulation = hasRegistryPopulationStats(scan);
  const popAtGrade = formatPopCount(scan.popAtGrade);
  const popHigher = formatPopCount(scan.popHigher);
  const popWithQualifier = formatPopCount(scan.popWithQualifier);
  const showPopWithQualifier =
    scan.gradingCompany === 'PSA' &&
    scan.popWithQualifier !== null &&
    scan.popWithQualifier > 0 &&
    popWithQualifier !== null;
  const popLabel =
    scan.gradingCompany === 'PSA'
      ? 'PSA population'
      : scan.gradingCompany === 'BGS'
        ? 'BGS population'
        : 'Population at grade';

  if (!category && !showPopulation && !autographLabel) {
    return null;
  }

  return (
    <div className="space-y-3">
      {category ? (
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-ash-500">{category}</p>
      ) : null}
      {showPopulation ? (
        <div
          className={`grid gap-3 ${showPopWithQualifier ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2'}`}
        >
          {popAtGrade !== null ? <StatCard label={popLabel} value={popAtGrade} /> : null}
          {popHigher !== null ? <StatCard label="Pop higher" value={popHigher} /> : null}
          {showPopWithQualifier ? <StatCard label="Pop w/ qualifier" value={popWithQualifier} /> : null}
        </div>
      ) : null}
      {autographLabel ? <p className="text-sm font-medium text-ash-200">{autographLabel}</p> : null}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-ink-800 px-4 py-3 ring-1 ring-ink-800">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ash-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-ash-50">{value}</p>
    </div>
  );
}

function GradeBadge({ grade, gradingCompany }: { grade: number | null; gradingCompany: string | null }) {
  return (
    <div className="shrink-0 rounded border border-brand-700 bg-brand-900/20 px-4 py-3 text-right">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-brand-500">
        {getGraderLabel(gradingCompany)}
      </p>
      <p className="tabular-nums text-3xl font-semibold text-ash-50">{formatGradeValue(grade)}</p>
    </div>
  );
}

function PendingSummary({
  certInput,
  graderInput,
  confidence,
  gradingCompany,
  error,
  lookupError,
  lookupLoading,
  ocrCert,
  certUrl,
  showCertPrompt,
  readOnly,
  onCertChange,
  onGraderChange,
  onLookup,
}: {
  certInput: string;
  graderInput: OcrGradingCompany;
  confidence: ScannerResult['ocrConfidence'];
  gradingCompany: string | null;
  error?: string;
  lookupError: string;
  lookupLoading: boolean;
  ocrCert: string | null;
  certUrl: string | null;
  showCertPrompt: boolean;
  readOnly?: boolean;
  onCertChange: (value: string) => void;
  onGraderChange: (value: OcrGradingCompany) => void;
  onLookup: () => void;
}) {
  const graderLabel = getGraderLabel(gradingCompany ?? graderInput);

  return (
    <div className="space-y-4">
      {error ? (
        <p
          className={`text-sm leading-6 ${
            error.includes('daily limit') ? 'text-rose-800' : 'text-amber-800'
          }`}
        >
          {error}
        </p>
      ) : null}

      {showCertPrompt && !readOnly ? (
        <>
          <p className="text-sm text-ash-300">
            {ocrCert
              ? `${graderLabel} did not recognize the number we read. Confirm the cert below and fetch again.`
              : `Enter your ${graderLabel} cert number to load card details.`}
          </p>
          {ocrCert ? (
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-ash-500">
              {confidenceLabel(confidence, graderInput)}
              {ocrCert ? ` · detected ${ocrCert}` : ''}
            </p>
          ) : null}
          <div className="flex flex-col gap-3">
            <select
              value={graderInput}
              onChange={(event) => onGraderChange(event.target.value as OcrGradingCompany)}
              className="h-11 rounded border border-ink-700 bg-ink-800 px-4 text-sm text-ash-50 outline-none focus:border-brand-500"
            >
              {GRADER_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={certInput}
                onChange={(event) => onCertChange(event.target.value)}
                inputMode="numeric"
                placeholder={`${graderInput} cert number`}
                className="h-11 flex-1 rounded border border-ink-700 bg-ink-800 px-4 text-sm text-ash-50 placeholder:text-ash-500 outline-none focus:border-brand-500"
              />
              <button
                type="button"
                onClick={onLookup}
                disabled={lookupLoading}
                className="inline-flex h-11 items-center justify-center gap-2 rounded bg-brand-500 px-5 text-sm font-medium text-white hover:bg-brand-400 disabled:opacity-70"
              >
                {lookupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Look up cert
              </button>
            </div>
          </div>
          {lookupError ? <p className="text-sm text-rose-400">{lookupError}</p> : null}
          {certUrl && (error?.includes('daily limit') || lookupError.includes('daily limit')) ? (
            <a
              href={certUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium text-brand-500 hover:underline"
            >
              {getCertLinkLabel(graderInput)}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function SaveOverlay({
  purchasePrice,
  purchaseDate,
  purchaseSource,
  notes,
  saveLoading,
  saveError,
  onClose,
  onPurchasePriceChange,
  onPurchaseDateChange,
  onPurchaseSourceChange,
  onNotesChange,
  onSubmit,
}: {
  purchasePrice: string;
  purchaseDate: string;
  purchaseSource: string;
  notes: string;
  saveLoading: boolean;
  saveError: string;
  onClose: () => void;
  onPurchasePriceChange: (value: string) => void;
  onPurchaseDateChange: (value: string) => void;
  onPurchaseSourceChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="absolute inset-0 z-10 flex items-end justify-center bg-ink-950/70 p-4 sm:items-center">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md space-y-4 rounded bg-ink-900 p-6 "
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-ash-50">Save to collection</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-ash-500 hover:bg-ink-800 hover:text-ash-300"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <label className="block space-y-1">
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-ash-500">
            Purchase price ($)
          </span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={purchasePrice}
            onChange={(event) => onPurchasePriceChange(event.target.value)}
            placeholder="Optional"
            className="h-11 w-full rounded border border-ink-700 bg-ink-800 px-4 text-sm text-ash-50 placeholder:text-ash-500 outline-none focus:border-brand-500"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-ash-500">
            Date purchased
          </span>
          <input
            type="date"
            value={purchaseDate}
            onChange={(event) => onPurchaseDateChange(event.target.value)}
            className="h-11 w-full rounded border border-ink-700 bg-ink-800 px-4 text-sm text-ash-50 placeholder:text-ash-500 outline-none focus:border-brand-500"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-ash-500">
            Purchased from
          </span>
          <select
            value={purchaseSource}
            onChange={(event) => onPurchaseSourceChange(event.target.value)}
            className="h-11 w-full rounded border border-ink-700 bg-ink-800 px-4 text-sm text-ash-50 placeholder:text-ash-500 outline-none focus:border-brand-500"
          >
            <option value="">Optional</option>
            {PURCHASE_SOURCES.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-ash-500">Notes</span>
          <textarea
            value={notes}
            onChange={(event) => onNotesChange(event.target.value)}
            rows={3}
            placeholder="Optional"
            className="w-full rounded border border-ink-700 bg-ink-800 px-4 py-3 text-sm text-ash-50 placeholder:text-ash-500 outline-none focus:border-brand-500"
          />
        </label>
        {saveError ? <p className="text-sm text-rose-400">{saveError}</p> : null}
        <button
          type="submit"
          disabled={saveLoading}
          className="inline-flex w-full items-center justify-center gap-2 rounded bg-brand-500 px-5 py-3 text-sm font-medium text-white hover:bg-brand-400 disabled:opacity-70"
        >
          {saveLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </button>
      </form>
    </div>
  );
}
