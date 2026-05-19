'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { History, Loader2, ScanLine } from 'lucide-react';
import { ImageUpload } from '@/components/ImageUpload';
import { ScanResult } from '@/components/ScanResult';
import { Eyebrow, Rule } from '@/components/editorial';
import { readJsonResponse } from '@/lib/http-json';
import type { ScannerResult } from '@/lib/scanner';

// ── OCR steps shown in the reading panel ─────────────────────────────────
const OCR_STEPS = ['READING LABEL', 'CERT LOOKUP', 'FETCHING POP DATA'];

// ── Quota micro-bars ──────────────────────────────────────────────────────
function QuotaBars({ remaining, total = 50 }: { remaining: number | null; total?: number }) {
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

// ── Viewfinder: dark graph-paper container wrapping ImageUpload ───────────
function ViewfinderArea({
  previewUrl,
  isScanning,
  uploadKey,
  onImageSelected,
}: {
  previewUrl: string;
  isScanning: boolean;
  uploadKey: number;
  onImageSelected: (file: File | null, url: string) => void;
}) {
  return (
    <div
      className="relative overflow-hidden rounded border border-rule"
      style={{
        background: '#14110d',
        backgroundImage:
          'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
        minHeight: 300,
      }}
    >
      {/* corner brackets */}
      {([
        'top-3 left-3 border-l border-t',
        'top-3 right-3 border-r border-t',
        'bottom-3 left-3 border-l border-b',
        'bottom-3 right-3 border-r border-b',
      ] as const).map((cls) => (
        <div key={cls} className={`pointer-events-none absolute h-5 w-5 border-accent ${cls}`} />
      ))}

      {/* scan line */}
      {isScanning && (
        <div
          className="scan-line pointer-events-none absolute inset-x-4 z-20 h-0.5 bg-accent"
          style={{ boxShadow: '0 0 8px 2px rgba(184,83,26,0.5)' }}
        />
      )}

      {/* photo preview overlay */}
      {previewUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt="Slab preview"
          className="absolute inset-0 h-full w-full object-cover opacity-70"
        />
      )}

      {/* ImageUpload drop zone (always rendered so the label/input stays active) */}
      <div className={`relative z-10 p-5 ${previewUrl ? 'opacity-0 pointer-events-none absolute inset-0' : ''}`}>
        <ImageUpload
          key={uploadKey}
          onImageSelected={onImageSelected}
          accept="image/*"
          maxSizeMB={10}
        />
      </div>

      {/* scanning overlay */}
      {isScanning && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <span className="font-mono text-[11px] tracking-[0.18em] text-paper/70">SCANNING…</span>
        </div>
      )}
    </div>
  );
}

