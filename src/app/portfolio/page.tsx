'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useCallback, useEffect, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { FetchErrorBanner } from '@/components/fetch-error-banner';
import { Eyebrow, Rule, StatCell, StatStrip } from '@/components/editorial';
import { Slab, type SlabHolding } from '@/components/Slab';
import { formatDateLabel, formatGradeBadge, formatPrice } from '@/lib/collection-presenter';
import { readJsonResponse } from '@/lib/http-json';
import type { PortfolioSummary } from '@/lib/portfolio';

const SPORT_TINTS: Record<string, string> = {
  NBA: '#0c2340', NFL: '#8b1a1a', MLB: '#1a3a1a', WNBA: '#b8860b',
};

const CHART_INK = '#14110d';
const CHART_RULE = '#e4e0d5';
const CHART_INK3 = '#8a867b';

export default function PortfolioPage() {
  const [data, setData]     = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/portfolio');
      const payload = await readJsonResponse<PortfolioSummary & { error?: string }>(res);
      if (!res.ok) throw new Error(payload.error ?? 'Unable to load portfolio.');
      setData(payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load portfolio.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (loading) {
    return (
      <section className="space-y-8">
        <div className="space-y-2">
          <div className="h-3 w-20 animate-pulse rounded bg-rule" />
          <div className="h-12 w-80 animate-pulse rounded bg-rule" />
        </div>
        <div className="flex animate-pulse rounded border border-rule bg-surface">
          {[...Array(4)].map((_, i) => <div key={i} className="flex-1 h-24" />)}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-64 animate-pulse rounded border border-rule bg-surface" />
          <div className="h-64 animate-pulse rounded border border-rule bg-surface" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="space-y-6">
        <Masthead />
        <FetchErrorBanner message={error} onRetry={() => void load()} />
      </section>
    );
  }

  if (!data || data.totalCards === 0) {
    return (
      <section className="space-y-8">
        <Masthead />
        <div className="py-24 text-center">
          <p className="font-serif italic text-[32px] text-ink-2">Nothing tracked yet.</p>
          <p className="mt-2 text-[14px] text-ink-3">Add cards with a purchase price to unlock portfolio stats.</p>
          <Link href="/collection/add" className="mt-6 inline-flex h-9 items-center gap-2 rounded-md bg-ink px-4 text-[13px] font-medium text-paper hover:bg-ink/90">
            Add a card
          </Link>
        </div>
      </section>
    );
  }

  const gainLabel = (data.unrealizedGain >= 0 ? '+' : '') + (formatPrice(data.unrealizedGain) ?? '—');
  const sportData = data.bySport.map(r => ({ name: r.sport, count: r.count }));
  const gradeData = data.byGrade.map(r => ({ name: r.grade == null ? 'Raw' : String(r.grade), count: r.count }));

  return (
    <section className="space-y-8">
      <Masthead />

      {/* Stat strip */}
      <StatStrip>
        <StatCell label="Total value"    value={formatPrice(data.totalCurrentValue) ?? '—'} italic />
        <StatCell label="Cost basis"     value={formatPrice(data.totalCostBasis)    ?? '—'} />
        <StatCell label="Unrealized P/L" value={gainLabel}
          delta={data.unrealizedGain}
          deltaPct={data.unrealizedGainPct ?? undefined} />
        <StatCell label="Cards"          value={String(data.totalCards)} />
      </StatStrip>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="By sport">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={sportData} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={CHART_RULE} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fontFamily: 'var(--font-geist-mono)', fill: CHART_INK3 }} />
              <YAxis type="category" dataKey="name" width={72} tick={{ fontSize: 10, fontFamily: 'var(--font-geist-mono)', fill: CHART_INK3 }} />
              <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e4e0d5', borderRadius: 4, fontSize: 12 }} />
              <Bar dataKey="count" fill={CHART_INK} radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="By grade">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={gradeData} margin={{ bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_RULE} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fontFamily: 'var(--font-geist-mono)', fill: CHART_INK3 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fontFamily: 'var(--font-geist-mono)', fill: CHART_INK3 }} />
              <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e4e0d5', borderRadius: 4, fontSize: 12 }} />
              <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                {gradeData.map(e => <Cell key={e.name} fill={CHART_INK} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Company breakdown */}
      {data.byCompany.length > 0 && (
        <div>
          <Eyebrow className="mb-3">By grading company</Eyebrow>
          <div className="rounded border border-rule bg-surface">
            {data.byCompany.map((row, i) => {
              const pct = data.totalCards > 0 ? Math.round((row.count / data.totalCards) * 100) : 0;
              return (
                <div key={row.company} className={`flex items-center justify-between gap-4 px-4 py-3 ${i < data.byCompany.length - 1 ? 'border-b border-rule-soft' : ''}`}>
                  <span className="text-[13px] text-ink">{row.company}</span>
                  <span className="font-mono text-[11px] text-ink-3">{row.count} · {pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top holdings + recent */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <div className="flex items-baseline justify-between mb-3">
            <Eyebrow>Top holdings</Eyebrow>
            <Link href="/collection" className="font-mono text-[10px] text-ink-3 hover:text-ink">View all →</Link>
          </div>
          <Rule />
          {data.topCards.map((card, i) => {
            const grade = formatGradeBadge(card.grade != null ? 'graded' : 'raw', card.grade, null);
            const slab: SlabHolding = {
              player: card.player, year: 2020, set: '',
              grade, tint: '#2d2e34',
            };
            return (
              <Link key={card.id} href={`/collection/${card.id}` as Route}
                className="-mx-2 flex items-center gap-3 border-b border-rule-soft px-2 py-2.5 hover:bg-surface-2">
                <span className="w-4 shrink-0 font-mono text-[10px] text-ink-4">{i + 1}</span>
                <Slab holding={slab} width={28} height={42} showLabel={false} flavor="light" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-serif italic text-[14px] text-ink">{card.player}</p>
                  <p className="font-mono text-[10px] text-ink-3">{grade}</p>
                </div>
                <p className="font-serif italic text-[14px] text-ink">
                  {formatPrice(card.displayValue) ?? '—'}
                  {card.valueLabel ? <span className="font-mono text-[10px] text-ink-3 ml-1">{card.valueLabel}</span> : null}
                </p>
              </Link>
            );
          })}
        </div>

        <div>
          <Eyebrow className="mb-3">Recent additions</Eyebrow>
          <Rule />
          {data.recentCards.map(card => (
            <Link key={card.id} href={`/collection/${card.id}` as Route}
              className="-mx-2 flex items-center justify-between gap-3 border-b border-rule-soft px-2 py-2.5 hover:bg-surface-2">
              <div>
                <p className="font-serif italic text-[14px] text-ink">{card.player}</p>
                <p className="font-mono text-[10px] text-ink-3">
                  {formatGradeBadge(card.grade != null ? 'graded' : 'raw', card.grade, null)}
                </p>
              </div>
              <span className="font-mono text-[10px] text-ink-3">{formatDateLabel(card.createdAt)}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function Masthead() {
  return (
    <div>
      <Eyebrow>Portfolio</Eyebrow>
      <h1 className="mt-1.5 font-serif italic text-[48px] leading-none tracking-tight text-ink">
        What you have, <span className="text-accent">at a glance.</span>
      </h1>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded border border-rule bg-surface p-5">
      <Eyebrow className="mb-4">{title}</Eyebrow>
      {children}
    </div>
  );
}
