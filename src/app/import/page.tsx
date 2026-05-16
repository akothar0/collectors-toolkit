'use client';

import { useEffect, useRef, useState } from 'react';
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
  const bookmarkletRef = useRef<HTMLAnchorElement>(null);

  // Auto-handle bookmarklet redirect with ?bd= param
  const bd = searchParams.get('bd');
  useEffect(() => {
    if (bd) {
      setActiveTab('ebay_bookmarklet');
      handleBookmarkletData(bd);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load bookmarklet href from API
  useEffect(() => {
    if (activeTab !== 'ebay_bookmarklet') return;
    fetch('/api/bookmarklet')
      .then((r) => r.text())
      .then((code) => {
        if (bookmarkletRef.current) {
          bookmarkletRef.current.href = `javascript:${code}`;
        }
      })
      .catch(() => {});
  }, [activeTab]);

  async function handleBookmarkletData(encoded: string) {
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('source', 'ebay_bookmarklet');
      formData.append('bookmarkletData', decodeURIComponent(encoded));
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
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-soft">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-brand-600">Import</p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
          Import Purchases
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
          Bulk import cards from eBay and Fanatics into your collection. Review every row before saving.
        </p>
      </div>

      {/* Tabs */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-soft">
        <div className="flex gap-1 border-b border-slate-200 px-6 pt-4">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setFiles([]); setError(''); }}
              className={`relative flex items-center gap-2 rounded-t-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-slate-50 text-slate-950 shadow-[0_1px_0_#f8fafc]'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
              {tab.badge && (
                <span className="rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                  {tab.badge}
                </span>
              )}
              {activeTab === tab.id && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-brand-600" />
              )}
            </button>
          ))}
        </div>

        <div className="p-8">
          {/* eBay Screenshots */}
          {activeTab === 'ebay_screenshot' && (
            <div className="space-y-5">
              <ol className="space-y-2 text-sm text-slate-600">
                <li className="flex gap-3"><span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">1</span>Go to <a href="https://ebay.com/mye/myebay/purchase" target="_blank" rel="noreferrer" className="text-brand-600 underline underline-offset-2">ebay.com/mye/myebay/purchase</a></li>
                <li className="flex gap-3"><span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">2</span>Scroll through your purchases — each purchase shows the full card title</li>
                <li className="flex gap-3"><span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">3</span>Take screenshots (Cmd+Shift+4 on Mac, Print Screen on Windows)</li>
                <li className="flex gap-3"><span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">4</span>Upload all screenshots below — multiple at once</li>
              </ol>
              <FileDropzone accept={accept} multiple files={files} onChange={setFiles} label={`${fileLabel}s`} />
            </div>
          )}

          {/* eBay Bookmarklet */}
          {activeTab === 'ebay_bookmarklet' && (
            <div className="space-y-6">
              {loading && bd ? (
                <div className="text-sm text-slate-500">Processing your eBay purchases…</div>
              ) : (
                <>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
                    <p className="font-medium text-slate-800">One-time setup</p>
                    <p className="mt-1">Drag this button to your browser&apos;s bookmarks bar. Then go to your eBay purchases page and click the bookmark.</p>
                    <div className="mt-4">
                      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                      <a
                        ref={bookmarkletRef}
                        href="#"
                        onClick={(e) => e.preventDefault()}
                        draggable
                        className="inline-flex cursor-grab items-center gap-2 rounded-xl border-2 border-dashed border-brand-400 bg-white px-4 py-2.5 text-sm font-semibold text-brand-700 select-none active:cursor-grabbing"
                      >
                        ⚡ Import from eBay
                      </a>
                      <p className="mt-2 text-xs text-slate-400">Drag the button above to your bookmarks bar</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-500">
                    After clicking the bookmark on eBay, you&apos;ll be redirected back here automatically with your purchases ready to review.
                  </p>
                </>
              )}
            </div>
          )}

          {/* Fanatics PDFs */}
          {activeTab === 'fanatics_pdf' && (
            <div className="space-y-5">
              <ol className="space-y-2 text-sm text-slate-600">
                <li className="flex gap-3"><span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">1</span>Go to <a href="https://fanaticscollect.com/activity/orders/marketplace" target="_blank" rel="noreferrer" className="text-brand-600 underline underline-offset-2">Fanatics Collect → Orders</a></li>
                <li className="flex gap-3"><span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">2</span>Click the <strong>↓</strong> download button on each order — PDFs save automatically without leaving the page</li>
                <li className="flex gap-3"><span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">3</span>Upload all downloaded PDFs below at once</li>
              </ol>
              <FileDropzone accept=".pdf" multiple files={files} onChange={setFiles} label="PDFs" />
            </div>
          )}

          {/* Paste */}
          {activeTab === 'paste' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">Paste order confirmation email text or any purchase list. Our AI will extract the card purchases.</p>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                rows={10}
                placeholder="Paste your order confirmation or purchase history text here…"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
          )}

          {activeTab !== 'ebay_bookmarklet' && (
            <div className="mt-6">
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
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
    <label className="group relative block cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center transition-colors hover:border-brand-400 hover:bg-slate-100">
      <input type="file" accept={accept} multiple={multiple} className="sr-only" onChange={handleChange} />
      {files.length > 0 ? (
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-800">{files.length} {label.toLowerCase()} selected</p>
          <p className="text-xs text-slate-500">{files.map((f) => f.name).join(', ')}</p>
          <p className="text-xs text-brand-600">Click to change selection</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-700">Drop {label.toLowerCase()} here or click to browse</p>
          <p className="text-xs text-slate-400">{multiple ? 'Multiple files supported' : 'One file at a time'}</p>
        </div>
      )}
    </label>
  );
}

export default function ImportPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-slate-500">Loading…</div>}>
      <ImportPageInner />
    </Suspense>
  );
}
