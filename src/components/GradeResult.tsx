'use client';
/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import type { Route } from 'next';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { GradeProfitabilityTable } from '@/components/GradeProfitabilityTable';
import { PlayerAutocomplete } from '@/components/PlayerAutocomplete';
import { Button, Eyebrow, Rule } from '@/components/editorial';
import { SPORTS } from '@/lib/collection';
import { formatPrice } from '@/lib/collection-presenter';
import { readJsonResponse } from '@/lib/http-json';
import type { GradeProfitabilityPayload, PsaFeeTier } from '@/lib/grading-roi';
import type { GradeResult as GradeResultData, GradingCompanyPrediction } from '@/lib/grader';

type GradeResultProps = {
  result: GradeResultData;
  onReset: () => void;
};

function formatPsaGrade(g: number) { return `PSA ${Math.round(g)}`; }
function formatBgsGrade(g: number) { return `BGS ${g.toFixed(1)}`; }
function formatCgcGrade(g: number) {
  const r = Math.round(g * 2) / 2;
  return Number.isInteger(r) ? `CGC ${r}` : `CGC ${r.toFixed(1)}`;
}

const SUB_GRADES: { key: keyof Pick<GradeResultData, 'centering' | 'corners' | 'edges' | 'surface'>; label: string }[] = [
  { key: 'centering', label: 'Centering' },
  { key: 'corners',   label: 'Corners'   },
  { key: 'edges',     label: 'Edges'     },
  { key: 'surface',   label: 'Surface'   },
];

const COMPANIES: {
  key: GradingCompanyPrediction;
  label: string;
  format: (g: number) => string;
  value: (r: GradeResultData) => number;
}[] = [
  { key: 'PSA', label: 'PSA', format: formatPsaGrade, value: r => r.psaPrediction  },
  { key: 'BGS', label: 'BGS', format: formatBgsGrade, value: r => r.bgsPrediction  },
  { key: 'CGC', label: 'CGC', format: formatCgcGrade, value: r => r.cgcPrediction  },
];

function confidenceColor(c: GradeResultData['confidence']) {
  if (c === 'high')   return 'text-positive';
  if (c === 'medium') return 'text-warn';
  return 'text-negative';
}

function gradeCircleColor(g: number) {
  if (g >= 9.5) return 'border-gold   text-ink';
  if (g >= 9)   return 'border-positive text-ink';
  if (g >= 8)   return 'border-accent  text-ink';
  return 'border-rule text-ink-2';
}

