import { auth } from '@clerk/nextjs/server';
import type { Route } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ScanResult } from '@/components/ScanResult';
import { getGradedScanForUser } from '@/lib/scanner-db';
import { getOrCreateUserId } from '@/lib/users';

type PageProps = {
  params: Promise<{ scanId: string }>;
};

export default async function ScannerHistoryDetailPage({ params }: PageProps) {
  const { userId } = await auth();
  const { scanId } = await params;

  if (!userId) {
    redirect('/sign-in' as Route);
  }

  const supabaseUserId = await getOrCreateUserId(userId, null);
  const scan = await getGradedScanForUser(supabaseUserId, scanId);

  if (!scan) {
    notFound();
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/scanner/history"
          className="text-sm font-medium text-accent hover:underline"
        >
          Back to history
        </Link>
        <Link
          href="/scanner"
          className="inline-flex rounded border border-rule px-4 py-2 text-sm font-medium text-ink hover:bg-surface-2"
        >
          New scan
        </Link>
      </div>
      <ScanResult scan={scan} readOnly={false} />
    </section>
  );
}
