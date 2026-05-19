import { auth } from '@clerk/nextjs/server';
import { Gauge } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { listRawGradeSessionsForUser } from '@/lib/grader-db';
import { getOrCreateUserId } from '@/lib/users';

function formatSessionDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatGrade(grade: number | null) {
  if (grade == null || !Number.isFinite(grade)) return '—';
  return grade % 1 === 0 ? String(Math.round(grade)) : grade.toFixed(1);
}

export default async function GraderHistoryPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in' as Route);
  }

  const supabaseUserId = await getOrCreateUserId(userId, null);
  const sessions = await listRawGradeSessionsForUser(supabaseUserId);

  return (
    <section className="space-y-8">
      <div className="space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-900/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-brand-500">
          <Gauge className="h-3.5 w-3.5" />
          Grader history
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <h1 className="font-serif italic text-[40px] leading-none tracking-tight text-ink">
              Raw grade sessions
            </h1>
            <p className="max-w-2xl text-ink-2">
              Every card you grade is saved here so you can revisit predictions and add winners to your collection.
            </p>
          </div>
          <Link
            href="/grader"
            className="inline-flex min-h-11 items-center rounded border border-rule px-4 py-2 text-sm font-medium text-ink hover:bg-surface-2"
          >
            Grade a card
          </Link>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="rounded border border-dashed border-rule bg-surface px-8 py-16 text-center ">
          <Gauge className="mx-auto h-12 w-12 text-ink-2" />
          <p className="mt-4 text-lg font-medium text-ink">No grades yet</p>
          <p className="mt-2 text-sm text-ink-2">Upload a raw card photo to get your first AI grade estimate.</p>
          <Link
            href="/grader"
            className="mt-6 inline-flex min-h-11 items-center rounded bg-ink px-5 py-3 text-sm font-medium text-white hover:bg-ink/90"
          >
            Grade a Card
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-rule-soft overflow-hidden rounded border border-rule bg-surface ">
          {sessions.map((session) => (
            <li key={session.sessionId}>
              <Link
                href={`/grader?session=${session.sessionId}` as Route}
                className="flex flex-col gap-4 px-5 py-4 transition-colors hover:bg-surface-2 sm:flex-row sm:items-center"
              >
                <div className="h-20 w-16 shrink-0 overflow-hidden rounded bg-surface-2">
                  {session.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={session.imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-ink-3">No image</div>
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-ink-3">
                    {formatSessionDate(session.createdAt)}
                    {session.savedToCollection ? ' · Saved' : ''}
                  </p>
                  <p className="font-medium text-ink">
                    PSA {formatGrade(session.psaPrediction ?? session.predictedGrade)}
                    {session.confidence ? ` · ${session.confidence} confidence` : ''}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
