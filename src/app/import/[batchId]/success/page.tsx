import Link from 'next/link';
import { Suspense } from 'react';

async function SuccessContent({ searchParams }: { searchParams: Promise<{ count?: string }> }) {
  const { count } = await searchParams;
  const saved = Number(count ?? 0);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-md space-y-6 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-4xl">
          ✓
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-ash-50">
            {saved} {saved === 1 ? 'card' : 'cards'} added
          </h1>
          <p className="mt-3 text-base text-ash-400">
            {saved > 0
              ? 'Your import is complete. The cards are now in your collection.'
              : 'No cards were saved — all rows were deselected or could not be matched.'}
          </p>
        </div>
        <div className="flex justify-center gap-3">
          <Link
            href="/collection"
            className="rounded bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-400"
          >
            View Collection
          </Link>
          <Link
            href="/import"
            className="rounded border border-ink-700 bg-ink-900 px-6 py-2.5 text-sm font-semibold text-ash-200 transition-colors hover:bg-ink-800"
          >
            Import More
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SuccessPage({ searchParams }: { searchParams: Promise<{ count?: string }> }) {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-ash-400">Loading…</div>}>
      <SuccessContent searchParams={searchParams} />
    </Suspense>
  );
}
