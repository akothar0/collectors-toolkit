import Link from 'next/link';

export function FeaturePage({
  title,
  description,
  bullets,
}: {
  title: string;
  description: string;
  bullets: string[];
}) {
  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-soft">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-brand-600">Week 1 scaffold</p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">{description}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/"
            className="rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
          >
            Back to dashboard
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {bullets.map((bullet) => (
          <div key={bullet} className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-soft">
            {bullet}
          </div>
        ))}
      </div>
    </section>
  );
}

