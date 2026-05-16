'use client';

import { Check, Gauge, Loader2, Upload } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { GradeResult } from '@/components/GradeResult';
import { ImageUpload } from '@/components/ImageUpload';
import { readJsonResponse } from '@/lib/http-json';
import type { GradeResult as GradeResultData } from '@/lib/grader';

const loadingSteps = [
  'Examining centering...',
  'Checking corners & edges...',
  'Assessing surface...',
  'Calculating predictions...',
];

type PhotoStep = {
  id: string;
  title: string;
  label: string;
  instruction: string;
  required?: boolean;
};

const photoSteps: PhotoStep[] = [
  {
    id: 'front',
    title: 'Front of card',
    label: 'Full front photo',
    instruction: 'Hold card flat · Camera perpendicular · All 4 corners visible · Good lighting',
    required: true,
  },
  {
    id: 'back',
    title: 'Back of card',
    label: 'Back photo',
    instruction: 'Helps assess back surface and centering',
  },
  {
    id: 'surface',
    title: 'Surface close-up',
    label: 'Front surface with raking light',
    instruction: "Angle your phone's flashlight from the side — reveals scratches invisible head-on",
  },
  {
    id: 'corner',
    title: 'Corner close-up',
    label: "Any corner you're concerned about",
    instruction: 'For cards near the grade boundary — helps assess wear',
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
    front: 0,
    back: 0,
    surface: 0,
    corner: 0,
  });

  useEffect(() => {
    let cancelled = false;

    async function loadQuota() {
      try {
        const response = await fetch('/api/grader/quota');
        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as { remainingGrades?: number };
        if (!cancelled && typeof data.remainingGrades === 'number') {
          setRemainingGrades(data.remainingGrades);
        }
      } catch {
        // Keep optimistic default if quota endpoint is unavailable.
      }
    }

    void loadQuota();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isGrading) {
      return;
    }

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
    if (remainingGrades === null) {
      return 'Loading grade quota...';
    }

    return `${remainingGrades} grade${remainingGrades === 1 ? '' : 's'} remaining today`;
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
    if (!frontImage) {
      return;
    }

    setIsGrading(true);
    setGradeError('');

    try {
      const formData = new FormData();
      formData.set('frontImage', frontImage);
      if (backImage) formData.set('backImage', backImage);
      if (surfaceImage) formData.set('surfaceImage', surfaceImage);
      if (cornerImage) formData.set('cornerImage', cornerImage);

      const response = await fetch('/api/grader/grade', {
        method: 'POST',
        body: formData,
      });

      const data = await readJsonResponse<GradeResultData & { remainingGrades?: number; error?: string }>(
        response
      );

      if (!response.ok) {
        throw new Error(data.error ?? 'Unable to grade this card right now.');
      }

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
      <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-soft">
        <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6 p-6 md:p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
              <Gauge className="h-3.5 w-3.5" />
              Raw Card Grader
            </div>

            <div className="space-y-4">
              <h1 className="max-w-3xl font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
                AI Raw Card Grader
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-600">
                Upload up to four photos for a PSA, BGS, and CGC grade estimate with sub-grades and submission guidance.
              </p>
            </div>

            <div className="space-y-6">
              {photoSteps.map((step) => (
                <div
                  key={step.id}
                  className="rounded-[1.5rem] border border-slate-200 bg-slate-50/50 p-5 space-y-4"
                >
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">
                      {step.title}
                      {step.required ? ' (required)' : ' (optional)'}
                    </p>
                    <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-950">{step.label}</h2>
                    <p className="mt-1 text-sm leading-7 text-slate-600">{step.instruction}</p>
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

          <div className="flex flex-col gap-6 border-t border-slate-200 p-6 lg:border-l lg:border-t-0 lg:p-8">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-950">
              <p className="font-semibold">⚠️ AI Estimate Only</p>
              <p className="mt-2">
                This is not a professional grade. Accuracy depends heavily on photo quality. Use as a rough guide when
                deciding whether to submit for grading.
              </p>
            </div>

            <div className="space-y-4">
              <button
                type="button"
                onClick={handleGrade}
                disabled={!frontImage || isGrading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isGrading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Grade This Card
              </button>

              <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm font-medium text-slate-600">
                {remainingLabel}
              </div>

              {gradeError ? (
                <div className="space-y-3">
                  <p className="text-sm text-rose-600">{gradeError}</p>
                  <button
                    type="button"
                    onClick={() => setGradeError('')}
                    className="text-sm font-medium text-brand-600 hover:underline"
                  >
                    Dismiss and try again
                  </button>
                </div>
              ) : null}
            </div>

            <div className="mt-auto rounded-[1.5rem] border border-slate-200 bg-slate-950 p-6 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Grading progress</p>
              <div className="mt-4 space-y-3">
                {loadingSteps.map((step, index) => {
                  const active = isGrading && loadingStep === index;
                  const complete = isGrading ? index < loadingStep : false;

                  return (
                    <div
                      key={step}
                      className={`rounded-2xl border px-4 py-3 transition-colors ${
                        active
                          ? 'border-brand-300 bg-white/12 text-white'
                          : complete
                            ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100'
                            : 'border-white/10 bg-white/5 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                            complete
                              ? 'bg-emerald-500 text-white'
                              : active
                                ? 'bg-brand-500 text-white'
                                : 'bg-white/10 text-slate-300'
                          }`}
                        >
                          {complete ? <Check className="h-4 w-4" /> : index + 1}
                        </span>
                        <span className="text-sm font-medium">{step}</span>
                        {active ? <Loader2 className="ml-auto h-4 w-4 animate-spin text-brand-200" /> : null}
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
