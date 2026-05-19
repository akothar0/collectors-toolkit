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
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-900/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-brand-500">
          <History className="h-3.5 w-3.5" />
          Scanner history
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-4xl font-semibold tracking-tight text-ash-50">
              Slab scan history
            </h1>
            <p className="max-w-2xl text-ash-300">
              Every slab you scan is saved here. Reopen a scan to review details or save it to your collection.
            </p>
          </div>
          <Link
            href="/scanner"
            className="inline-flex rounded border border-ink-700 px-4 py-2 text-sm font-medium text-ash-200 hover:bg-ink-800"
          >
            New scan
          </Link>
        </div>
      </div>

      {scans.length === 0 ? (
        <div className="rounded border border-dashed border-ink-700 bg-ink-900 px-8 py-16 text-center ">
          <p className="text-lg font-medium text-ash-50">No scans yet. Upload a slab photo to get started.</p>
          <Link
            href="/scanner"
            className="mt-6 inline-flex rounded bg-brand-500 px-5 py-3 text-sm font-medium text-white hover:bg-brand-400"
          >
            Scan a slab
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-ink-800 overflow-hidden rounded border border-ink-700 bg-ink-900 ">
          {scans.map((scan) => (
            <li key={scan.scanId}>
              <Link
                href={`/scanner/history/${scan.scanId}`}
                className="flex flex-col gap-4 px-5 py-4 transition-colors hover:bg-ink-800 sm:flex-row sm:items-center"
              >
                <div className="h-20 w-16 shrink-0 overflow-hidden rounded bg-ink-800">
                  {scan.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={scan.imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-ash-500">No image</div>
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-ash-500">
                    {formatScanDate(scan.createdAt)}
                    {scan.gradingCompany ? ` · ${scan.gradingCompany}` : ''}
                    {scan.savedToCollection ? ' · Saved' : ''}
                  </p>
                  <p className="truncate font-medium text-ash-50">
                    {formatScanTitle(scan.player, scan.year, scan.setName)}
                  </p>
                  <p className="text-sm text-ash-400">
                    {scan.certNumber ? `Cert ${scan.certNumber}` : 'Cert pending'}
                    {scan.officialGrade !== null ? ` · Grade ${formatGradeValue(scan.officialGrade)}` : ''}
                  </p>
                </div>
                <span className="text-sm font-medium text-brand-500">View details</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
