'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { ChartColumnIncreasing, Plus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { FetchErrorBanner } from '@/components/fetch-error-banner';
import {
  formatDateLabel,
  formatGradeBadge,
  formatPrice,
} from '@/lib/collection-presenter';
import { readJsonResponse } from '@/lib/http-json';
import type { PortfolioSummary } from '@/lib/portfolio';

function StatCard({
  label,
  value,
  subValue,
  valueClassName,
}: {
  label: string;
  value: string;
  subValue?: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={`mt-3 text-2xl font-semibold tracking-tight md:text-3xl ${valueClassName ?? 'text-slate-950'}`}>
        {value}
      </p>
      {subValue ? <p className="mt-1 text-sm text-slate-500">{subValue}</p> : null}
    </div>
  );
}

function PortfolioSkeleton() {
  return (
    <section className="space-y-8">
      <div className="h-32 animate-pulse rounded-3xl bg-slate-100" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-64 animate-pulse rounded-[1.75rem] bg-slate-100" />
        <div className="h-64 animate-pulse rounded-[1.75rem] bg-slate-100" />
      </div>
    </section>
  );
}

function gainClassName(gain: number) {
  if (gain > 0) return 'text-emerald-600';
  if (gain < 0) return 'text-rose-600';
  return 'text-slate-500';
}

export default function PortfolioPage() {
  const [data, setData] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/portfolio');
      const payload = await readJsonResponse<PortfolioSummary & { error?: string }>(response);
      if (!response.ok) throw new Error(payload.error ?? 'Unable to load portfolio.');
      setData(payload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load portfolio.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <PortfolioSkeleton />;
  }

  if (error) {
    return (
      <section className="space-y-6">
        <PortfolioHeader />
        <FetchErrorBanner message={error} onRetry={() => void load()} />
      </section>
    );
  }

  if (!data || data.totalCards === 0) {
    return (
      <section className="space-y-8">
        <PortfolioHeader />
        <div className="rounded-[1.75rem] border border-dashed border-slate-200 bg-white px-8 py-16 text-center shadow-soft">
          <ChartColumnIncreasing className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-4 text-lg font-medium text-slate-950">Add cards to see your portfolio stats</p>
          <p className="mt-2 text-sm text-slate-600">
            Track purchase price and current value on collection cards to unlock cost basis and gain/loss.
          </p>
          <Link
            href={'/collection/add' as Route}
            className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-brand-600 px-5 py-3 text-sm font-medium text-white hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" />
            Add Card
          </Link>
        </div>
      </section>
    );
  }

  const gainFormatted = formatPrice(data.unrealizedGain) ?? '$0';
  const gainPct =
    data.unrealizedGainPct != null
      ? `${data.unrealizedGainPct >= 0 ? '+' : ''}${data.unrealizedGainPct.toFixed(1)}%`
      : null;

  const sportChartData = data.bySport.map((row) => ({
    name: row.sport,
    count: row.count,
  }));

  const gradeChartData = data.byGrade.map((row) => ({
    name: row.grade == null ? 'Raw' : String(row.grade),
    count: row.count,
  }));

  return (
    <section className="space-y-8">
      <PortfolioHeader />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Cards" value={String(data.totalCards)} />
        <StatCard label="Cost Basis" value={formatPrice(data.totalCostBasis) ?? '$0'} />
        <StatCard label="Current Value" value={formatPrice(data.totalCurrentValue) ?? '$0'} />
        <StatCard
          label="Gain / Loss"
          value={`${gainFormatted}${gainPct ? ` (${gainPct})` : ''}`}
          valueClassName={gainClassName(data.unrealizedGain)}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="overflow-x-auto rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-soft">
          <h2 className="text-base font-semibold text-slate-950">By Sport</h2>
          <div className="mt-4 h-64 min-w-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sportChartData} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#4f46e5" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="overflow-x-auto rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-soft">
          <h2 className="text-base font-semibold text-slate-950">By Grade</h2>
          <div className="mt-4 h-64 min-w-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gradeChartData} margin={{ bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {gradeChartData.map((entry) => (
                    <Cell key={entry.name} fill="#4f46e5" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-soft">
        <h2 className="text-base font-semibold text-slate-950">By Grading Company</h2>
        <ul className="mt-4 divide-y divide-slate-100">
          {data.byCompany.map((row) => {
            const pct = data.totalCards > 0 ? Math.round((row.count / data.totalCards) * 100) : 0;
            return (
              <li key={row.company} className="flex items-center justify-between gap-4 py-3 text-sm">
                <span className="font-medium text-slate-950">{row.company}</span>
                <span className="text-slate-600">
                  {row.count} · {pct}%
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-soft">
          <h2 className="text-base font-semibold text-slate-950">Most Valuable</h2>
          <ul className="mt-4 divide-y divide-slate-100">
            {data.topCards.map((card) => (
              <li key={card.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-slate-950">{card.player}</p>
                  <p className="text-slate-500">
                    {formatGradeBadge(card.grade != null ? 'graded' : 'raw', card.grade, null)}
                  </p>
                </div>
                <span className="font-medium text-slate-950">
                  {formatPrice(card.displayValue) ?? '—'}
                  {card.valueLabel ? ` ${card.valueLabel}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-soft">
          <h2 className="text-base font-semibold text-slate-950">Recent Additions</h2>
          <ul className="mt-4 divide-y divide-slate-100">
            {data.recentCards.map((card) => (
              <li key={card.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-slate-950">{card.player}</p>
                  <p className="text-slate-500">
                    {formatGradeBadge(card.grade != null ? 'graded' : 'raw', card.grade, null)}
                  </p>
                </div>
                <span className="text-slate-600">{formatDateLabel(card.createdAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function PortfolioHeader() {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium uppercase tracking-[0.24em] text-brand-600">Portfolio</p>
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
        Collection value
      </h1>
      <p className="max-w-2xl text-base leading-7 text-slate-600">
        Cost basis, current value, and breakdowns across your owned cards.
      </p>
    </div>
  );
}
