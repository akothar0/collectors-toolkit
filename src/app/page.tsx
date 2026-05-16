import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';
import { HomeActions } from '@/components/home-actions';

type AppRoute = '/' | '/scanner' | '/grader' | '/collection' | '/portfolio' | '/import';

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
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
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft transition-transform hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-[0_10px_30px_rgba(79,70,229,0.12)]"
    >
      <div className="text-base font-semibold text-slate-950">{title}</div>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </Link>
  );
}

export default async function Page() {
  const clerkReady = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim());

  if (!clerkReady) {
    return (
      <section className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div className="space-y-6">
          <span className="inline-flex rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700">
            Week 1 scaffold
          </span>
          <div className="space-y-4">
            <h1 className="max-w-3xl font-[family-name:var(--font-display)] text-5xl font-semibold tracking-tight text-slate-950 md:text-6xl">
              Scan. Grade. Track.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-600">
              Identify graded slabs, estimate raw card condition, and keep your collection organized in one place.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              'Graded card scanner with cert lookup',
              'AI raw card grader with sub-grades',
              'Collection, portfolio, and import workflows',
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-soft">
                {item}
              </div>
            ))}
          </div>

          <HomeActions authReady={false} />
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
          <div className="rounded-[1.5rem] bg-slate-950 p-6 text-white">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-300">Collectors Toolkit</p>
            <div className="mt-5 space-y-3">
              <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                <p className="text-sm text-slate-300">Scanner</p>
                <p className="mt-1 text-lg font-semibold">Cert lookup from a slab photo</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                <p className="text-sm text-slate-300">Grader</p>
                <p className="mt-1 text-lg font-semibold">PSA-style estimate with sub-grades</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                <p className="text-sm text-slate-300">Collection</p>
                <p className="mt-1 text-lg font-semibold">Track owned, sold, and want-list cards</p>
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
        <div className="space-y-6">
          <span className="inline-flex rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700">
            Week 1 scaffold
          </span>
          <div className="space-y-4">
            <h1 className="max-w-3xl font-[family-name:var(--font-display)] text-5xl font-semibold tracking-tight text-slate-950 md:text-6xl">
              Scan. Grade. Track.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-600">
              Identify graded slabs, estimate raw card condition, and keep your collection organized in one place.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              'Graded card scanner with cert lookup',
              'AI raw card grader with sub-grades',
              'Collection, portfolio, and import workflows',
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-soft">
                {item}
              </div>
            ))}
          </div>

          <HomeActions authReady />
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
          <div className="rounded-[1.5rem] bg-slate-950 p-6 text-white">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-300">Collectors Toolkit</p>
            <div className="mt-5 space-y-3">
              <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                <p className="text-sm text-slate-300">Scanner</p>
                <p className="mt-1 text-lg font-semibold">Cert lookup from a slab photo</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                <p className="text-sm text-slate-300">Grader</p>
                <p className="mt-1 text-lg font-semibold">PSA-style estimate with sub-grades</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                <p className="text-sm text-slate-300">Collection</p>
                <p className="mt-1 text-lg font-semibold">Track owned, sold, and want-list cards</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-soft">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-brand-600">Dashboard</p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
          Your collection overview
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
          The week 1 dashboard starts at zero and grows as you add scans, grades, imports, and collection entries.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Cards" value="0" />
        <StatCard label="Total Value" value="$0" />
        <StatCard label="Scans" value="0" />
        <StatCard label="Grade Sessions" value="0" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <QuickAction href="/scanner" title="Scan a Slab" description="Open the cert lookup flow for graded cards." />
        <QuickAction href="/grader" title="Grade a Card" description="Estimate a raw card's condition and submission value." />
        <QuickAction href="/collection" title="Add to Collection" description="Start tracking a card you own or just bought." />
        <QuickAction href="/import" title="Import Purchases" description="Parse eBay, Fanatics, or pasted purchase data." />
      </div>
    </section>
  );
}
