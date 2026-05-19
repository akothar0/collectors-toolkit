'use client';

import { Check, ChevronDown, History, Loader2, ScanLine } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ImageUpload } from '@/components/ImageUpload';
import { ScanResult } from '@/components/ScanResult';
import { readJsonResponse } from '@/lib/http-json';
import type { ScannerResult } from '@/lib/scanner';

const loadingSteps = ['Reading slab label…', 'Looking up cert…', 'Fetching card details…'];

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
        if (!response.ok) return;
        const data = (await response.json()) as { remainingScans?: number };
        if (!cancelled && typeof data.remainingScans === 'number') {
          setRemainingScans(data.remainingScans);
        }
      } catch {
        // Keep optimistic default if quota endpoint is unavailable.
      }
    }

    void loadQuota();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!isScanning) return;
    setLoadingStep(0);
    const t1 = window.setTimeout(() => setLoadingStep(1), 2000);
    const t2 = window.setTimeout(() => setLoadingStep(2), 4500);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [isScanning]);

  const remainingLabel = useMemo(() => {
    if (remainingScans === null) return null;
    return `${remainingScans} scan${remainingScans === 1 ? '' : 's'} left today`;
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
    if (!selectedFile) return;
    setIsScanning(true);
    setScanError('');

    try {
      const formData = new FormData();
      formData.set('image', selectedFile);
      if (previewUrl) formData.set('imageUrl', previewUrl);

      const response = await fetch('/api/scanner/scan', { method: 'POST', body: formData });
      const data = await readJsonResponse<ScannerResult & { remainingScans?: number }>(response);
      if (!response.ok) throw new Error(data.error ?? 'Unable to scan this slab right now.');

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
      <div className="overflow-hidden rounded border border-ink-700 bg-ink-900">
        <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6 p-6 md:p-8">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-ash-500">Scanner</p>
              <h1 className="text-4xl font-semibold tracking-tight text-ash-50 md:text-5xl">
                Scan a Slab
              </h1>
            </div>

            <p className="max-w-xl text-base leading-7 text-ash-300">
              Photograph a graded slab. We read the cert and pull PSA and BGS registry data.
              SGC scans read the label only — verify at gosgc.com.
            </p>

            <div className="flex items-center gap-4">
              <Link
                href="/scanner/history"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-500 hover:text-brand-400 hover:underline underline-offset-4"
              >
                <History className="h-3.5 w-3.5" />
                Scan history →
              </Link>
            </div>

            <details className="group rounded border border-ink-700 bg-ink-800 p-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-xs font-medium uppercase tracking-[0.18em] text-ash-400">
                <span>Photo tips</span>
                <ChevronDown className="h-4 w-4 transition-transform duration-200 group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-sm leading-7 text-ash-400">
                Flat slab · Sharp label · No glare · Good light
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
                  className="inline-flex h-11 items-center justify-center gap-2 rounded bg-brand-500 px-6 text-sm font-semibold text-white hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isScanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
                  Scan
                </button>
                {remainingLabel ? (
                  <span className="text-sm text-ash-500">{remainingLabel}</span>
                ) : null}
              </div>

              {scanError ? <p className="text-sm text-rose-400">{scanError}</p> : null}
            </div>
          </div>

          <div className="border-t border-ink-700 bg-ink-800 p-6 lg:border-l lg:border-t-0 lg:p-8">
            <div className="flex h-full flex-col gap-6">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-ash-500">Workflow</p>
              <div className="space-y-2">
                {loadingSteps.map((step, index) => {
                  const active = isScanning && loadingStep === index;
                  const complete = index < loadingStep;

                  return (
                    <div
                      key={step}
                      className={`rounded border px-4 py-3 ${
                        active
                          ? 'border-brand-500/40 bg-brand-900/20 text-ash-50'
                          : complete
                            ? 'border-emerald-800 bg-emerald-950 text-emerald-400'
                            : 'border-ink-700 bg-ink-900 text-ash-500'
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

              <div className="mt-auto rounded border border-ink-700 bg-ink-900 p-5">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-ash-500">What happens</p>
                <p className="mt-3 text-sm leading-7 text-ash-400">
                  We read the slab label, verify the cert when possible, and save the attempt either way.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {scanResult ? (
        <ScanResult scan={scanResult} onTryAgain={resetScan} onQuotaUpdate={setRemainingScans} />
      ) : null}
    </section>
  );
}
