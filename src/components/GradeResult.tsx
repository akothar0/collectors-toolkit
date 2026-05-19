'use client';
/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import type { Route } from 'next';
import type { GradeResult as GradeResultData, GradingCompanyPrediction } from '@/lib/grader';

type GradeResultProps = {
  result: GradeResultData;
  onReset: () => void;
};

function gradeColorClass(grade: number) {
  if (grade >= 9.5) return 'text-amber-400 border-amber-700 bg-amber-950';
  if (grade >= 9) return 'text-emerald-400 border-emerald-700 bg-emerald-950';
  if (grade >= 8) return 'text-brand-400 border-brand-700 bg-brand-900/30';
  if (grade >= 7) return 'text-ash-300 border-ink-600 bg-ink-800';
  return 'text-ash-400 border-ink-700 bg-ink-900';
}

function barColorClass(grade: number) {
  if (grade >= 9.5) return 'bg-amber-500';
  if (grade >= 9) return 'bg-emerald-500';
  if (grade >= 8) return 'bg-brand-500';
  if (grade >= 7) return 'bg-ash-400';
  return 'bg-ash-500';
}

function confidenceLabel(confidence: GradeResultData['confidence']) {
  if (confidence === 'high') return 'High confidence';
  if (confidence === 'medium') return 'Medium confidence';
  return 'Low confidence';
}

function formatPsaGrade(grade: number) {
  return `PSA ${Math.round(grade)}`;
}

function formatBgsGrade(grade: number) {
  return `BGS ${grade.toFixed(1)}`;
}

function formatCgcGrade(grade: number) {
  const rounded = Math.round(grade * 2) / 2;
  return Number.isInteger(rounded) ? `CGC ${rounded}` : `CGC ${rounded.toFixed(1)}`;
}

const SUB_GRADES: { key: keyof Pick<GradeResultData, 'centering' | 'corners' | 'edges' | 'surface'>; label: string }[] = [
  { key: 'centering', label: 'Centering' },
  { key: 'corners', label: 'Corners' },
  { key: 'edges', label: 'Edges' },
  { key: 'surface', label: 'Surface' },
];

const COMPANIES: {
  key: GradingCompanyPrediction;
  label: string;
  format: (g: number) => string;
  value: (r: GradeResultData) => number;
}[] = [
  { key: 'PSA', label: 'PSA', format: formatPsaGrade, value: (r) => r.psaPrediction },
  { key: 'BGS', label: 'BGS', format: formatBgsGrade, value: (r) => r.bgsPrediction },
  { key: 'CGC', label: 'CGC', format: formatCgcGrade, value: (r) => r.cgcPrediction },
];

export function GradeResult({ result, onReset }: GradeResultProps) {
  const badgeColors = gradeColorClass(result.overallGrade);
  const collectionCompany = result.submissionCompany ?? 'PSA';
  const collectionHref = `/collection/add?grade=${result.psaPrediction}&company=${collectionCompany}&session=${result.sessionId}`;

  const thumbnails = [
    result.frontImageUrl,
    ...(result.backImageUrl ? [result.backImageUrl] : []),
  ].filter((url): url is string => Boolean(url));

  return (
    <section className="overflow-hidden rounded border border-ink-700 bg-ink-900">
      <div className="flex items-center justify-between border-b border-ink-700 px-6 py-4 md:px-8">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-ash-500">AI Grade Estimate</p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="text-sm font-medium text-brand-500 hover:text-brand-400 hover:underline underline-offset-4"
        >
          Grade another →
        </button>
      </div>

      <div className="space-y-8 p-6 md:p-8">
        {thumbnails.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {thumbnails.map((url, index) => (
              <div
                key={`${url}-${index}`}
                className="h-20 w-14 overflow-hidden rounded border border-ink-700 bg-ink-800"
              >
                <img src={url} alt={index === 0 ? 'Front' : 'Back'} className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        ) : null}

        {/* Hero: grade circle */}
        <div className="flex flex-col items-center py-6">
          <div
            className={`flex h-36 w-36 items-center justify-center rounded-full border-4 tabular-nums text-6xl font-bold tracking-tight ${badgeColors}`}
          >
            {result.overallGrade.toFixed(1)}
          </div>
          <p className="mt-4 text-sm text-ash-400">
            {confidenceLabel(result.confidence)}
            {result.confidence === 'low' ? ' — low photo quality' : ''}
          </p>
        </div>

        {result.confidence === 'low' ? (
          <div className="rounded border border-amber-800 bg-amber-950 p-4 text-sm text-amber-400">
            <p className="font-medium">Low accuracy</p>
            <p className="mt-1 leading-6 text-amber-500">
              Retake with the card flat, perpendicular to the camera, even lighting, and all four corners visible.
            </p>
          </div>
        ) : null}

        <div className="space-y-4">
          {SUB_GRADES.map(({ key, label }) => {
            const score = result[key];
            const pct = Math.min(Math.max((score / 10) * 100, 0), 100);
            return (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ash-300">{label}</span>
                  <span className="tabular-nums font-semibold text-ash-100">{score.toFixed(1)}/10</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-ink-700">
                  <div
                    className={`h-full rounded-full ${barColorClass(score)}`}
                    style={{ width: `${pct}%`, transition: 'width 400ms ease-out' }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {COMPANIES.map(({ key, label, format, value }) => {
            const isRecommended = result.submissionCompany === key;
            return (
              <div
                key={key}
                className={`rounded border p-4 text-center ${
                  isRecommended
                    ? 'border-brand-500/40 bg-brand-900/20'
                    : 'border-ink-700 bg-ink-800'
                }`}
              >
                {isRecommended ? (
                  <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-brand-500">
                    Recommended
                  </p>
                ) : null}
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-ash-500">{label}</p>
                <p className="mt-2 tabular-nums text-2xl font-semibold tracking-tight text-ash-50">{format(value(result))}</p>
              </div>
            );
          })}
        </div>

        {result.conditionNotes ? (
          <div className="rounded border border-ink-700 bg-ink-800 p-5">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-ash-500">Condition notes</p>
            <p className="mt-3 text-sm leading-7 text-ash-300">{result.conditionNotes}</p>
          </div>
        ) : null}

        <div
          className={`rounded border p-5 ${
            result.submissionRecommended
              ? 'border-emerald-800 bg-emerald-950'
              : 'border-ink-700 bg-ink-800'
          }`}
        >
          <p
            className={`text-xs font-medium uppercase tracking-[0.18em] ${
              result.submissionRecommended ? 'text-emerald-400' : 'text-ash-500'
            }`}
          >
            {result.submissionRecommended ? 'Submit recommended' : 'Skip submission'}
          </p>
          {result.submissionRoiNotes ? (
            <p className="mt-3 text-sm leading-7 text-ash-300">{result.submissionRoiNotes}</p>
          ) : null}
          <p className="mt-3 text-xs text-ash-500">PSA Economy ~$25 · BGS ~$30 · CGC ~$20</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href={collectionHref as Route}
            className="inline-flex h-11 flex-1 items-center justify-center rounded bg-brand-500 px-6 text-sm font-semibold text-white hover:bg-brand-400"
          >
            Add to Collection
          </Link>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex h-11 flex-1 items-center justify-center rounded border border-ink-600 px-6 text-sm font-medium text-ash-300 hover:border-ink-500 hover:text-ash-50"
          >
            Grade another
          </button>
        </div>
      </div>
    </section>
  );
}
