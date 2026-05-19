'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Eyebrow, Rule } from '@/components/editorial';

type TabId = 'ebay_screenshot' | 'ebay_bookmarklet' | 'fanatics_pdf' | 'paste';

const SOURCES: { id: TabId; label: string; title: string; desc: string; badge?: string }[] = [
  { id: 'ebay_screenshot', label: 'EBAY SCREENSHOT', title: 'eBay screenshots', desc: 'Screenshot your purchase history page — GPT-4o reads every line.', badge: 'Recommended' },
  { id: 'ebay_bookmarklet', label: 'EBAY BOOKMARKLET', title: 'eBay bookmarklet', desc: 'One-click capture from your eBay orders page, no screenshots needed.' },
  { id: 'fanatics_pdf', label: 'FANATICS PDF', title: 'Fanatics PDFs', desc: 'Download order PDFs from Fanatics Collect and upload them here.' },
  { id: 'paste', label: 'PASTE TEXT', title: 'Paste text', desc: 'Paste any order confirmation email or purchase list.' },
];

// ── File dropzone ─────────────────────────────────────────────────────────
function FileDropzone({ accept, multiple, files, onChange, label }: {
  accept: string; multiple?: boolean; files: File[];
  onChange: (files: File[]) => void; label: string;
}) {
  return (
    <label className="block cursor-pointer rounded border border-dashed border-rule bg-surface-2 px-5 py-6 text-center hover:border-ink transition-colors">
      <input type="file" accept={accept} multiple={multiple} className="sr-only"
        onChange={e => onChange(Array.from(e.target.files ?? []))} />
      {files.length > 0 ? (
        <div className="space-y-1">
          <p className="text-[13px] font-medium text-ink">{files.length} {label.toLowerCase()} selected</p>
          <p className="font-mono text-[10px] text-ink-3">{files.map(f => f.name).join(', ')}</p>
          <p className="font-mono text-[10px] text-accent">Click to change</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          <p className="text-[13px] text-ink-2">Drop {label.toLowerCase()} here or click to browse</p>
          <p className="font-mono text-[10px] text-ink-3">{multiple ? 'Multiple files supported' : 'One file at a time'}</p>
        </div>
      )}
    </label>
  );
}

