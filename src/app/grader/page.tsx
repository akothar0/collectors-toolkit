'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { Check, Gauge, History, Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { GradeResult } from '@/components/GradeResult';
import { ImageUpload } from '@/components/ImageUpload';
import { readJsonResponse } from '@/lib/http-json';
import type { GradeResult as GradeResultData } from '@/lib/grader';

const loadingSteps = [
  'Examining centering…',
  'Checking corners and edges…',
  'Assessing surface…',
  'Calculating predictions…',
];

type PhotoStep = {
  id: string;
  title: string;
  instruction: string;
  required?: boolean;
};

const photoSteps: PhotoStep[] = [
  {
    id: 'front',
    title: 'Front',
    instruction: 'Flat · All 4 corners · Good light',
    required: true,
  },
  {
    id: 'back',
    title: 'Back',
    instruction: 'Helps assess surface and centering',
  },
  {
    id: 'surface',
    title: 'Surface',
    instruction: 'Raking light — reveals scratches invisible head-on',
  },
  {
    id: 'corner',
    title: 'Corner',
    instruction: 'Any corner near the grade boundary',
  },
];

export default function GraderPage() {
  const [frontImage, setFrontImage] = useState<File | null>(null);
  const [backImage, setBackImage] = useState<File | null>(null);
  const [surfaceImage, setSurfaceImage] = useState<File | null>(null);
  const [cornerImage, setCornerImage] = useState<File | null>(null);
  const [gradeResult, setGradeResult] = useState<GradeResultData | null>(null);
  const [isGrading, setIsGrading] = useState(false);
  const [gradeError, setGradeError] = useState('');
  const [remainingGrades, setRemainingGrades] = useState<number | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [uploadKeys, setUploadKeys] = useState<Record<string, number>>({
    front: 0, back: 0, surface: 0, corner: 0,
  });

  useEffect(() => {
    let cancelled = false;

    async function loadQuota() {
      try {
        const response = await fetch('/api/grader/quota');
        if (!response.ok) return;
        const data = (await response.json()) as { remainingGrades?: number };
        if (!cancelled && typeof data.remainingGrades === 'number') {
          setRemainingGrades(data.remainingGrades);
        }
      } catch {
        // Keep optimistic default if quota endpoint is unavailable.
      }
    }

    void loadQuota();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!isGrading) return;
    setLoadingStep(0);
    const t1 = window.setTimeout(() => setLoadingStep(1), 2000);
    const t2 = window.setTimeout(() => setLoadingStep(2), 4500);
    const t3 = window.setTimeout(() => setLoadingStep(3), 7000);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [isGrading]);

  const remainingLabel = useMemo(() => {
    if (remainingGrades === null) return null;
    return `${remainingGrades} grade${remainingGrades === 1 ? '' : 's'} left today`;
  }, [remainingGrades]);

  function resetGrader() {
    setFrontImage(null);
    setBackImage(null);
    setSurfaceImage(null);
    setCornerImage(null);
    setGradeResult(null);
    setGradeError('');
    setIsGrading(false);
    setLoadingStep(0);
    setUploadKeys((current) => ({
      front: current.front + 1,
      back: current.back + 1,
      surface: current.surface + 1,
      corner: current.corner + 1,
    }));
  }

  function handleImageSelected(stepId: string, file: File | null) {
    setGradeError('');
    if (stepId === 'front') setFrontImage(file);
    if (stepId === 'back') setBackImage(file);
    if (stepId === 'surface') setSurfaceImage(file);
    if (stepId === 'corner') setCornerImage(file);
  }

  async function handleGrade() {
    if (!frontImage) return;
    setIsGrading(true);
    setGradeError('');

    try {
      const formData = new FormData();
      formData.set('frontImage', frontImage);
      if (backImage) formData.set('backImage', backImage);
      if (surfaceImage) formData.set('surfaceImage', surfaceImage);
      if (cornerImage) formData.set('cornerImage', cornerImage);

      const response = await fetch('/api/grader/grade', { method: 'POST', body: formData });
      const data = await readJsonResponse<GradeResultData & { remainingGrades?: number; error?: string }>(response);

      if (!response.ok) throw new Error(data.error ?? 'Unable to grade this card right now.');

      setGradeResult(data);
      if (typeof data.remainingGrades === 'number') {
        setRemainingGrades(data.remainingGrades);
      } else if (remainingGrades !== null) {
        setRemainingGrades(Math.max(remainingGrades - 1, 0));
      }
    } catch (error) {
      setGradeError(error instanceof Error ? error.message : 'Unable to grade this card right now.');
    } finally {
      setLoadingStep(loadingSteps.length);
      setIsGrading(false);
    }
  }

  if (gradeResult) {
    return (
      <section className="space-y-8">
        <GradeResult result={gradeResult} onReset={resetGrader} />
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <div className="overflow-hidden rounded border border-ink-700 bg-ink-900">
        <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6 p-6 md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-ash-500">Grader</p>
                <h1 className="text-4xl font-semibold tracking-tight text-ash-50 md:text-5xl">
                  Grade a Card
                </h1>
              </div>
              <Link
                href={'/grader/history' as Route}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-500 hover:text-brand-400 hover:underline underline-offset-4"
              >
                <History className="h-3.5 w-3.5" />
                Grade history →
              </Link>
            </div>

            <p className="max-w-xl text-base leading-7 text-ash-300">
              Upload photos. Get PSA, BGS, and CGC estimates with sub-grades and submission guidance.
            </p>

            <div className="space-y-3">
              {photoSteps.map((step) => (
                <div key={step.id} className="rounded border border-ink-700 bg-ink-800 p-4 space-y-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-ash-500">
                      {step.title}{step.required ? ' · required' : ''}
                    </p>
                    <p className="mt-1 text-xs text-ash-500">{step.instruction}</p>
                  </div>
                  <ImageUpload
                    key={uploadKeys[step.id]}
                    onImageSelected={(file) => handleImageSelected(step.id, file)}
                    accept="image/*"
                    maxSizeMB={10}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-6 border-t border-ink-700 bg-ink-800 p-6 lg:border-l lg:border-t-0 lg:p-8">
            <div className="rounded border border-amber-800 bg-amber-950 p-4 text-sm text-amber-400">
              AI estimate only — not a professional grade.
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={handleGrade}
                disabled={!frontImage || isGrading}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded bg-brand-500 px-6 text-sm font-semibold text-white hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isGrading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gauge className="h-4 w-4" />}
                Grade Card
              </button>

              {remainingLabel ? (
                <p className="text-center text-sm text-ash-500">{remainingLabel}</p>
              ) : null}

              {gradeError ? (
                <div className="space-y-2">
                  <p className="text-sm text-rose-400">{gradeError}</p>
                  <button
                    type="button"
                    onClick={() => setGradeError('')}
                    className="text-sm font-medium text-brand-500 hover:text-brand-400 hover:underline underline-offset-4"
                  >
                    Dismiss and try again
                  </button>
                </div>
              ) : null}
            </div>

            <div className="mt-auto rounded border border-ink-700 bg-ink-900 p-5">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-ash-500">Grading progress</p>
              <div className="mt-4 space-y-2">
                {loadingSteps.map((step, index) => {
                  const active = isGrading && loadingStep === index;
                  const complete = isGrading ? index < loadingStep : false;

                  return (
                    <div
                      key={step}
                      className={`rounded border px-4 py-3 ${
                        active
                          ? 'border-brand-500/40 bg-brand-900/20 text-ash-50'
                          : complete
                            ? 'border-emerald-800 bg-emerald-950 text-emerald-400'
                            : 'border-ink-700 bg-ink-800 text-ash-500'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-semibold ${
                            complete
                              ? 'bg-emerald-500 text-white'
                              : active
                                ? 'bg-brand-500 text-white'
                                : 'bg-ink-700 text-ash-400'
                          }`}
                        >
                          {complete ? <Check className="h-3.5 w-3.5" /> : index + 1}
                        </span>
                        <span className="text-sm font-medium">{step}</span>
                        {active ? <Loader2 className="ml-auto h-4 w-4 animate-spin text-brand-400" /> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
