'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { History, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { GradeResult } from '@/components/GradeResult';
import { ImageUpload } from '@/components/ImageUpload';
import { Eyebrow, Rule } from '@/components/editorial';
import { readJsonResponse } from '@/lib/http-json';
import type { GradeResult as GradeResultData } from '@/lib/grader';

// ── Loading steps ─────────────────────────────────────────────────────────
const LOADING_STEPS = [
  'UPLOADING PHOTOS',
  'ANALYSING WITH GPT-4o',
  'CALCULATING GRADES',
];

// ── Photo steps ───────────────────────────────────────────────────────────
const PHOTO_STEPS = [
  { id: 'front',   label: 'FULL FRONT',       hint: 'Flat · all 4 corners · good light', required: true  },
  { id: 'back',    label: 'FULL BACK',         hint: 'Helps assess surface and centering', required: false },
  { id: 'surface', label: 'SURFACE CLOSE-UP',  hint: 'Raking light — reveals fine scratches', required: false },
  { id: 'corner',  label: 'CORNER CLOSE-UP',   hint: 'Any corner near the grade boundary', required: false },
];

// ── Quota micro-bars ──────────────────────────────────────────────────────
function QuotaBars({ remaining, total = 10 }: { remaining: number | null; total?: number }) {
  if (remaining === null) return null;
  const filled = Math.min(remaining, total);
  const barCount = Math.min(total, 20);
  const filledBars = Math.round((filled / total) * barCount);
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-[3px]">
        {Array.from({ length: barCount }).map((_, i) => (
          <div key={i} className={`h-3.5 w-1.5 rounded-[1px] ${i < filledBars ? 'bg-ink' : 'bg-rule'}`} />
        ))}
      </div>
      <span className="font-mono text-[10px] text-ink-3">{filled}/{total} today</span>
    </div>
  );
}

