import { auth, currentUser } from '@clerk/nextjs/server';
import Link from 'next/link';
import { HomeActions } from '@/components/home-actions';
import { formatPrice } from '@/lib/collection-presenter';
import { fetchPortfolioSummary } from '@/lib/portfolio-server';
import { getOrCreateUserId } from '@/lib/users';

type AppRoute = '/' | '/scanner' | '/grader' | '/collection' | '/wantlist' | '/portfolio' | '/import' | '/sets';

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded border border-ink-700 bg-ink-900 p-5">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-ash-500">{label}</p>
      <p className="mt-3 tabular-nums text-3xl font-semibold tracking-tight text-ash-50">{value}</p>
    </div>
  );
}

function QuickAction({
  href,
  title,
  description,
}: {
  href: AppRoute;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="rounded border border-ink-700 bg-ink-900 p-5 hover:border-ink-600 hover:bg-ink-800"
    >
      <div className="text-sm font-semibold text-ash-50">{title}</div>
      <p className="mt-2 text-sm leading-6 text-ash-400">{description}</p>
    </Link>
  );
}

export default async function Page() {
  const clerkReady = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim());

  if (!clerkReady) {
    return (
      <section className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div className="space-y-8">
          <div className="space-y-4">
            <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-ash-50 md:text-6xl">
              Scan. Grade. Track.
            </h1>
            <p className="max-w-xl text-lg leading-8 text-ash-300">
              Scan slabs. Estimate raw cards. Own your collection.
            </p>
          </div>
          <HomeActions authReady={false} />
        </div>

        <div className="rounded border border-ink-700 bg-ink-900 p-6">
          <div className="rounded bg-ink-800 border border-ink-700 p-6">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-ash-500">Collectors Toolkit</p>
            <div className="mt-5 space-y-3">
              <div className="rounded border border-ink-700 bg-ink-900 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-ash-500">Scanner</p>
                <p className="mt-1 text-sm font-medium text-ash-100">Cert lookup from a slab photo</p>
              </div>
              <div className="rounded border border-ink-700 bg-ink-900 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-ash-500">Grader</p>
                <p className="mt-1 text-sm font-medium text-ash-100">PSA-style estimate with sub-grades</p>
              </div>
              <div className="rounded border border-ink-700 bg-ink-900 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-ash-500">Collection</p>
                <p className="mt-1 text-sm font-medium text-ash-100">Track owned, sold, and want-list cards</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const { userId } = await auth();

  if (!userId) {
    return (
      <section className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div className="space-y-8">
          <div className="space-y-4">
            <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-ash-50 md:text-6xl">
              Scan. Grade. Track.
            </h1>
            <p className="max-w-xl text-lg leading-8 text-ash-300">
              Scan slabs. Estimate raw cards. Own your collection.
            </p>
          </div>
          <HomeActions authReady />
        </div>

        <div className="rounded border border-ink-700 bg-ink-900 p-6">
          <div className="rounded bg-ink-800 border border-ink-700 p-6">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-ash-500">Collectors Toolkit</p>
            <div className="mt-5 space-y-3">
              <div className="rounded border border-ink-700 bg-ink-900 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-ash-500">Scanner</p>
                <p className="mt-1 text-sm font-medium text-ash-100">Cert lookup from a slab photo</p>
              </div>
              <div className="rounded border border-ink-700 bg-ink-900 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-ash-500">Grader</p>
                <p className="mt-1 text-sm font-medium text-ash-100">PSA-style estimate with sub-grades</p>
              </div>
              <div className="rounded border border-ink-700 bg-ink-900 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-ash-500">Collection</p>
                <p className="mt-1 text-sm font-medium text-ash-100">Track owned, sold, and want-list cards</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses[0]?.emailAddress ?? null;
  let stats = {
    totalCards: 0,
    totalCurrentValue: 0,
    totalCostBasis: 0,
    unrealizedGain: 0,
  };

  try {
    const dbUserId = await getOrCreateUserId(userId, email ?? '');
    const summary = await fetchPortfolioSummary(dbUserId);
    stats = {
      totalCards: summary.totalCards,
      totalCurrentValue: summary.totalCurrentValue,
      totalCostBasis: summary.totalCostBasis,
      unrealizedGain: summary.unrealizedGain,
    };
  } catch {
    // Dashboard still renders with zero stats if DB is unavailable.
  }

  const gainLossLabel = stats.unrealizedGain >= 0 ? `+${formatPrice(stats.unrealizedGain)}` : formatPrice(stats.unrealizedGain);

  return (
    <section className="space-y-8">
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-ash-500">Dashboard</p>
        <h1 className="text-3xl font-semibold tracking-tight text-ash-50 md:text-4xl">
          Your collection
        </h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Cards" value={String(stats.totalCards)} />
        <StatCard label="Portfolio value" value={formatPrice(stats.totalCurrentValue) ?? '—'} />
        <StatCard label="Total cost" value={formatPrice(stats.totalCostBasis) ?? '—'} />
        <StatCard label="Gain / Loss" value={gainLossLabel ?? '—'} />
      </div>

      <div>
        <p className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-ash-500">Quick actions</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <QuickAction href="/scanner" title="Scan a Slab" description="Photograph a graded slab and pull cert data." />
          <QuickAction href="/grader" title="Grade a Card" description="Estimate PSA, BGS, and CGC grades from photos." />
          <QuickAction href="/collection" title="Collection" description="Browse and manage your cards." />
          <QuickAction href="/portfolio" title="Portfolio" description="Track value, cost, and gain/loss over time." />
          <QuickAction href="/wantlist" title="Want List" description="Cards you're hunting — mark them found." />
          <QuickAction href="/import" title="Import" description="Bulk-import from eBay or Fanatics." />
        </div>
      </div>
    </section>
  );
}
