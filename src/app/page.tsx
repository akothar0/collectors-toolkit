import { auth, currentUser } from '@clerk/nextjs/server';
import Link from 'next/link';
import { Camera, Plus } from 'lucide-react';
import type { Route } from 'next';
import { Eyebrow, Masthead, PageFooter, Rule, StatCell, StatStrip } from '@/components/editorial';
import { Slab } from '@/components/Slab';
import { HomeActions, WantListCheckboxes } from '@/components/home-actions';
import { formatPrice, formatDateLabel } from '@/lib/collection-presenter';
import { fetchPortfolioSummary } from '@/lib/portfolio-server';
import { getOrCreateUserId } from '@/lib/users';
import { createServiceClient } from '@/lib/supabase';
import type { WantListItem } from '@/lib/wantlist';
import type { PortfolioCardRow } from '@/lib/portfolio';

// ── Helpers ───────────────────────────────────────────────────────────────

function dayGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning,';
  if (h < 17) return 'Good afternoon,';
  return 'Good evening,';
}

function todayLabel() {
  return new Date()
    .toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
    .toUpperCase();
}

// ── Sub-components ────────────────────────────────────────────────────────

function ToolCard({ href, label, sub, shortcut }: {
  href: Route; label: string; sub: string; shortcut: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded border border-rule bg-surface px-4 py-3.5 hover:bg-surface-2"
    >
      <div>
        <div className="text-[13px] font-medium text-ink">{label}</div>
        <div className="mt-0.5 font-mono text-[10px] text-ink-3">{sub}</div>
      </div>
      <span className="rounded border border-rule px-1.5 py-px font-mono text-[10px] text-ink-3">{shortcut}</span>
    </Link>
  );
}

function HoldingRow({ card, rank, totalValue }: {
  card: PortfolioCardRow; rank: number; totalValue: number;
}) {
  const pct = totalValue > 0 && card.displayValue ? (card.displayValue / totalValue) * 100 : 0;
  return (
    <Link
      href={`/collection/${card.id}` as Route}
      className="-mx-2 flex items-center gap-3 rounded border-b border-rule-soft px-2 py-2.5 hover:bg-surface-2"
    >
      <span className="w-4 shrink-0 font-mono text-[10px] text-ink-4">{rank}</span>
      <Slab
        holding={{ player: card.player, year: 2020, set: '', grade: 'Raw', tint: '#2d2e34' }}
        width={28} height={42} showLabel={false}
      />
      <div className="min-w-0 flex-1">
        <div className="truncate font-serif italic text-[14px] text-ink">{card.player}</div>
        <div className="font-mono text-[10px] text-ink-3">
          {card.grade != null ? `Grade ${card.grade}` : 'Raw'}
          {card.valueLabel ? ` · ${card.valueLabel}` : ''}
        </div>
      </div>
      <div className="text-right">
        <div className="font-serif italic text-[14px] text-ink">{formatPrice(card.displayValue) ?? '—'}</div>
        <div className="mt-1 h-0.5 w-16 overflow-hidden rounded-full bg-rule">
          <div className="h-full rounded-full bg-ink-3" style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
      </div>
    </Link>
  );
}

function ActivityRow({ date, type, title }: { date: string; type: string; title: string }) {
  const typeColor =
    type === 'SCAN' ? 'text-accent' :
    type === 'GRADE' ? 'text-gold' :
    'text-ink-3';
  return (
    <div className="flex items-baseline gap-3 border-b border-rule-soft py-2">
      <span className="w-14 shrink-0 font-mono text-[10px] text-ink-3">{date}</span>
      <span className={`shrink-0 font-mono text-[10px] tracking-[0.12em] ${typeColor}`}>{type}</span>
      <span className="truncate text-[13px] text-ink-2">{title}</span>
    </div>
  );
}

