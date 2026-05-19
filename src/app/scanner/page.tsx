'use client';

import { Check, ChevronDown, History, Loader2, ScanLine } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ImageUpload } from '@/components/ImageUpload';
import { ScanResult } from '@/components/ScanResult';
import { readJsonResponse } from '@/lib/http-json';
import type { ScannerResult } from '@/lib/scanner';

const loadingSteps = ['Reading slab label...', 'Looking up cert...', 'Fetching card details...'];

export default function ScannerPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [scanResult, setScanResult] = useState<ScannerResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const [remainingScans, setRemainingScans] = useState<number | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [uploadKey, setUploadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadQuota() {
      try {
        const response = await fetch('/api/scanner/quota');
        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as { remainingScans?: number };
        if (!cancelled && typeof data.remainingScans === 'number') {
          setRemainingScans(data.remainingScans);
        }
      } catch {
        // Keep the optimistic default if the quota endpoint is unavailable.
      }
    }

    void loadQuota();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isScanning) {
      return;
    }

    setLoadingStep(0);
    const advanceToLookup = window.setTimeout(() => setLoadingStep(1), 2000);
    const advanceToDetails = window.setTimeout(() => setLoadingStep(2), 4500);

    return () => {
      window.clearTimeout(advanceToLookup);
      window.clearTimeout(advanceToDetails);
    };
  }, [isScanning]);

  const remainingLabel = useMemo(() => {
    if (remainingScans === null) {
      return 'Loading scan quota...';
    }

    return `${remainingScans} scan${remainingScans === 1 ? '' : 's'} remaining today`;
  }, [remainingScans]);

  function resetScan() {
    setSelectedFile(null);
    setPreviewUrl('');
    setScanResult(null);
    setScanError('');
    setIsScanning(false);
    setLoadingStep(0);
    setUploadKey((current) => current + 1);
  }

  async function handleScan() {
    if (!selectedFile) {
      return;
    }

    setIsScanning(true);
    setScanError('');

    try {
      const formData = new FormData();
      formData.set('image', selectedFile);
      if (previewUrl) {
        formData.set('imageUrl', previewUrl);
      }

      const response = await fetch('/api/scanner/scan', {
        method: 'POST',
        body: formData,
      });

      const data = await readJsonResponse<ScannerResult & { remainingScans?: number }>(response);
      if (!response.ok) {
        throw new Error(data.error ?? 'Unable to scan this slab right now.');
      }

      setScanResult(data);
      if (typeof data.remainingScans === 'number') {
        setRemainingScans(data.remainingScans);
      } else if (remainingScans !== null) {
        setRemainingScans(Math.max(remainingScans - 1, 0));
      }
    } catch (error) {
      setScanError(error instanceof Error ? error.message : 'Unable to scan this slab right now.');
    } finally {
      setLoadingStep(loadingSteps.length);
      setIsScanning(false);
    }
  }

  return (
    <section className="space-y-8">
      <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-soft">
        <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6 p-6 md:p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
              <ScanLine className="h-3.5 w-3.5" />
              Graded Card Scanner
            </div>

            <div className="space-y-4">
              <h1 className="max-w-3xl font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight text-slate-950 md:text-6xl">
                Graded Card Scanner
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-600">
                Upload a photo of your graded slab to read the cert number and verify details for PSA and BGS slabs. SGC scans read the label only — verify on gosgc.com and save manually.
              </p>
              <Link
                href="/scanner/history"
                className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:underline"
              >
                <History className="h-4 w-4" />
                View scan history
              </Link>
            </div>

            <details className="group rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold uppercase tracking-[0.18em] text-slate-700">
                <span>Photo tips</span>
                <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
                Lay slab flat · Use good lighting · Make sure the label is in focus · Avoid glare
              </p>
            </details>

            <div className="space-y-4">
              <ImageUpload
                key={uploadKey}
                onImageSelected={(file, nextPreviewUrl) => {
                  setSelectedFile(file);
                  setPreviewUrl(nextPreviewUrl);
                  setScanError('');
                }}
                accept="image/*"
                maxSizeMB={10}
              />

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={handleScan}
                  disabled={!selectedFile || isScanning}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isScanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
                  Scan Card
                </button>
                <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600">
                  {remainingLabel}
                </div>
              </div>

              {scanError ? <p className="text-sm text-rose-600">{scanError}</p> : null}
            </div>
          </div>

          <div className="border-t border-slate-200 bg-slate-950 p-6 text-white lg:border-l lg:border-t-0 lg:p-8">
            <div className="flex h-full flex-col justify-between gap-6">
              <div className="space-y-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Workflow</p>
                <div className="space-y-3">
                  {loadingSteps.map((step, index) => {
                    const active = isScanning && loadingStep === index;
                    const complete = index < loadingStep;

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
                              complete ? 'bg-emerald-500 text-white' : active ? 'bg-brand-500 text-white' : 'bg-white/10 text-slate-300'
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

              <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-400">What happens next</p>
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  The scan reads the slab label, verifies the cert when possible, and saves the attempt whether or not the lookup succeeds.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {scanResult ? <ScanResult scan={scanResult} onTryAgain={resetScan} onQuotaUpdate={setRemainingScans} /> : null}
    </section>
  );
}
