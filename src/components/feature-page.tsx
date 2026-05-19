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
      <div className="rounded border border-ink-700 bg-ink-900 p-8">
        <h1 className="text-3xl font-semibold tracking-tight text-ash-50 md:text-4xl">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-ash-300">{description}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded bg-brand-500 px-6 text-sm font-semibold text-white hover:bg-brand-400"
          >
            Back to dashboard
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {bullets.map((bullet) => (
          <div key={bullet} className="rounded border border-ink-700 bg-ink-900 p-5 text-sm text-ash-300">
            {bullet}
          </div>
        ))}
      </div>
    </section>
  );
}
