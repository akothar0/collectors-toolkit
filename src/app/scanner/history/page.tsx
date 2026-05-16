import { auth } from '@clerk/nextjs/server';
import { History } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { formatCatalogText, formatGradeValue } from '@/lib/scanner-presenter';
import { listGradedScansForUser } from '@/lib/scanner-db';
import { getOrCreateUserId } from '@/lib/users';

function formatScanDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatScanTitle(player: string | null, year: number | null, setName: string | null) {
  const parts = [
    year ? String(year) : null,
    player ? formatCatalogText(player) : null,
    setName ? formatCatalogText(setName) : null,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(' · ') : 'Unknown card';
}

export default async function ScannerHistoryPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in' as Route);
  }

  const supabaseUserId = await getOrCreateUserId(userId, null);
  const scans = await listGradedScansForUser(supabaseUserId);

  return (
    <section className="space-y-8">
      <div className="space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
          <History className="h-3.5 w-3.5" />
          Scanner history
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <h1 className="font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight text-slate-950">
              Slab scan history
            </h1>
            <p className="max-w-2xl text-slate-600">
              Every slab you scan is saved here. Reopen a scan to review details or save it to your collection.
            </p>
          </div>
          <Link
            href="/scanner"
            className="inline-flex rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            New scan
          </Link>
        </div>
      </div>

      {scans.length === 0 ? (
        <div className="rounded-[1.75rem] border border-dashed border-slate-200 bg-white px-8 py-16 text-center shadow-soft">
          <p className="text-lg font-medium text-slate-950">No scans yet. Upload a slab photo to get started.</p>
          <Link
            href="/scanner"
            className="mt-6 inline-flex rounded-full bg-brand-600 px-5 py-3 text-sm font-medium text-white hover:bg-brand-700"
          >
            Scan a slab
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-soft">
          {scans.map((scan) => (
            <li key={scan.scanId}>
              <Link
                href={`/scanner/history/${scan.scanId}`}
                className="flex flex-col gap-4 px-5 py-4 transition-colors hover:bg-slate-50 sm:flex-row sm:items-center"
              >
                <div className="h-20 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                  {scan.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={scan.imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-slate-400">No image</div>
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                    {formatScanDate(scan.createdAt)}
                    {scan.gradingCompany ? ` · ${scan.gradingCompany}` : ''}
                    {scan.savedToCollection ? ' · Saved' : ''}
                  </p>
                  <p className="truncate font-medium text-slate-950">
                    {formatScanTitle(scan.player, scan.year, scan.setName)}
                  </p>
                  <p className="text-sm text-slate-500">
                    {scan.certNumber ? `Cert ${scan.certNumber}` : 'Cert pending'}
                    {scan.officialGrade !== null ? ` · Grade ${formatGradeValue(scan.officialGrade)}` : ''}
                  </p>
                </div>
                <span className="text-sm font-medium text-brand-600">View details</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