function BitGrid({ total, owned }: { total: number; owned: number }) {
  const squares = Math.min(total, 120);
  return (
    <div className="flex flex-wrap gap-0.5">
      {Array.from({ length: squares }).map((_, i) => (
        <div
          key={i}
          className={`h-1 w-1 rounded-[1px] ${i < owned ? 'bg-ink' : 'bg-rule'}`}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────

export default async function Page() {
  const clerkReady = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim());

  if (!clerkReady) {
    return <LandingPage authReady={false} />;
  }

  const { userId } = await auth();
  if (!userId) {
    return <LandingPage authReady />;
  }

  const clerkUser = await currentUser();
  const firstName = clerkUser?.firstName ?? 'there';
  const email = clerkUser?.emailAddresses[0]?.emailAddress ?? '';
  const dbUserId = await getOrCreateUserId(userId, email);

  const [summary, wantList, topSet] = await Promise.all([
    fetchPortfolioSummary(dbUserId).catch(() => null),
    fetchWantList(dbUserId),
    fetchTopSet(dbUserId),
  ]);

  const totalCards = summary?.totalCards ?? 0;
  const totalValue = summary?.totalCurrentValue ?? 0;
  const costBasis = summary?.totalCostBasis ?? 0;
  const unrealizedGain = summary?.unrealizedGain ?? 0;
  const unrealizedGainPct = summary?.unrealizedGainPct ?? null;
  const topCards = summary?.topCards ?? [];
  const recentCards = summary?.recentCards ?? [];
  const plLabel = (unrealizedGain >= 0 ? '+' : '') + (formatPrice(unrealizedGain) ?? '—');

  if (totalCards === 0) {
    return (
      <section className="space-y-10">
        <Masthead eyebrow={todayLabel()} title={dayGreeting()} emphasis={`${firstName}.`} />
        <div className="py-24 text-center">
          <p className="font-serif italic text-[32px] leading-tight text-ink-2">
            Your collection is empty.
          </p>
          <p className="mt-2 text-[14px] text-ink-3">Capture your first card.</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/scanner"
              className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2.5 text-[13px] font-medium text-paper hover:bg-ink/90"
            >
              <Camera className="h-3.5 w-3.5" />
              Scan a slab
            </Link>
            <Link
              href="/collection/add"
              className="inline-flex items-center gap-2 rounded border border-rule px-4 py-2.5 text-[13px] font-medium text-ink hover:bg-surface-2"
            >
              <Plus className="h-3.5 w-3.5" />
              Add manually
            </Link>
          </div>
        </div>
        <PageFooter left="Collectors Toolkit" right="0 cards" />
      </section>
    );
  }

  return (
    <section className="space-y-10">
      {/* 1 · Masthead */}
      <Masthead eyebrow={todayLabel()} title={dayGreeting()} emphasis={`${firstName}.`} />

      {/* 2 · Stat strip */}
      <StatStrip>
        <StatCell label="Total value"    value={formatPrice(totalValue) ?? '—'} italic />
        <StatCell label="Unrealized P/L" value={plLabel} sub={unrealizedGainPct != null ? `${unrealizedGainPct >= 0 ? '+' : ''}${unrealizedGainPct.toFixed(1)}%` : undefined} />
        <StatCell label="Cost basis"     value={formatPrice(costBasis) ?? '—'} />
        <StatCell label="Cards"          value={String(totalCards)} />
      </StatStrip>

      {/* 3 · Tools rail */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <ToolCard href="/scanner"        label="Scan slab"      sub="PSA · BGS · SGC cert lookup"  shortcut="S" />
        <ToolCard href="/grader"         label="Grade raw"      sub="GPT-4o vision · sub-grades"   shortcut="G" />
        <ToolCard href="/collection/add" label="Add manually"   sub="Player + grade · ~30 sec"     shortcut="A" />
        <ToolCard href="/import"         label="Import a batch" sub="eBay · Fanatics · CSV"         shortcut="I" />
      </div>

      {/* 4 · Two-column main */}
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">

        {/* Left — holdings + activity */}
        <div className="space-y-8">
          {topCards.length > 0 && (
            <div>
              <div className="flex items-baseline justify-between">
                <Eyebrow>Top holdings</Eyebrow>
                <Link href="/collection" className="font-mono text-[10px] text-ink-3 hover:text-ink">View all →</Link>
              </div>
              <Rule className="mt-2" />
              {topCards.map((card, i) => (
                <HoldingRow key={card.id} card={card} rank={i + 1} totalValue={totalValue} />
              ))}
            </div>
          )}

          {recentCards.length > 0 && (
            <div>
              <Eyebrow>Recent activity</Eyebrow>
              <Rule className="mt-2" />
              {recentCards.map(card => (
                <ActivityRow
                  key={card.id}
                  date={formatDateLabel(card.createdAt)?.split(',')[0] ?? ''}
                  type="ADDED"
                  title={card.player}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right — want list + set progress */}
        <div className="space-y-6">
          {wantList.length > 0 && (
            <div>
              <div className="flex items-baseline justify-between">
                <Eyebrow>Hunting</Eyebrow>
                <Link href="/wantlist" className="font-mono text-[10px] text-ink-3 hover:text-ink">See all →</Link>
              </div>
              <Rule className="mt-2 mb-3" />
              <WantListCheckboxes items={wantList} />
            </div>
          )}

          {topSet && (
            <div>
              <Eyebrow>Building</Eyebrow>
              <Rule className="mt-2 mb-3" />
              <div className="rounded border border-rule bg-surface px-4 py-4">
                <div className="flex items-baseline justify-between">
                  <span className="font-serif italic text-[15px] text-ink">{topSet.name}</span>
                  <span className="font-mono text-[10px] text-ink-3">{topSet.owned}/{topSet.total}</span>
                </div>
                <div className="mt-3">
                  <BitGrid total={topSet.total} owned={topSet.owned} />
                </div>
                <div className="mt-2 font-mono text-[10px] text-ink-3">
                  {Math.round((topSet.owned / topSet.total) * 100)}% complete
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <PageFooter
        left={`Collectors Toolkit · ${totalCards} cards`}
        right={`Scans ${summary?.scanCount ?? 0} · Grades ${summary?.gradeSessionCount ?? 0}`}
      />
    </section>
  );
}

// ── Landing (signed-out) ──────────────────────────────────────────────────

function LandingPage({ authReady }: { authReady: boolean }) {
  return (
    <section className="space-y-16 py-8">
      <div className="max-w-2xl space-y-5">
        <Eyebrow>Collectors Toolkit</Eyebrow>
        <h1 className="font-serif text-[56px] leading-none tracking-[-0.03em] text-ink md:text-[72px]">
          Scan. Grade.<br />
          <span className="italic text-accent">Track.</span>
        </h1>
        <p className="text-[16px] leading-7 text-ink-2">
          AI tools for sports card collectors — scan graded slabs, estimate raw card grades,
          and own your collection.
        </p>
        <HomeActions authReady={authReady} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Scanner',    desc: 'Photograph a graded slab — cert number, grade, and pop data pulled instantly.' },
          { label: 'Grader',     desc: 'Upload raw card photos. Get PSA, BGS, and CGC estimates with sub-grades.' },
          { label: 'Collection', desc: 'Track owned, want-list, and set progress. Portfolio value always current.' },
        ].map(f => (
          <div key={f.label} className="rounded border border-rule bg-surface px-5 py-5">
            <Eyebrow>{f.label}</Eyebrow>
            <p className="mt-2 text-[13px] leading-6 text-ink-2">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Server data helpers ───────────────────────────────────────────────────

type WantListRow = {
  id: string; description: string; player: string | null; year: number | null;
  set_name: string | null; parallel: string | null; target_grade: number | null;
  target_price: number | null; notes: string | null; status: string;
  fulfilled_at: string | null; created_at: string;
};

async function fetchWantList(dbUserId: string): Promise<WantListItem[]> {
  try {
    const { data } = await createServiceClient()
      .from('want_list')
      .select('id, description, player, year, set_name, parallel, target_grade, target_price, notes, status, fulfilled_at, created_at')
      .eq('user_id', dbUserId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(5);

    return (data as WantListRow[] ?? []).map(r => ({
      id: r.id, description: r.description, player: r.player, year: r.year,
      setName: r.set_name, parallel: r.parallel, targetGrade: r.target_grade,
      targetPrice: r.target_price, notes: r.notes, status: r.status,
      fulfilledAt: r.fulfilled_at, createdAt: r.created_at,
    }));
  } catch {
    return [];
  }
}

type TopSet = { name: string; total: number; owned: number };

async function fetchTopSet(dbUserId: string): Promise<TopSet | null> {
  try {
    const supabase = createServiceClient();
    const [{ data: sets }, { data: progress }] = await Promise.all([
      supabase.from('card_sets').select('id, name, total_cards').gt('total_cards', 0).limit(20),
      supabase.from('collection_set_progress').select('set_id').eq('user_id', dbUserId).eq('owned', true),
    ]);

    if (!sets?.length) return null;

    const ownedCounts = new Map<string, number>();
    for (const row of (progress ?? []) as { set_id: string }[]) {
      ownedCounts.set(row.set_id, (ownedCounts.get(row.set_id) ?? 0) + 1);
    }

    let best: TopSet | null = null;
    for (const set of sets as { id: string; name: string; total_cards: number }[]) {
      const owned = ownedCounts.get(set.id) ?? 0;
      if (owned > 0 && (!best || owned > best.owned)) {
        best = { name: set.name, total: set.total_cards, owned };
      }
    }
    return best;
  } catch {
    return null;
  }
}