// ── Inner page ────────────────────────────────────────────────────────────
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
      if (bmDebug === 'empty') setError(`No purchases found on the eBay page (${links ?? '?'} item links seen). Scroll to load orders and try again.`);
      else if (bmDebug === 'url_too_long') setError('Too many purchases to fit in one import URL. Try with fewer visible orders or use screenshots.');
      else if (bmDebug === 'error') setError(msg ? decodeURIComponent(msg) : 'Bookmarklet failed on eBay.');
      else setError(`Bookmarklet debug: ${bmDebug}`);
      return;
    }
    if (bd) void handleBookmarkletData(bd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bd, bmDebug]);

  useEffect(() => {
    if (activeTab !== 'ebay_bookmarklet') return;
    fetch('/api/bookmarklet', { cache: 'no-store' })
      .then(r => r.text())
      .then(code => {
        setBookmarkletCode(`javascript:${code}`);
        const match = code.match(/window\.location\.href='([^']+)\/import\?bd='/);
        if (match?.[1]) setBookmarkletAppUrl(match[1]);
      })
      .catch(() => {});
  }, [activeTab]);

  const bookmarkletPortMismatch =
    typeof window !== 'undefined' && bookmarkletAppUrl && window.location.origin !== bookmarkletAppUrl;

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
        if (!pasteText.trim()) { setError('Paste some text first.'); setLoading(false); return; }
        formData.append('text', pasteText);
      } else {
        if (files.length === 0) { setError('Select at least one file.'); setLoading(false); return; }
        files.forEach(f => formData.append('files', f));
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

  const accept = activeTab === 'fanatics_pdf' ? '.pdf' : 'image/*';
  const fileLabel = activeTab === 'fanatics_pdf' ? 'PDFs' : 'Screenshots';

  return (
    <section className="space-y-8">
      {/* Masthead */}
      <div>
        <Eyebrow>Import</Eyebrow>
        <h1 className="mt-1.5 font-serif italic text-[48px] leading-none tracking-tight text-ink md:text-[56px]">
          Import a batch.
        </h1>
        <p className="mt-2 font-serif italic text-[18px] text-ink-2">
          Bulk-add cards from eBay, Fanatics, or paste a list.
        </p>
      </div>

      <Rule />

      {/* Source selector tabs */}
      <div className="flex flex-wrap gap-2">
        {SOURCES.map(s => (
          <button
            key={s.id}
            type="button"
            onClick={() => { setActiveTab(s.id); setFiles([]); setError(''); }}
            className={`inline-flex items-center gap-2 rounded border px-3 py-1.5 font-mono text-[11px] tracking-[0.12em] transition-colors ${
              activeTab === s.id ? 'border-ink bg-ink text-paper' : 'border-rule bg-surface text-ink-3 hover:border-ink-2 hover:text-ink'
            }`}
          >
            {s.label}
            {s.badge && activeTab !== s.id && (
              <span className="rounded bg-accent/10 px-1 py-px font-mono text-[8px] text-accent">{s.badge.toUpperCase()}</span>
            )}
          </button>
        ))}
      </div>

      {/* Active source card */}
      {(() => {
        const src = SOURCES.find(s => s.id === activeTab)!;
        return (
          <div className="rounded border border-rule bg-surface p-6 space-y-5">
            <div>
              <Eyebrow className="mb-1">{src.label}</Eyebrow>
              <h2 className="font-serif italic text-[26px] text-ink">{src.title}</h2>
              <p className="mt-1 text-[13px] text-ink-2">{src.desc}</p>
            </div>

            {/* eBay Screenshot */}
            {activeTab === 'ebay_screenshot' && (
              <>
                <ol className="space-y-2">
                  {[
                    <>Go to <a href="https://ebay.com/mye/myebay/purchase" target="_blank" rel="noreferrer" className="text-accent underline underline-offset-2">ebay.com/mye/myebay/purchase</a></>,
                    'Scroll through your purchases — each row shows the full card title.',
                    'Take screenshots (⌘⇧4 on Mac, Print Screen on Windows).',
                    'Upload all screenshots below — multiple at once.',
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-ink font-mono text-[10px] text-paper">{i + 1}</span>
                      <span className="text-[13px] text-ink-2">{step}</span>
                    </li>
                  ))}
                </ol>
                <FileDropzone accept={accept} multiple files={files} onChange={setFiles} label={fileLabel} />
              </>
            )}

            {/* Bookmarklet */}
            {activeTab === 'ebay_bookmarklet' && (
              loading && bd ? (
                <div className="flex items-center gap-2 text-[13px] text-ink-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Processing your eBay purchases…
                </div>
              ) : (
                <>
                  <ol className="space-y-2">
                    {[
                      <><a href="/bookmarklet-install.html" target="_blank" rel="noreferrer" className="font-medium text-accent underline underline-offset-2">Open the bookmarklet installer</a> and drag <strong>Import from eBay</strong> to your bookmarks bar.</>,
                      <>Or click <strong>Copy bookmarklet</strong> below and paste the URL into a new bookmark.</>,
                      <>On <a href="https://ebay.com/mye/myebay/purchase" target="_blank" rel="noreferrer" className="text-accent underline underline-offset-2">ebay.com/mye/myebay/purchase</a>, click the bookmark — you&apos;ll return here automatically.</>,
                    ].map((step, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-ink font-mono text-[10px] text-paper">{i + 1}</span>
                        <span className="text-[13px] text-ink-2">{step}</span>
                      </li>
                    ))}
                  </ol>
                  <div className="flex flex-wrap gap-3">
                    <a href="/bookmarklet-install.html" target="_blank" rel="noreferrer"
                      className="inline-flex h-9 items-center gap-2 rounded-md bg-ink px-4 text-[13px] font-medium text-paper hover:bg-ink/90">
                      Open installer
                    </a>
                    <button type="button" onClick={copyBookmarklet} disabled={!bookmarkletCode}
                      className="inline-flex h-9 items-center gap-2 rounded border border-rule px-4 text-[13px] font-medium text-ink hover:bg-surface-2 disabled:opacity-40">
                      {copied ? '✓ Copied' : 'Copy bookmarklet'}
                    </button>
                  </div>
                  {bookmarkletPortMismatch && (
                    <p className="rounded border border-warn/30 bg-warn/5 px-3 py-2 font-mono text-[11px] text-warn">
                      Re-copy the bookmarklet from this page ({window.location.origin}). An older copy may point at {bookmarkletAppUrl}.
                    </p>
                  )}
                </>
              )
            )}

            {/* Fanatics PDF */}
            {activeTab === 'fanatics_pdf' && (
              <>
                <ol className="space-y-2">
                  {[
                    <><a href="https://fanaticscollect.com/activity/orders/marketplace" target="_blank" rel="noreferrer" className="text-accent underline underline-offset-2">Go to Fanatics Collect → Orders</a>.</>,
                    <>Click the <strong>↓</strong> download button on each order — PDFs save automatically.</>,
                    'Upload all PDFs below at once.',
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-ink font-mono text-[10px] text-paper">{i + 1}</span>
                      <span className="text-[13px] text-ink-2">{step}</span>
                    </li>
                  ))}
                </ol>
                <FileDropzone accept=".pdf" multiple files={files} onChange={setFiles} label="PDFs" />
              </>
            )}

            {/* Paste */}
            {activeTab === 'paste' && (
              <textarea
                value={pasteText}
                onChange={e => setPasteText(e.target.value)}
                rows={10}
                placeholder="Paste order confirmation email text or any purchase list…"
                className="w-full rounded border border-rule bg-surface-2 px-4 py-3 text-[13px] text-ink placeholder:text-ink-3 outline-none focus:border-ink"
              />
            )}

            {error && (
              <p className="rounded border border-negative/30 bg-negative/5 px-3 py-2 font-mono text-[11px] text-negative">{error}</p>
            )}

            {activeTab !== 'ebay_bookmarklet' && (
              <button type="button" onClick={handleSubmit} disabled={loading}
                className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-5 text-[13px] font-medium text-paper hover:bg-ink/90 disabled:opacity-50">
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                {loading ? 'Parsing…' : activeTab === 'paste' ? 'Parse text' : `Parse ${files.length > 0 ? files.length + ' ' : ''}${fileLabel.toLowerCase()}`}
              </button>
            )}
          </div>
        );
      })()}
    </section>
  );
}

export default function ImportPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center font-mono text-[11px] text-ink-3">Loading…</div>}>
      <ImportPageInner />
    </Suspense>
  );
}
