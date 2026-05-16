'use client';
/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import type { Route } from 'next';
import { RotateCcw } from 'lucide-react';
import type { GradeResult as GradeResultData, GradingCompanyPrediction } from '@/lib/grader';

type GradeResultProps = {
  result: GradeResultData;
  onReset: () => void;
};

function gradeColorClass(grade: number) {
  if (grade >= 9.5) return 'text-amber-600 bg-amber-50 border-amber-200';
  if (grade >= 9) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
  if (grade >= 8) return 'text-blue-600 bg-blue-50 border-blue-200';
  if (grade >= 7) return 'text-slate-600 bg-slate-100 border-slate-200';
  return 'text-slate-500 bg-slate-50 border-slate-200';
}

function barColorClass(grade: number) {
  if (grade >= 9.5) return 'bg-amber-500';
  if (grade >= 9) return 'bg-emerald-500';
  if (grade >= 8) return 'bg-blue-500';
  if (grade >= 7) return 'bg-slate-500';
  return 'bg-slate-400';
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
  ].filter(Boolean);

  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-soft">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 md:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-600">Grade result</p>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-slate-950">
            AI grade estimate
          </h2>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          <RotateCcw className="h-4 w-4" />
          Reset
        </button>
      </div>

      <div className="space-y-8 p-6 md:p-8">
        {thumbnails.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {thumbnails.map((url, index) => (
              <div
                key={`${url}-${index}`}
                className="h-20 w-14 overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
              >
                <img src={url} alt={index === 0 ? 'Front' : 'Back'} className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        ) : null}

        <div className="flex flex-col items-center py-4">
          <div
            className={`flex h-32 w-32 items-center justify-center rounded-full border-4 text-5xl font-semibold tracking-tight ${badgeColors}`}
          >
            {result.overallGrade.toFixed(1)}
          </div>
          <p className="mt-4 text-sm font-medium text-slate-600">
            {confidenceLabel(result.confidence)}
            {result.confidence === 'low' ? ' ⚠️' : ''}
          </p>
        </div>

        {result.confidence === 'low' ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900">
            <p className="font-semibold">Photo quality may limit accuracy</p>
            <p className="mt-1">
              Retake with the card flat, perpendicular to the camera, even lighting, and all four corners visible.
              Add a back photo and raking-light surface close-up for better results.
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
                  <span className="font-medium text-slate-700">{label}</span>
                  <span className="font-semibold text-slate-950">{score.toFixed(1)}/10</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all ${barColorClass(score)}`}
                    style={{ width: `${pct}%` }}
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
                className={`rounded-2xl border p-4 text-center ${
                  isRecommended
                    ? 'border-brand-400 bg-brand-50 shadow-sm ring-2 ring-brand-200'
                    : 'border-slate-200 bg-slate-50'
                }`}
              >
                {isRecommended ? (
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">
                    Recommended
                  </p>
                ) : null}
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{format(value(result))}</p>
              </div>
            );
          })}
        </div>

        {result.conditionNotes ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Condition notes</p>
            <p className="mt-3 text-sm leading-7 text-slate-700">{result.conditionNotes}</p>
          </div>
        ) : null}

        <div
          className={`rounded-2xl border p-5 ${
            result.submissionRecommended
              ? 'border-emerald-200 bg-emerald-50'
              : 'border-slate-200 bg-slate-50'
          }`}
        >
          <p
            className={`text-xs font-semibold uppercase tracking-[0.18em] ${
              result.submissionRecommended ? 'text-emerald-700' : 'text-slate-500'
            }`}
          >
            {result.submissionRecommended ? 'Submission recommended' : 'Submission not recommended'}
          </p>
          {result.submissionRoiNotes ? (
            <p className="mt-3 text-sm leading-7 text-slate-700">{result.submissionRoiNotes}</p>
          ) : null}
          <p className="mt-3 text-xs text-slate-500">PSA Economy ~$25 · BGS ~$30 · CGC ~$20</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href={collectionHref as Route}
            className="inline-flex flex-1 items-center justify-center rounded-full bg-brand-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-700"
          >
            Add to Collection
          </Link>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            <RotateCcw className="h-4 w-4" />
            Grade Another Card
          </button>
        </div>
      </div>
    </section>
  );
}
