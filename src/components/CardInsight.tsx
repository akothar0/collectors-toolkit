'use client';

import { useEffect, useState } from 'react';
import { Eyebrow, Rule } from '@/components/editorial';

type CardInsightProps = {
  player: string;
  year: number | string | null;
  setName: string | null;
  cardNumber: string | null;
  parallel: string | null;
  gradingCompany: string | null;
  officialGrade: number | string | null;
  gradeDescription: string | null;
  popAtGrade: number | null;
  popHigher: number | null;
  cardId: string | null;
};

export function CardInsight(props: CardInsightProps) {
  const [insight, setInsight] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/scanner/insight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(props),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { insight?: string } | null) => {
        if (!cancelled && data?.insight) setInsight(data.insight);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.player, props.year, props.setName, props.officialGrade]);

  if (!loading && !insight) return null;

  return (
    <>
      <Rule />
      <div className="space-y-2">
        <Eyebrow>Card intel</Eyebrow>
        {loading ? (
          <InsightLoadingSkeleton />
        ) : (
          <p className="text-[13px] leading-relaxed text-ink-2">{insight}</p>
        )}
      </div>
    </>
  );
}

function InsightLoadingSkeleton() {
  return (
    <div className="space-y-2 pt-1">
      <div className="h-2.5 w-full animate-pulse rounded bg-surface-2" />
      <div className="h-2.5 w-[92%] animate-pulse rounded bg-surface-2" />
      <div className="h-2.5 w-[78%] animate-pulse rounded bg-surface-2" />
    </div>
  );
}
