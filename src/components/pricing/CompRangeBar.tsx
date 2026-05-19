'use client';

import { formatPrice } from '@/lib/collection-presenter';

function RangeMarker({ medianPct }: { medianPct: number }) {
  return (
    <span
      className="absolute top-1/2 block h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-ink bg-paper"
      style={{ left: `${Math.min(100, Math.max(0, medianPct))}%` }}
    />
  );
}

type CompRangeBarProps = {
  min: number | null;
  median: number | null;
  max: number | null;
  compact?: boolean;
};

export function CompRangeBar({ min, median, max, compact }: CompRangeBarProps) {
  if (min == null || max == null || median == null || max <= min) {
    return null;
  }

  const span = max - min;
  const medianPct = span > 0 ? ((median - min) / span) * 100 : 50;
  const textSize = compact ? 'text-[9px]' : 'text-[10px]';
  const trackHeight = compact ? 'h-1' : 'h-1.5';

  return (
    <div className="space-y-2">
      <div className={`flex justify-between font-mono text-ink-3 ${textSize}`}>
        <span>LOW {formatPrice(min)}</span>
        <span className="text-ink">MEDIAN {formatPrice(median)}</span>
        <span>HIGH {formatPrice(max)}</span>
      </div>
      <div className={`relative w-full rounded-full bg-rule-soft ${trackHeight}`}>
          <RangeMarker medianPct={medianPct} />
      </div>
    </div>
  );
}
