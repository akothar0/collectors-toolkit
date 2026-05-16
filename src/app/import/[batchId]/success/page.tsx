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
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-slate-950">
            {saved} {saved === 1 ? 'card' : 'cards'} added
          </h1>
          <p className="mt-3 text-base text-slate-500">
            {saved > 0
              ? 'Your import is complete. The cards are now in your collection.'
              : 'No cards were saved — all rows were deselected or could not be matched.'}
          </p>
        </div>
        <div className="flex justify-center gap-3">
          <Link
            href="/collection"
            className="rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            View Collection
          </Link>
          <Link
            href="/import"
            className="rounded-full border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
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
    <Suspense fallback={<div className="p-8 text-sm text-slate-500">Loading…</div>}>
      <SuccessContent searchParams={searchParams} />
    </Suspense>
  );
}
