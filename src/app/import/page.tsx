'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

type TabId = 'ebay_screenshot' | 'ebay_bookmarklet' | 'fanatics_pdf' | 'paste';

type Tab = { id: TabId; label: string; badge?: string };

const TABS: Tab[] = [
  { id: 'ebay_screenshot', label: 'eBay Screenshots', badge: 'Recommended' },
  { id: 'ebay_bookmarklet', label: 'eBay Bookmarklet' },
  { id: 'fanatics_pdf', label: 'Fanatics PDFs' },
  { id: 'paste', label: 'Paste Text' },
];

function ImportPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabId>('ebay_screenshot');
  const [files, setFiles] = useState<File[]>([]);
  const [pasteText, setPasteText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [bookmarkletCode, setBookmarkletCode] = useState('');
  const [bookmarkletAppUrl, setBookmarkletAppUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const bd = searchParams.get('bd');
  const bmDebug = searchParams.get('bm_debug');

  useEffect(() => {
    setActiveTab('ebay_bookmarklet');

    if (bmDebug) {
      const links = searchParams.get('links');
      const msg = searchParams.get('msg');
      if (bmDebug === 'empty') {
        setError(`No purchases found on the eBay page (${links ?? '?'} item links seen). Scroll to load orders and try again.`);
      } else if (bmDebug === 'url_too_long') {
        setError('Too many purchases to fit in one import URL. Try with fewer visible orders or use screenshots.');
      } else if (bmDebug === 'error') {
        setError(msg ? decodeURIComponent(msg) : 'Bookmarklet failed on eBay.');
      } else {
        setError(`Bookmarklet debug: ${bmDebug}`);
      }
      return;
    }

    if (bd) {
      handleBookmarkletData(bd);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bd, bmDebug]);

  // Load bookmarklet code from API (no-store so always fresh)
  useEffect(() => {
    if (activeTab !== 'ebay_bookmarklet') return;
    fetch('/api/bookmarklet', { cache: 'no-store' })
      .then((r) => r.text())
      .then((code) => {
        const full = `javascript:${code}`;
        setBookmarkletCode(full);
        const match = code.match(/window\.location\.href='([^']+)\/import\?bd='/);
        if (match?.[1]) setBookmarkletAppUrl(match[1]);
      })
      .catch(() => {});
  }, [activeTab]);

  const bookmarkletPortMismatch =
    typeof window !== 'undefined' &&
    bookmarkletAppUrl &&
    window.location.origin !== bookmarkletAppUrl;

  async function copyBookmarklet() {
    if (!bookmarkletCode) return;
    await navigator.clipboard.writeText(bookmarkletCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  async function handleBookmarkletData(encoded: string) {
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('source', 'ebay_bookmarklet');
      formData.append('bookmarkletData', encoded);
      const res = await fetch('/api/import/parse', { method: 'POST', body: formData });
      const json = await res.json() as { batchId?: string; error?: string };
      if (!res.ok || !json.batchId) throw new Error(json.error ?? 'Parse failed.');
      router.push(`/import/${json.batchId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setLoading(false);
    }
  }

  async function handleSubmit() {
    setError('');
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('source', activeTab);

      if (activeTab === 'paste') {
        if (!pasteText.trim()) { setError('Please paste some text first.'); setLoading(false); return; }
        formData.append('text', pasteText);
      } else {
        if (files.length === 0) { setError('Please select at least one file.'); setLoading(false); return; }
        files.forEach((f) => formData.append('files', f));
      }

      const res = await fetch('/api/import/parse', { method: 'POST', body: formData });
      const json = await res.json() as { batchId?: string; error?: string };
      if (!res.ok || !json.batchId) throw new Error(json.error ?? 'Parse failed.');
      router.push(`/import/${json.batchId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setLoading(false);
    }
  }

  const currentTab = TABS.find((t) => t.id === activeTab)!;
  const accept = activeTab === 'fanatics_pdf' ? '.pdf' : 'image/*';
  const fileLabel = activeTab === 'fanatics_pdf' ? 'PDF' : 'Screenshot';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded border border-ink-700 bg-ink-900 p-8 ">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-brand-500">Import</p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-ash-50 md:text-4xl">
          Import Purchases
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-ash-300">
          Import from eBay or Fanatics. Review before saving.
        </p>
      </div>

      {/* Tabs */}
      <div className="rounded border border-ink-700 bg-ink-900 ">
        <div className="flex gap-1 border-b border-ink-700 px-6 pt-4">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setFiles([]); setError(''); }}
              className={`relative flex items-center gap-2 rounded-t-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-ink-800 text-ash-50 shadow-[0_1px_0_#f8fafc]'
                  : 'text-ash-400 hover:text-ash-200'
              }`}
            >
              {tab.label}
              {tab.badge && (
                <span className="rounded bg-brand-500 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                  {tab.badge}
                </span>
              )}
              {activeTab === tab.id && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 rounded bg-brand-500" />
              )}
            </button>
          ))}
        </div>

        <div className="p-8">
          {/* eBay Screenshots */}
          {activeTab === 'ebay_screenshot' && (
            <div className="space-y-5">
              <ol className="space-y-2 text-sm text-ash-300">
                <li className="flex gap-3"><span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded bg-brand-500 text-xs font-bold text-white">1</span>Go to <a href="https://ebay.com/mye/myebay/purchase" target="_blank" rel="noreferrer" className="text-brand-500 underline underline-offset-2">ebay.com/mye/myebay/purchase</a></li>
                <li className="flex gap-3"><span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded bg-brand-500 text-xs font-bold text-white">2</span>Scroll through your purchases — each purchase shows the full card title</li>
                <li className="flex gap-3"><span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded bg-brand-500 text-xs font-bold text-white">3</span>Take screenshots (Cmd+Shift+4 on Mac, Print Screen on Windows)</li>
                <li className="flex gap-3"><span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded bg-brand-500 text-xs font-bold text-white">4</span>Upload all screenshots below — multiple at once</li>
              </ol>
              <FileDropzone accept={accept} multiple files={files} onChange={setFiles} label={`${fileLabel}s`} />
            </div>
          )}

          {/* eBay Bookmarklet */}
          {activeTab === 'ebay_bookmarklet' && (
            <div className="space-y-5">
              {loading && bd ? (
                <div className="text-sm text-ash-400">Processing your eBay purchases…</div>
              ) : (
                <>
                  <ol className="space-y-2 text-sm text-ash-300">
                    <li className="flex gap-3">
                      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded bg-brand-500 text-xs font-bold text-white">1</span>
                      Open the{' '}
                      <a href="/bookmarklet-install.html" target="_blank" rel="noreferrer" className="font-semibold text-brand-500 underline underline-offset-2">
                        bookmarklet installer
                      </a>{' '}
                      and drag <strong>Import from eBay</strong> to your bookmarks bar
                    </li>
                    <li className="flex gap-3">
                      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded bg-brand-500 text-xs font-bold text-white">2</span>
                      Or click <strong>Copy Bookmarklet</strong> below and paste the full URL into a new bookmark
                    </li>
                    <li className="flex gap-3">
                      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded bg-brand-500 text-xs font-bold text-white">3</span>
                      On <a href="https://ebay.com/mye/myebay/purchase" target="_blank" rel="noreferrer" className="text-brand-500 underline underline-offset-2">ebay.com/mye/myebay/purchase</a>, click the bookmark — you&apos;ll return here to review
                    </li>
                  </ol>

                  <div className="flex flex-wrap items-center gap-3">
                    <a
                      href="/bookmarklet-install.html"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex rounded bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white no-underline transition-colors hover:bg-brand-400"
                    >
                      Open bookmarklet installer
                    </a>
                    <button
                      type="button"
                      onClick={copyBookmarklet}
                      disabled={!bookmarkletCode}
                      className="rounded border border-ink-700 bg-ink-900 px-5 py-2.5 text-sm font-semibold text-ash-200 transition-colors hover:bg-ink-800 disabled:opacity-40"
                    >
                      {copied ? '✓ Copied!' : 'Copy Bookmarklet'}
                    </button>
                  </div>

                  {bookmarkletPortMismatch && (
                    <p className="rounded bg-amber-950 px-4 py-3 text-sm text-amber-800">
                      Re-copy or re-drag the bookmarklet from this page ({window.location.origin}).
                      An older copy may point at {bookmarkletAppUrl}.
                    </p>
                  )}

                  <p className="text-xs text-ash-500">
                    After clicking the bookmark on eBay, you&apos;ll be redirected here automatically.
                    {bookmarkletAppUrl ? ` Redirect target: ${bookmarkletAppUrl}` : ''}
                  </p>
                </>
              )}
            </div>
          )}

          {/* Fanatics PDFs */}
          {activeTab === 'fanatics_pdf' && (
            <div className="space-y-5">
              <ol className="space-y-2 text-sm text-ash-300">
                <li className="flex gap-3"><span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded bg-brand-500 text-xs font-bold text-white">1</span>Go to <a href="https://fanaticscollect.com/activity/orders/marketplace" target="_blank" rel="noreferrer" className="text-brand-500 underline underline-offset-2">Fanatics Collect → Orders</a></li>
                <li className="flex gap-3"><span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded bg-brand-500 text-xs font-bold text-white">2</span>Click the <strong>↓</strong> download button on each order — PDFs save automatically without leaving the page</li>
                <li className="flex gap-3"><span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded bg-brand-500 text-xs font-bold text-white">3</span>Upload all downloaded PDFs below at once</li>
              </ol>
              <FileDropzone accept=".pdf" multiple files={files} onChange={setFiles} label="PDFs" />
            </div>
          )}

          {/* Paste */}
          {activeTab === 'paste' && (
            <div className="space-y-4">
              <p className="text-sm text-ash-300">Paste order confirmation email text or any purchase list. Our AI will extract the card purchases.</p>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                rows={10}
                placeholder="Paste your order confirmation or purchase history text here…"
                className="w-full rounded border border-ink-700 bg-ink-800 p-4 text-sm text-ash-200 placeholder:text-ash-500 focus:border-brand-500/50 focus:outline-none focus:ring-0 focus:ring-brand-700/30"
              />
            </div>
          )}

          {error && (
            <p className="mt-4 rounded bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
          )}

          {activeTab !== 'ebay_bookmarklet' && (
            <div className="mt-6">
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="rounded bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-400 disabled:opacity-50"
              >
                {loading
                  ? 'Parsing…'
                  : activeTab === 'paste'
                    ? 'Parse Text'
                    : `Parse ${files.length > 0 ? files.length : ''} ${currentTab.label.split(' ').pop()}`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FileDropzone({
  accept,
  multiple,
  files,
  onChange,
  label,
}: {
  accept: string;
  multiple?: boolean;
  files: File[];
  onChange: (files: File[]) => void;
  label: string;
}) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    onChange(selected);
  }

  return (
    <label className="group relative block cursor-pointer overflow-hidden rounded border-2 border-dashed border-ink-600 bg-ink-800 p-8 text-center transition-colors hover:border-brand-500/50 hover:bg-ink-800">
      <input type="file" accept={accept} multiple={multiple} className="sr-only" onChange={handleChange} />
      {files.length > 0 ? (
        <div className="space-y-1">
          <p className="text-sm font-semibold text-ash-200">{files.length} {label.toLowerCase()} selected</p>
          <p className="text-xs text-ash-400">{files.map((f) => f.name).join(', ')}</p>
          <p className="text-xs text-brand-500">Click to change selection</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-ash-200">Drop {label.toLowerCase()} here or click to browse</p>
          <p className="text-xs text-ash-500">{multiple ? 'Multiple files supported' : 'One file at a time'}</p>
        </div>
      )}
    </label>
  );
}

export default function ImportPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-ash-400">Loading…</div>}>
      <ImportPageInner />
    </Suspense>
  );
}