// ── Compact viewfinder step ───────────────────────────────────────────────
function ViewfinderStep({
  label, hint, required, filled, uploadKey,
  onImageSelected,
}: {
  label: string; hint: string; required: boolean; filled: boolean; uploadKey: number;
  onImageSelected: (file: File | null, url: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded border border-rule">
      {/* label row */}
      <div className="flex items-center gap-2 border-b border-rule px-3 py-2">
        <Eyebrow className={filled ? 'text-positive' : undefined}>{label}</Eyebrow>
        {required
          ? <span className="rounded bg-accent/10 px-1.5 py-px font-mono text-[9px] tracking-[0.12em] text-accent">REQUIRED</span>
          : <span className="font-mono text-[9px] text-ink-4">OPTIONAL</span>}
        {filled && <span className="ml-auto font-mono text-[10px] text-positive">✓</span>}
      </div>

      {/* viewfinder body */}
      <div
        className="relative"
        style={{
          background: '#14110d',
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      >
        {/* corner brackets */}
        {(['top-2 left-2 border-l border-t', 'top-2 right-2 border-r border-t',
           'bottom-2 left-2 border-l border-b', 'bottom-2 right-2 border-r border-b'] as const)
          .map(cls => (
            <div key={cls} className={`pointer-events-none absolute h-4 w-4 border-accent ${cls}`} />
          ))}
        <div className="px-3 py-3">
          <ImageUpload
            key={uploadKey}
            onImageSelected={onImageSelected}
            accept="image/*"
            maxSizeMB={10}
          />
        </div>
      </div>

      {/* hint */}
      <div className="border-t border-rule px-3 py-1.5">
        <p className="font-mono text-[10px] text-ink-4">{hint}</p>
      </div>
    </div>
  );
}

// ── Loading panel ─────────────────────────────────────────────────────────
function LoadingPanel({ step }: { step: number }) {
  return (
    <div className="rounded border border-rule bg-surface p-5">
      <Eyebrow className="mb-4">Grading…</Eyebrow>
      <div className="space-y-2">
        {LOADING_STEPS.map((label, i) => {
          const done = step > i;
          const active = step === i;
          return (
            <div key={label} className={`flex items-center gap-3 rounded border px-3 py-2.5 transition-colors ${
              done ? 'border-positive/30 bg-positive/5' : active ? 'border-accent/40 bg-accent/5' : 'border-rule bg-surface-2'
            }`}>
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded font-mono text-[10px] font-semibold ${
                done ? 'bg-positive text-white' : active ? 'bg-accent text-white' : 'bg-rule text-ink-3'
              }`}>
                {done ? '✓' : i + 1}
              </span>
              <span className={`font-mono text-[11px] tracking-[0.14em] ${done ? 'text-positive' : active ? 'text-accent' : 'text-ink-3'}`}>
                {label}
              </span>
              {active && <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin text-accent" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Summary panel ─────────────────────────────────────────────────────────
function SummaryPanel({
  steps, frontFilled, isGrading, loadingStep, gradeError, remainingGrades, dailyLimit, onGrade,
}: {
  steps: typeof PHOTO_STEPS;
  frontFilled: boolean;
  isGrading: boolean;
  loadingStep: number;
  gradeError: string;
  remainingGrades: number | null;
  dailyLimit: number;
  onGrade: () => void;
}) {
  if (isGrading) return <LoadingPanel step={loadingStep} />;

  return (
    <div className="rounded border border-rule bg-surface p-5 space-y-5">
      <div>
        <Eyebrow className="mb-3">Photos</Eyebrow>
        <div className="space-y-1.5">
          {steps.map(s => (
            <div key={s.id} className="flex items-center gap-2">
              <div className={`h-1.5 w-1.5 rounded-full ${s.required ? 'bg-accent' : 'bg-rule'}`} />
              <span className="font-mono text-[10px] text-ink-3 tracking-[0.1em]">{s.label}</span>
              {s.required && <span className="font-mono text-[9px] text-accent">REQUIRED</span>}
            </div>
          ))}
        </div>
      </div>

      <Rule />

      <div className="space-y-3">
        <button
          type="button"
          onClick={onGrade}
          disabled={!frontFilled || isGrading}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-ink px-5 text-[13px] font-medium text-paper hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isGrading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Grade card
        </button>

        {gradeError && (
          <p className="font-mono text-[11px] text-negative">{gradeError}</p>
        )}

        <QuotaBars remaining={remainingGrades} total={dailyLimit} />
      </div>

      <Rule />

      <p className="font-mono text-[10px] text-ink-3 leading-5">
        AI estimate only — not a professional grade.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────

export default function GraderPage() {
  const [frontImage,   setFrontImage]   = useState<File | null>(null);
  const [backImage,    setBackImage]    = useState<File | null>(null);
  const [surfaceImage, setSurfaceImage] = useState<File | null>(null);
  const [cornerImage,  setCornerImage]  = useState<File | null>(null);
  const [gradeResult,  setGradeResult]  = useState<GradeResultData | null>(null);
  const [isGrading,    setIsGrading]    = useState(false);
  const [gradeError,   setGradeError]   = useState('');
  const [remainingGrades, setRemainingGrades] = useState<number | null>(null);
  const [dailyLimit,   setDailyLimit]   = useState(10);
  const [loadingStep,  setLoadingStep]  = useState(0);
  const [uploadKeys,   setUploadKeys]   = useState({ front: 0, back: 0, surface: 0, corner: 0 });

  useEffect(() => {
    let cancelled = false;
    async function loadQuota() {
      try {
        const r = await fetch('/api/grader/quota');
        if (!r.ok) return;
        const data = (await r.json()) as { remainingGrades?: number; dailyLimit?: number };
        if (!cancelled && typeof data.remainingGrades === 'number') setRemainingGrades(data.remainingGrades);
        if (!cancelled && typeof data.dailyLimit === 'number') setDailyLimit(data.dailyLimit);
      } catch { /* keep defaults */ }
    }
    void loadQuota();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!isGrading) return;
    setLoadingStep(0);
    const t1 = window.setTimeout(() => setLoadingStep(1), 2200);
    const t2 = window.setTimeout(() => setLoadingStep(2), 5000);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
  }, [isGrading]);

  function resetGrader() {
    setFrontImage(null); setBackImage(null); setSurfaceImage(null); setCornerImage(null);
    setGradeResult(null); setGradeError(''); setIsGrading(false); setLoadingStep(0);
    setUploadKeys(k => ({ front: k.front + 1, back: k.back + 1, surface: k.surface + 1, corner: k.corner + 1 }));
  }

  function handleImageSelected(stepId: string, file: File | null) {
    setGradeError('');
    if (stepId === 'front')   setFrontImage(file);
    if (stepId === 'back')    setBackImage(file);
    if (stepId === 'surface') setSurfaceImage(file);
    if (stepId === 'corner')  setCornerImage(file);
  }

  async function handleGrade() {
    if (!frontImage) return;
    setIsGrading(true);
    setGradeError('');
    try {
      const formData = new FormData();
      formData.set('frontImage', frontImage);
      if (backImage)    formData.set('backImage', backImage);
      if (surfaceImage) formData.set('surfaceImage', surfaceImage);
      if (cornerImage)  formData.set('cornerImage', cornerImage);

      const r = await fetch('/api/grader/grade', { method: 'POST', body: formData });
      const data = await readJsonResponse<GradeResultData & { remainingGrades?: number; error?: string }>(r);
      if (!r.ok) throw new Error(data.error ?? 'Unable to grade this card right now.');

      setGradeResult(data);
      if (typeof data.remainingGrades === 'number') setRemainingGrades(data.remainingGrades);
      else if (remainingGrades !== null) setRemainingGrades(Math.max(remainingGrades - 1, 0));
    } catch (error) {
      setGradeError(error instanceof Error ? error.message : 'Unable to grade this card right now.');
    } finally {
      setLoadingStep(LOADING_STEPS.length);
      setIsGrading(false);
    }
  }

  const photoFiles: Record<string, File | null> = { front: frontImage, back: backImage, surface: surfaceImage, corner: cornerImage };

  if (gradeResult) {
    return (
      <section className="space-y-8">
        <GradeResult result={gradeResult} onReset={resetGrader} />
      </section>
    );
  }

  return (
    <section className="space-y-8">
      {/* 1 · Page header */}
      <div className="flex items-end justify-between gap-6">
        <div>
          <Eyebrow>Grader</Eyebrow>
          <h1 className="mt-1.5 font-serif italic text-[40px] leading-none tracking-tight text-ink md:text-[52px]">
            Four photos.<br />One verdict.
          </h1>
        </div>
        <div className="hidden flex-col items-end gap-1.5 sm:flex">
          <Eyebrow>Daily quota</Eyebrow>
          <QuotaBars remaining={remainingGrades} total={dailyLimit} />
        </div>
      </div>

      <Rule />

      {/* 2 · Two-col layout */}
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* Left — photo steps */}
        <div className="space-y-3">
          {PHOTO_STEPS.map(step => (
            <ViewfinderStep
              key={step.id}
              label={step.label}
              hint={step.hint}
              required={step.required}
              filled={Boolean(photoFiles[step.id])}
              uploadKey={uploadKeys[step.id as keyof typeof uploadKeys]}
              onImageSelected={(file, url) => handleImageSelected(step.id, file)}
            />
          ))}
        </div>

        {/* Right — summary / loading */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <SummaryPanel
            steps={PHOTO_STEPS}
            frontFilled={Boolean(frontImage)}
            isGrading={isGrading}
            loadingStep={loadingStep}
            gradeError={gradeError}
            remainingGrades={remainingGrades}
            dailyLimit={dailyLimit}
            onGrade={handleGrade}
          />
        </div>
      </div>

      {/* 3 · Footer */}
      <div className="flex items-center gap-4 border-t border-rule pt-4">
        <Link
          href={'/grader/history' as Route}
          className="inline-flex items-center gap-1.5 font-mono text-[11px] text-ink-3 hover:text-ink"
        >
          <History className="h-3 w-3" />
          Grade history
        </Link>
      </div>
    </section>
  );
}