// ── Reading panel ─────────────────────────────────────────────────────────
function ReadingPanel({ isScanning, step }: { isScanning: boolean; step: number }) {
  return (
    <div className="rounded border border-rule bg-surface p-5">
      <Eyebrow className="mb-4">{isScanning ? 'Reading…' : 'Waiting'}</Eyebrow>
      <div className="space-y-2">
        {OCR_STEPS.map((label, i) => {
          const done = step > i;
          const active = isScanning && step === i;
          return (
            <div
              key={label}
              className={`flex items-center gap-3 rounded border px-3 py-2.5 transition-colors ${
                done
                  ? 'border-positive/30 bg-positive/5'
                  : active
                  ? 'border-accent/40 bg-accent/5'
                  : 'border-rule bg-surface-2'
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded font-mono text-[10px] font-semibold ${
                  done
                    ? 'bg-positive text-white'
                    : active
                    ? 'bg-accent text-white'
                    : 'bg-rule text-ink-3'
                }`}
              >
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

      {!isScanning && (
        <div className="mt-6 space-y-2 border-t border-rule pt-5">
          <Eyebrow>How it works</Eyebrow>
          <p className="mt-2 text-[13px] leading-6 text-ink-2">
            We read the slab label with GPT-4o, look up the cert in the registry,
            and pull population data — all in one shot.
          </p>
          <p className="font-mono text-[10px] text-ink-3">
            SGC · PSA · BGS · CGC supported
          </p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────

export default function ScannerPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [scanResult, setScanResult] = useState<ScannerResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const [remainingScans, setRemainingScans] = useState<number | null>(null);
  const [dailyLimit, setDailyLimit] = useState(50);
  const [loadingStep, setLoadingStep] = useState(0);
  const [uploadKey, setUploadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function loadQuota() {
      try {
        const r = await fetch('/api/scanner/quota');
        if (!r.ok) return;
        const data = (await r.json()) as { remainingScans?: number; dailyLimit?: number };
        if (!cancelled && typeof data.remainingScans === 'number') {
          setRemainingScans(data.remainingScans);
        }
        if (!cancelled && typeof data.dailyLimit === 'number') {
          setDailyLimit(data.dailyLimit);
        }
      } catch { /* keep optimistic default */ }
    }
    void loadQuota();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!isScanning) return;
    setLoadingStep(0);
    const t1 = window.setTimeout(() => setLoadingStep(1), 2200);
    const t2 = window.setTimeout(() => setLoadingStep(2), 4800);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
  }, [isScanning]);

  function resetScan() {
    setSelectedFile(null);
    setPreviewUrl('');
    setScanResult(null);
    setScanError('');
    setIsScanning(false);
    setLoadingStep(0);
    setUploadKey((k) => k + 1);
  }

  async function handleScan() {
    if (!selectedFile) return;
    setIsScanning(true);
    setScanError('');
    try {
      const formData = new FormData();
      formData.set('image', selectedFile);
      if (previewUrl) formData.set('imageUrl', previewUrl);
      const r = await fetch('/api/scanner/scan', { method: 'POST', body: formData });
      const data = await readJsonResponse<ScannerResult & { remainingScans?: number }>(r);
      if (!r.ok) throw new Error(data.error ?? 'Unable to scan this slab right now.');
      setScanResult(data);
      if (typeof data.remainingScans === 'number') {
        setRemainingScans(data.remainingScans);
      } else if (remainingScans !== null) {
        setRemainingScans(Math.max(remainingScans - 1, 0));
      }
    } catch (error) {
      setScanError(error instanceof Error ? error.message : 'Unable to scan this slab right now.');
    } finally {
      setLoadingStep(OCR_STEPS.length);
      setIsScanning(false);
    }
  }

  return (
    <>
      <style>{`
        @keyframes scanLine {
          0%   { top: 6%;  opacity: 0; }
          8%   { opacity: 1; }
          92%  { opacity: 1; }
          100% { top: 94%; opacity: 0; }
        }
        .scan-line { position: absolute; animation: scanLine 2.4s ease-in-out infinite; }
      `}</style>

      <section className="space-y-8">
        {/* 1 · Page header */}
        <div className="flex items-end justify-between gap-6">
          <div>
            <Eyebrow>Scanner</Eyebrow>
            <h1 className="mt-1.5 font-serif italic text-[40px] leading-none tracking-tight text-ink md:text-[52px]">
              Point at the slab.<br />
              We&apos;ll do the rest.
            </h1>
          </div>
          <div className="hidden flex-col items-end gap-1.5 sm:flex">
            <Eyebrow>Daily quota</Eyebrow>
            <QuotaBars remaining={remainingScans} total={dailyLimit} />
          </div>
        </div>

        <Rule />

        {/* 2 · Main layout */}
        {!scanResult ? (
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            {/* Left — viewfinder */}
            <div className="space-y-3">
              <ViewfinderArea
                previewUrl={previewUrl}
                isScanning={isScanning}
                uploadKey={uploadKey}
                onImageSelected={(file, url) => {
                  setSelectedFile(file);
                  setPreviewUrl(url);
                  setScanError('');
                }}
              />
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleScan}
                  disabled={!selectedFile || isScanning}
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-5 text-[13px] font-medium text-paper hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isScanning
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <ScanLine className="h-3.5 w-3.5" />}
                  {isScanning ? 'Scanning…' : 'Scan slab'}
                </button>
                {scanError && (
                  <p className="font-mono text-[11px] text-negative">{scanError}</p>
                )}
              </div>
            </div>

            {/* Right — reading panel */}
            <ReadingPanel isScanning={isScanning} step={loadingStep} />
          </div>
        ) : (
          <ScanResult
            scan={scanResult}
            onTryAgain={resetScan}
            onQuotaUpdate={setRemainingScans}
          />
        )}

        {/* 3 · Footer */}
        <div className="flex items-center gap-4 border-t border-rule pt-4">
          <Link
            href={'/scanner/history' as Route}
            className="inline-flex items-center gap-1.5 font-mono text-[11px] text-ink-3 hover:text-ink"
          >
            <History className="h-3 w-3" />
            Scan history
          </Link>
        </div>
      </section>
    </>
  );
}
