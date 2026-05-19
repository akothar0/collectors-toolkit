import Link from 'next/link';
import { Suspense } from 'react';
import { Eyebrow } from '@/components/editorial';

async function SuccessContent({ searchParams }: { searchParams: Promise<{ count?: string }> }) {
  const { count } = await searchParams;
  const saved = Number(count ?? 0);

  return (
    <section className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-md space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-positive/30 bg-positive/10">
          <span className="font-serif italic text-[28px] text-positive">✓</span>
        </div>
        <div>
          <Eyebrow className="justify-center mb-2">Import complete</Eyebrow>
          <h1 className="font-serif italic text-[48px] leading-none tracking-tight text-ink">
            {saved} card{saved !== 1 ? 's' : ''} saved.
          </h1>
          <p className="mt-3 text-[15px] text-ink-2">
            {saved > 0
              ? "They're in your collection now."
              : 'No cards were saved — all rows were deselected or could not be matched.'}
          </p>
        </div>
        <div className="flex justify-center gap-3">
          <Link href="/collection"
            className="inline-flex h-10 items-center rounded-md bg-ink px-5 text-[13px] font-medium text-paper hover:bg-ink/90">
            View collection
          </Link>
          <Link href="/import"
            className="inline-flex h-10 items-center rounded border border-rule px-5 text-[13px] font-medium text-ink hover:bg-surface-2">
            Import more
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function SuccessPage({ searchParams }: { searchParams: Promise<{ count?: string }> }) {
  return (
    <Suspense fallback={<div className="py-12 text-center font-mono text-[11px] text-ink-3">Loading…</div>}>
      <SuccessContent searchParams={searchParams} />
    </Suspense>
  );
}
