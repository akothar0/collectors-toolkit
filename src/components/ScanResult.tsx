'use client';
/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import type { Route } from 'next';
import { BadgeCheck, ExternalLink, Loader2, Save, Search, X } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { MarketPricingPanel } from '@/components/pricing/MarketPricingPanel';
import { CardInsight } from '@/components/CardInsight';
import { Eyebrow, Rule } from '@/components/editorial';
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
  if (scan.ocrGradingCompany && scan.ocrGradingCompany !== 'UNKNOWN') return scan.ocrGradingCompany;
  if (scan.gradingCompany === 'PSA' || scan.gradingCompany === 'BGS' || scan.gradingCompany === 'SGC' || scan.gradingCompany === 'CGC') return scan.gradingCompany;
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
  const certUrl = useMemo(() => getCertUrl(result.gradingCompany, result.certNumber), [result.gradingCompany, result.certNumber]);
  const hasImage = Boolean(result.imageUrl?.trim());
  const alreadySaved = Boolean(result.savedToCollection || result.collectionCardId);

  async function lookupCert() {
    if (!certInput.trim()) { setLookupError('Enter your cert number.'); return; }
    setLookupLoading(true);
    setLookupError('');
    try {
      const formData = new FormData();
      formData.set('manualCertNumber', certInput.trim());
      formData.set('manualGradingCompany', graderInput);
      if (result.imageUrl) formData.set('imageUrl', result.imageUrl);
      const r = await fetch('/api/scanner/scan', { method: 'POST', body: formData });
      const next = await readJsonResponse<ScannerResult & { remainingScans?: number }>(r);
      if (!r.ok) throw new Error(next.error ?? 'Cert lookup failed.');
      setResult(next);
      if (typeof next.remainingScans === 'number') onQuotaUpdate?.(next.remainingScans);
    } catch (error) {
      setLookupError(error instanceof Error ? error.message : 'Cert lookup failed.');
    } finally {
      setLookupLoading(false);
    }
  }

  async function saveToCollection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!result.certLookupSuccess || alreadySaved) return;
    setSaveLoading(true);
    setSaveError('');
    setSaveSuccess('');
    try {
      const r = await fetch('/api/collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scanId: result.scanId, imageUrl: result.imageUrl, cardId: result.cardId,
          player: result.cardPlayer, year: result.cardYear,
          setName: result.cardSet ?? result.cardManufacturer, parallel: result.cardParallel,
          cardNumber: result.cardNumber, sport: result.cardSport, manufacturer: result.cardManufacturer,
          certNumber: result.certNumber, gradingCompany: result.gradingCompany,
          grade: result.officialGrade, gradeDescription: result.gradeDescription,
          qualifierCode: result.qualifierCode, autographGrade: result.autographGrade,
          subGrades: result.subGrades, popAtGrade: result.popAtGrade, popHigher: result.popHigher,
          conditionType: 'graded',
          purchasePrice: purchasePrice.trim() ? Number.parseFloat(purchasePrice) : null,
          purchaseDate: purchaseDate.trim() || null,
          purchaseSource: purchaseSource.trim() || null,
          notes: notes.trim() || null,
        }),
      });
      const json = await readJsonResponse<{ error?: string; collectionCardId?: string; alreadySaved?: boolean }>(r);
      if (!r.ok) throw new Error(json.error ?? 'Unable to save.');
      setResult({ ...result, savedToCollection: true, collectionCardId: json.collectionCardId ?? result.collectionCardId });
      setSaveSuccess('Saved to your collection.');
      setSaveOverlayOpen(false);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Unable to save.');
    } finally {
      setSaveLoading(false);
    }
  }

  return (
    <div className="relative overflow-hidden rounded border border-rule bg-surface">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule px-6 py-4">
        <div>
          <Eyebrow>Scan result</Eyebrow>
          <p className="mt-1 text-[13px] text-ink-2">
            {result.certLookupSuccess
              ? getVerificationHeadline(result)
              : `Confirm your ${getGraderLabel(result.gradingCompany ?? result.ocrGradingCompany)} cert number`}
          </p>
        </div>
        {onTryAgain && (
          <button type="button" onClick={onTryAgain}
            className="font-mono text-[11px] text-ink-3 hover:text-ink">
            Scan another →
          </button>
        )}
      </div>

      {/* Main grid */}
      <div className="grid gap-0 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        {/* Left — image */}
        <div className="border-b border-rule bg-paper p-4 lg:border-b-0 lg:border-r">
          {hasImage ? (
            <img src={result.imageUrl} alt="Scanned slab"
              className="h-[260px] w-full rounded object-cover lg:h-full lg:min-h-[340px]" />
          ) : (
            <div className="flex h-[260px] items-center justify-center rounded border border-rule text-[13px] text-ink-3">
              No slab photo
            </div>
          )}
        </div>

        {/* Right — result details */}
        <div className="space-y-5 p-6">
          {result.certLookupSuccess && title ? (
            <VerifiedSummary scan={result} title={title} subtitle={subtitle}
              grade={result.officialGrade} gradeDescription={result.gradeDescription}
              certNumber={result.certNumber} certUrl={certUrl} />
          ) : (
            <PendingSummary
              certInput={certInput} graderInput={graderInput}
              confidence={result.ocrConfidence} gradingCompany={result.gradingCompany ?? result.ocrGradingCompany}
              error={result.error} lookupError={lookupError} lookupLoading={lookupLoading}
              ocrCert={result.ocrCertNumber}
              certUrl={getCertUrl(graderInput, certInput || result.ocrCertNumber)}
              showCertPrompt={showCertPrompt} readOnly={readOnly}
              onCertChange={setCertInput} onGraderChange={setGraderInput} onLookup={lookupCert}
            />
          )}

          {result.certLookupSuccess && result.cardPlayer && (
            <CardInsight
              player={result.cardPlayer}
              year={result.cardYear ?? null}
              setName={result.cardSet ?? null}
              cardNumber={result.cardNumber ?? null}
              parallel={result.cardParallel ?? null}
              gradingCompany={result.gradingCompany ?? null}
              officialGrade={result.officialGrade ?? null}
              gradeDescription={result.gradeDescription ?? null}
              popAtGrade={result.popAtGrade ?? null}
              popHigher={result.popHigher ?? null}
              cardId={result.cardId ?? null}
            />
          )}

          {result.collectionCardId && (
            <MarketPricingPanel collectionCardId={result.collectionCardId} compact />
          )}

          {alreadySaved && !readOnly && (
            <div className="border-t border-rule pt-4">
              <p className="text-[13px] font-medium text-positive">In your collection.</p>
              <Link href="/collection" className="font-mono text-[11px] text-accent hover:underline">View →</Link>
            </div>
          )}
          {saveSuccess && !readOnly && !alreadySaved && (
            <p className="border-t border-rule pt-4 text-[13px] text-positive">
              Saved.{' '}
              <Link href="/collection" className="font-mono text-[11px] text-accent hover:underline">View in collection →</Link>
            </p>
          )}
        </div>
      </div>

      {/* Footer actions */}
      {!readOnly && (
        <div className="flex flex-col gap-3 border-t border-rule p-5 sm:flex-row sm:items-center">
          <Link href={collectionAddHref as Route}
            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md bg-ink px-5 text-[13px] font-medium text-paper hover:bg-ink/90">
            Add to collection
          </Link>
          <div className="flex items-center gap-4">
            {!alreadySaved && (
              <button type="button" onClick={() => setSaveOverlayOpen(true)}
                className="font-mono text-[11px] text-ink-3 hover:text-ink">
                save with notes →
              </button>
            )}
            {onTryAgain && (
              <button type="button" onClick={onTryAgain}
                className="font-mono text-[11px] text-ink-3 hover:text-ink">
                scan another →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Save overlay */}
      {saveOverlayOpen && (
        <div className="absolute inset-0 z-10 flex items-end justify-center bg-ink/40 p-4 sm:items-center">
          <form onSubmit={saveToCollection}
            className="w-full max-w-md space-y-4 rounded border border-rule bg-surface p-6 shadow-popover">
            <div className="flex items-center justify-between">
              <h3 className="font-serif italic text-[20px] text-ink">Save to collection</h3>
              <button type="button" onClick={() => setSaveOverlayOpen(false)}
                className="rounded p-1 text-ink-3 hover:bg-surface-2 hover:text-ink" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            {[
              { label: 'Purchase price ($)', type: 'number', value: purchasePrice, onChange: setPurchasePrice, placeholder: 'Optional', inputMode: 'decimal' as const },
              { label: 'Date purchased', type: 'date', value: purchaseDate, onChange: setPurchaseDate, placeholder: '' },
            ].map(f => (
              <label key={f.label} className="block space-y-1">
                <Eyebrow>{f.label}</Eyebrow>
                <input type={f.type} value={f.value} onChange={e => f.onChange(e.target.value)}
                  placeholder={f.placeholder}
                  className="h-10 w-full rounded border border-rule bg-surface-2 px-3 text-[13px] text-ink placeholder:text-ink-3 outline-none focus:border-ink" />
              </label>
            ))}
            <label className="block space-y-1">
              <Eyebrow>Purchased from</Eyebrow>
              <select value={purchaseSource} onChange={e => setPurchaseSource(e.target.value)}
                className="h-10 w-full rounded border border-rule bg-surface-2 px-3 text-[13px] text-ink outline-none focus:border-ink">
                <option value="">Optional</option>
                {PURCHASE_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="block space-y-1">
              <Eyebrow>Notes</Eyebrow>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                placeholder="Optional"
                className="w-full rounded border border-rule bg-surface-2 px-3 py-2.5 text-[13px] text-ink placeholder:text-ink-3 outline-none focus:border-ink" />
            </label>
            {saveError && <p className="font-mono text-[11px] text-negative">{saveError}</p>}
            <button type="submit" disabled={saveLoading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-ink px-5 py-2.5 text-[13px] font-medium text-paper hover:bg-ink/90 disabled:opacity-50">
              {saveLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

// ── Verified summary (cert lookup succeeded) ──────────────────────────────

function VerifiedSummary({ scan, title, subtitle, grade, gradeDescription, certNumber, certUrl }: {
  scan: ScannerResult; title: string; subtitle: string | null;
  grade: number | null; gradeDescription: string | null;
  certNumber: string | null; certUrl: string | null;
}) {
  const subGradesLabel = formatSubGradesLabel(scan.subGrades);

  return (
    <div className="space-y-4">
      {/* Verification badge */}
      <div className="flex gap-3 rounded border border-positive/30 bg-positive/5 px-4 py-3" role="status">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-positive text-white">
          <BadgeCheck className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0 space-y-0.5">
          <p className="text-[13px] font-medium text-positive">{getVerificationHeadline(scan)}</p>
          <p className="text-[12px] text-positive/70">{getVerificationDetail(scan)}</p>
        </div>
      </div>

      {/* Player + grade */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-serif italic text-[28px] leading-tight text-ink">{title}</h2>
          {subtitle && <p className="mt-0.5 font-mono text-[11px] text-ink-3">{subtitle}</p>}
        </div>
        <div className="shrink-0 rounded border border-accent/30 bg-accent/5 px-4 py-3 text-right">
          <Eyebrow tone="accent">{getGraderLabel(scan.gradingCompany)}</Eyebrow>
          <p className="mt-1 font-serif italic text-[32px] leading-none text-ink">{formatGradeValue(grade)}</p>
        </div>
      </div>

      {gradeDescription && (
        <p className="text-[13px] text-ink-2">{formatCatalogText(gradeDescription)}</p>
      )}
      {subGradesLabel && (
        <p className="font-mono text-[11px] text-ink-3">Sub-grades: {subGradesLabel}</p>
      )}

      {/* Pop stats */}
      <VerifiedStats scan={scan} />

      {/* Cert */}
      <div className="rounded border border-rule bg-surface-2 px-4 py-3">
        <Eyebrow className="mb-1">{getCertRegistryLabel(scan.gradingCompany)}</Eyebrow>
        <div className="flex items-center gap-3">
          <p className="font-mono text-[18px] font-semibold text-ink">{certNumber}</p>
          {certUrl && (
            <a href={certUrl} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 font-mono text-[11px] text-accent hover:underline">
              {getCertLinkLabel(scan.gradingCompany)} <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function VerifiedStats({ scan }: { scan: ScannerResult }) {
  const category = getVerifiedCategoryLabel(scan);
  const autographLabel = formatAutographGradeLabel(scan.autographGrade);
  const showPop = hasRegistryPopulationStats(scan);
  const popAtGrade = formatPopCount(scan.popAtGrade);
  const popHigher = formatPopCount(scan.popHigher);
  const popWithQualifier = formatPopCount(scan.popWithQualifier);
  const showPopQ = scan.gradingCompany === 'PSA' && (scan.popWithQualifier ?? 0) > 0 && popWithQualifier !== null;

  if (!category && !showPop && !autographLabel) return null;

  return (
    <div className="space-y-3">
      {category && <Eyebrow>{category}</Eyebrow>}
      {showPop && (
        <div className={`grid gap-2 ${showPopQ ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {popAtGrade != null && <PopCell label={scan.gradingCompany === 'PSA' ? 'PSA pop' : scan.gradingCompany === 'BGS' ? 'BGS pop' : 'Pop at grade'} value={popAtGrade} />}
          {popHigher != null && <PopCell label="Pop higher" value={popHigher} />}
          {showPopQ && <PopCell label="Pop w/ qualifier" value={popWithQualifier!} />}
        </div>
      )}
      {autographLabel && <p className="font-mono text-[11px] text-ink-2">{autographLabel}</p>}
    </div>
  );
}

function PopCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-rule bg-surface-2 px-3 py-2.5">
      <Eyebrow className="mb-1">{label}</Eyebrow>
      <p className="font-serif italic text-[28px] leading-none text-ink">{value}</p>
    </div>
  );
}

// ── Pending summary (cert lookup failed / manual mode) ────────────────────

function PendingSummary({ certInput, graderInput, confidence, gradingCompany, error, lookupError,
  lookupLoading, ocrCert, certUrl, showCertPrompt, readOnly,
  onCertChange, onGraderChange, onLookup }: {
  certInput: string; graderInput: OcrGradingCompany; confidence: ScannerResult['ocrConfidence'];
  gradingCompany: string | null; error?: string; lookupError: string; lookupLoading: boolean;
  ocrCert: string | null; certUrl: string | null; showCertPrompt: boolean; readOnly?: boolean;
  onCertChange: (v: string) => void; onGraderChange: (v: OcrGradingCompany) => void; onLookup: () => void;
}) {
  const graderLabel = getGraderLabel(gradingCompany ?? graderInput);
  return (
    <div className="space-y-4">
      {error && (
        <p className={`text-[13px] ${error.includes('daily limit') ? 'text-negative' : 'text-warn'}`}>{error}</p>
      )}
      {showCertPrompt && !readOnly && (
        <>
          <p className="text-[13px] text-ink-2">
            {ocrCert
              ? `${graderLabel} did not recognise the number we read. Confirm the cert below and try again.`
              : `Enter your ${graderLabel} cert number to load card details.`}
          </p>
          {ocrCert && (
            <p className="font-mono text-[11px] text-ink-3">
              {confidenceLabel(confidence, graderInput)}{ocrCert ? ` · detected ${ocrCert}` : ''}
            </p>
          )}
          <div className="space-y-2">
            <select value={graderInput} onChange={e => onGraderChange(e.target.value as OcrGradingCompany)}
              className="h-10 w-full rounded border border-rule bg-surface-2 px-3 text-[13px] text-ink outline-none focus:border-ink">
              {GRADER_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <div className="flex gap-2">
              <input value={certInput} onChange={e => onCertChange(e.target.value)}
                inputMode="numeric" placeholder={`${graderInput} cert number`}
                className="h-10 flex-1 rounded border border-rule bg-surface-2 px-3 text-[13px] text-ink placeholder:text-ink-3 outline-none focus:border-ink" />
              <button type="button" onClick={onLookup} disabled={lookupLoading}
                className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-4 text-[13px] font-medium text-paper hover:bg-ink/90 disabled:opacity-50">
                {lookupLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                Look up
              </button>
            </div>
          </div>
          {lookupError && <p className="font-mono text-[11px] text-negative">{lookupError}</p>}
          {certUrl && (error?.includes('daily limit') || lookupError.includes('daily limit')) && (
            <a href={certUrl} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 font-mono text-[11px] text-accent hover:underline">
              {getCertLinkLabel(graderInput)} <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </>
      )}
    </div>
  );
}