export function GradeResult({ result, onReset }: GradeResultProps) {
  const collectionCompany = result.submissionCompany ?? 'PSA';
  const [player, setPlayer] = useState('');
  const [year, setYear] = useState('');
  const [sport, setSport] = useState('Baseball');
  const [setName, setSetName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [parallel, setParallel] = useState('');
  const [rawPrice, setRawPrice] = useState('');
  const [feeTier, setFeeTier] = useState<PsaFeeTier>('economy');
  const [roiPayload, setRoiPayload] = useState<GradeProfitabilityPayload | null>(null);
  const [roiLoading, setRoiLoading] = useState(false);
  const [roiError, setRoiError] = useState('');
  const thumbnails = [result.frontImageUrl, result.backImageUrl].filter((u): u is string => Boolean(u));

  const collectionHref = `/collection/add?grade=${result.psaPrediction}&company=${collectionCompany}&session=${result.sessionId}&player=${encodeURIComponent(
    player
  )}&year=${encodeURIComponent(year)}&sport=${encodeURIComponent(
    sport
  )}&setName=${encodeURIComponent(setName)}&cardNumber=${encodeURIComponent(
    cardNumber
  )}&parallel=${encodeURIComponent(parallel)}&purchasePrice=${encodeURIComponent(rawPrice)}`;

  async function handleCalculateProfitability() {
    const parsedRawPrice = Number.parseFloat(rawPrice);
    if (!player.trim() || !setName.trim() || !year.trim() || !sport.trim()) {
      setRoiError('Add player, year, sport, and set name to calculate profitability.');
      return;
    }
    if (!Number.isFinite(parsedRawPrice)) {
      setRoiError('Enter a raw price to calculate profitability.');
      return;
    }

    setRoiLoading(true);
    setRoiError('');
    try {
      const response = await fetch('/api/grader/roi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: result.sessionId,
          card: {
            player: player.trim(),
            year: Number.parseInt(year, 10),
            setName: setName.trim(),
            cardNumber: cardNumber.trim() || null,
            parallel: parallel.trim() || null,
            sport,
            manufacturer: null,
          },
          rawPrice: parsedRawPrice,
          feeTier,
        }),
      });

      const data = await readJsonResponse<GradeProfitabilityPayload & { error?: string }>(response);
      if (!response.ok) {
        throw new Error(data.error ?? 'Unable to calculate profitability.');
      }
      setRoiPayload(data);
    } catch (error) {
      setRoiPayload(null);
      setRoiError(
        error instanceof Error ? error.message : 'Unable to calculate profitability.'
      );
    } finally {
      setRoiLoading(false);
    }
  }

  return (
    <div className="rounded border border-rule bg-surface overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-rule px-6 py-4">
        <Eyebrow>AI grade estimate</Eyebrow>
        <button type="button" onClick={onReset}
          className="font-mono text-[11px] text-ink-3 hover:text-ink">
          Grade another →
        </button>
      </div>

      <div className="space-y-8 p-6">
        {/* Thumbnails */}
        {thumbnails.length > 0 && (
          <div className="flex gap-3">
            {thumbnails.map((url, i) => (
              <div key={i} className="h-20 w-14 overflow-hidden rounded border border-rule bg-paper">
                <img src={url} alt={i === 0 ? 'Front' : 'Back'} className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        )}

        {/* Hero: grade + sub-grades */}
        <div className="grid gap-6 sm:grid-cols-[auto_1fr] sm:items-start">
          {/* Grade circle */}
          <div className="flex flex-col items-center gap-3">
            <div className={`flex h-24 w-24 items-center justify-center rounded-full border-4 ${gradeCircleColor(result.overallGrade)}`}>
              <span className="font-serif italic text-[44px] leading-none">{result.overallGrade.toFixed(1)}</span>
            </div>
            <span className={`font-mono text-[10px] tracking-[0.12em] ${confidenceColor(result.confidence)}`}>
              {result.confidence.toUpperCase()} CONFIDENCE
            </span>
          </div>

          {/* Sub-grades */}
          <div className="space-y-3">
            {result.confidence === 'low' && (
              <div className="rounded border border-warn/30 bg-warn/5 px-3 py-2">
                <p className="font-mono text-[11px] text-warn">Low confidence — retake surface or corner photos for a better estimate.</p>
              </div>
            )}
            {SUB_GRADES.map(({ key, label }) => {
              const score = result[key];
              const pct = Math.min(Math.max((score / 10) * 100, 0), 100);
              return (
                <div key={key} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] tracking-[0.14em] text-ink-3 uppercase">{label}</span>
                    <span className="font-serif italic text-[18px] leading-none text-ink">{score.toFixed(1)}</span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-rule">
                    <div className="h-full rounded-full bg-ink-2" style={{ width: `${pct}%`, transition: 'width 400ms ease-out' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <Rule />

        {/* Company predictions */}
        <div>
          <Eyebrow className="mb-3">Predicted grades</Eyebrow>
          <div className="grid gap-2 sm:grid-cols-3">
            {COMPANIES.map(({ key, label, format, value }) => {
              const isRec = result.submissionCompany === key;
              return (
                <div key={key} className={`rounded border px-4 py-4 text-center ${isRec ? 'border-accent/40 bg-accent/5' : 'border-rule bg-surface-2'}`}>
                  {isRec && <Eyebrow tone="accent" className="mb-0.5">Recommended</Eyebrow>}
                  <Eyebrow tone={isRec ? 'accent' : 'default'} className="mb-1">{label}</Eyebrow>
                  <p className="font-serif italic text-[28px] leading-none text-ink">{format(value(result))}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Condition notes */}
        {result.conditionNotes && (
          <>
            <Rule />
            <div>
              <Eyebrow className="mb-2">Condition notes</Eyebrow>
              <p className="font-serif italic text-[16px] leading-7 text-ink-2">{result.conditionNotes}</p>
            </div>
          </>
        )}

        {/* Submission ROI */}
        <Rule />
        <div className={`rounded border px-5 py-4 ${result.submissionRecommended ? 'border-positive/30 bg-positive/5' : 'border-rule bg-surface-2'}`}>
          <Eyebrow tone={result.submissionRecommended ? 'positive' : 'default'} className="mb-2">
            {result.submissionRecommended ? 'Submit recommended' : 'Skip submission'}
          </Eyebrow>
          {result.submissionRoiNotes && (
            <p className="text-[13px] leading-6 text-ink-2">{result.submissionRoiNotes}</p>
          )}
          <p className="mt-2 font-mono text-[10px] text-ink-3">PSA Economy ~$25 · BGS ~$30 · CGC ~$20</p>
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href={collectionHref as Route}
            className="inline-flex h-10 flex-1 items-center justify-center rounded-md bg-ink px-5 text-[13px] font-medium text-paper hover:bg-ink/90">
            Add to collection with grade
          </Link>
          <button type="button" onClick={onReset}
            className="inline-flex h-10 flex-1 items-center justify-center rounded border border-rule px-5 text-[13px] font-medium text-ink hover:bg-surface-2">
            Grade another
          </button>
        </div>

        <Rule />
        <div className="space-y-4">
          <div>
            <Eyebrow className="mb-2">Grade profitability</Eyebrow>
            <p className="font-serif italic text-[24px] leading-none text-ink">
              See how much you could make submitting this card for a PSA grade.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <PlayerAutocomplete
                value={player}
                onChange={setPlayer}
                onSelectCard={(card) => {
                  if (card.year) setYear(String(card.year));
                  if (card.set_name) setSetName(card.set_name);
                }}
                required
              />
            </div>

            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                Year
              </span>
              <input
                type="number"
                min={1900}
                max={2030}
                value={year}
                onChange={(event) => setYear(event.target.value)}
                className="mt-2 h-11 w-full rounded border border-rule bg-surface-2 px-4 text-sm text-ink outline-none focus:border-ink"
              />
            </label>

            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                Sport
              </span>
              <select
                value={sport}
                onChange={(event) => setSport(event.target.value)}
                className="mt-2 h-11 w-full rounded border border-rule bg-surface-2 px-4 text-sm text-ink outline-none focus:border-ink"
              >
                {SPORTS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="block sm:col-span-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                Set name
              </span>
              <input
                type="text"
                value={setName}
                onChange={(event) => setSetName(event.target.value)}
                className="mt-2 h-11 w-full rounded border border-rule bg-surface-2 px-4 text-sm text-ink outline-none focus:border-ink"
              />
            </label>

            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                Card number
              </span>
              <input
                type="text"
                value={cardNumber}
                onChange={(event) => setCardNumber(event.target.value)}
                className="mt-2 h-11 w-full rounded border border-rule bg-surface-2 px-4 text-sm text-ink outline-none focus:border-ink"
              />
            </label>

            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                Parallel
              </span>
              <input
                type="text"
                value={parallel}
                onChange={(event) => setParallel(event.target.value)}
                className="mt-2 h-11 w-full rounded border border-rule bg-surface-2 px-4 text-sm text-ink outline-none focus:border-ink"
              />
            </label>

            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                Raw price
              </span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={rawPrice}
                onChange={(event) => setRawPrice(event.target.value)}
                className="mt-2 h-11 w-full rounded border border-rule bg-surface-2 px-4 text-sm text-ink outline-none focus:border-ink"
              />
            </label>

            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                PSA fee tier
              </span>
              <select
                value={feeTier}
                onChange={(event) => setFeeTier(event.target.value as PsaFeeTier)}
                className="mt-2 h-11 w-full rounded border border-rule bg-surface-2 px-4 text-sm text-ink outline-none focus:border-ink"
              >
                <option value="economy">PSA Economy · {formatPrice(20)}</option>
                <option value="value">PSA Value · {formatPrice(50)}</option>
                <option value="regular">PSA Regular · {formatPrice(100)}</option>
              </select>
            </label>
          </div>

          <Button type="button" onClick={handleCalculateProfitability} disabled={roiLoading}>
            {roiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Calculate grading profit
          </Button>

          {roiError ? <p className="font-mono text-[11px] text-negative">{roiError}</p> : null}
          {roiPayload ? <GradeProfitabilityTable payload={roiPayload} /> : null}
        </div>

        {/* Disclaimer */}
        <p className="font-mono text-[10px] text-ink-3">
          AI estimate only — not a professional grade.
        </p>
      </div>
    </div>
  );
}
