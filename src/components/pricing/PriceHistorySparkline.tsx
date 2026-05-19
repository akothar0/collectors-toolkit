'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Eyebrow } from '@/components/editorial';
import { formatPrice } from '@/lib/collection-presenter';
import { readJsonResponse } from '@/lib/http-json';

type ObservationPoint = {
  observedAt: string;
  displayMedian: number | null;
  sampleSize: number;
};

type PriceHistorySparklineProps = {
  collectionCardId: string;
  purchaseDate?: string | null;
  purchasePrice?: number | null;
};

const CHART_INK = '#14110d';
const CHART_RULE = '#e4e0d5';
const CHART_INK3 = '#8a867b';

export function PriceHistorySparkline({
  collectionCardId,
  purchaseDate,
  purchasePrice,
}: PriceHistorySparklineProps) {
  const [points, setPoints] = useState<ObservationPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/collection/${collectionCardId}/price-history`);
        const data = await readJsonResponse<{ observations?: ObservationPoint[] }>(res);
        if (!cancelled) {
          setPoints(data.observations ?? []);
        }
      } catch {
        if (!cancelled) setPoints([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [collectionCardId]);

  const chartData = useMemo(() => {
    return points
      .filter((p) => p.displayMedian != null && p.sampleSize > 0)
      .map((p) => ({
        date: new Date(p.observedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        value: p.displayMedian as number,
        ts: Date.parse(p.observedAt),
      }));
  }, [points]);

  const trend = useMemo(() => {
    if (chartData.length < 2) return null;
    const first = chartData[0].value;
    const last = chartData[chartData.length - 1].value;
    if (first <= 0) return null;
    const pct = ((last - first) / first) * 100;
    return { pct, first, last };
  }, [chartData]);

  const purchaseChartPoint = useMemo(() => {
    if (purchasePrice == null || !purchaseDate) return null;
    const ts = Date.parse(purchaseDate);
    if (Number.isNaN(ts)) return null;
    const label = new Date(purchaseDate).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
    return { date: label, value: purchasePrice };
  }, [purchaseDate, purchasePrice]);

  if (loading) {
    return (
      <div className="rounded border border-rule bg-surface p-4">
        <Eyebrow>90-day market trend</Eyebrow>
        <p className="mt-2 text-[13px] text-ink-2">Loading history…</p>
      </div>
    );
  }

  if (chartData.length < 2) {
    return (
      <div className="rounded border border-rule bg-surface p-4">
        <Eyebrow>90-day market trend</Eyebrow>
        <p className="mt-2 text-[13px] text-ink-2">
          Refresh comps a few times over several days to build a price history chart.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded border border-rule bg-surface p-4">
      <div className="flex items-baseline justify-between gap-2">
        <Eyebrow>90-day market trend</Eyebrow>
        {trend ? (
          <p
            className={`font-mono text-[10px] ${trend.pct >= 0 ? 'text-positive' : 'text-negative'}`}
          >
            {trend.pct >= 0 ? '+' : ''}
            {trend.pct.toFixed(1)}% vs first observation
          </p>
        ) : null}
      </div>
      <div className="mt-3 h-36 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={CHART_RULE} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: CHART_INK3, fontSize: 9 }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fill: CHART_INK3, fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              width={44}
              tickFormatter={(v) => `$${v}`}
            />
            <Tooltip
              contentStyle={{
                background: '#faf8f4',
                border: `1px solid ${CHART_RULE}`,
                borderRadius: 6,
                fontSize: 11,
              }}
              formatter={(value) => [formatPrice(Number(value)), 'Median']}
            />
            <Line type="monotone" dataKey="value" stroke={CHART_INK} strokeWidth={2} dot={false} />
            {purchaseChartPoint ? (
              <ReferenceDot
                x={purchaseChartPoint.date}
                y={purchaseChartPoint.value}
                r={5}
                fill="#b8860b"
                stroke={CHART_INK}
                label={{
                  value: `Paid ${formatPrice(purchaseChartPoint.value)}`,
                  position: 'top',
                  fill: CHART_INK3,
                  fontSize: 9,
                }}
              />
            ) : null}
          </LineChart>
        </ResponsiveContainer>
      </div>
      {purchasePrice != null ? (
        <p className="mt-2 font-mono text-[10px] text-ink-3">
          Gold dot: your purchase at {formatPrice(purchasePrice)}
          {purchaseDate ? ` on ${new Date(purchaseDate).toLocaleDateString()}` : ''}
        </p>
      ) : null}
    </div>
  );
}
