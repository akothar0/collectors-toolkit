'use client';

import { Eyebrow } from '@/components/editorial';
import type { GradeProfitabilityPayload } from '@/lib/grading-roi';
import { formatPrice } from '@/lib/collection-presenter';

type GradeProfitabilityTableProps = {
  payload: GradeProfitabilityPayload;
};

function formatProbability(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatCurrency(value: number | null) {
  return formatPrice(value) ?? '—';
}

export function GradeProfitabilityTable({ payload }: GradeProfitabilityTableProps) {
  const feeTaxPct = Math.round(payload.feeTaxEstimate * 100);

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded border border-rule">
        <table className="w-full border-collapse">
          <thead className="bg-surface-2">
            <tr className="text-left">
              <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                Predicted grade
              </th>
              <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                Current value
              </th>
              <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                Grading fee
              </th>
              <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                Break-even
              </th>
              <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                Your upside
              </th>
            </tr>
          </thead>
          <tbody>
            {payload.rows.map((row) => (
              <tr key={row.grade} className="border-t border-rule align-top">
                <td className="px-3 py-3">
                  <div className="font-serif italic text-[18px] leading-none text-ink">
                    PSA {row.grade}
                  </div>
                  <div className="mt-1 font-mono text-[10px] text-ink-3">
                    {formatProbability(row.probability)} chance
                  </div>
                </td>
                <td className="px-3 py-3 text-[13px] text-ink">
                  {row.status === 'ok' ? formatCurrency(row.gradedValue) : 'No recent sales'}
                  <div className="mt-1 font-mono text-[10px] text-ink-3">
                    {row.sampleSize} sale{row.sampleSize === 1 ? '' : 's'} · {row.confidenceLabel}
                  </div>
                </td>
                <td className="px-3 py-3 text-[13px] text-ink">
                  {formatCurrency(payload.gradingFee)}
                </td>
                <td className="px-3 py-3 text-[13px] text-ink">
                  {formatCurrency(row.breakEvenRawPrice)}
                </td>
                <td
                  className={`px-3 py-3 text-[13px] ${
                    row.upside != null && row.upside >= 0 ? 'text-positive' : 'text-negative'
                  }`}
                >
                  {formatCurrency(row.upside)}
                </td>
              </tr>
            ))}
            <tr className="border-t border-rule bg-surface-2">
              <td className="px-3 py-3">
                <Eyebrow>Expected value</Eyebrow>
              </td>
              <td className="px-3 py-3 font-serif italic text-[18px] leading-none text-ink">
                {formatCurrency(payload.expectedValue)}
              </td>
              <td className="px-3 py-3 font-mono text-[10px] text-ink-3">—</td>
              <td className="px-3 py-3 font-mono text-[10px] text-ink-3">—</td>
              <td
                className={`px-3 py-3 font-serif italic text-[18px] leading-none ${
                  payload.expectedUpside != null && payload.expectedUpside >= 0
                    ? 'text-positive'
                    : 'text-negative'
                }`}
              >
                {formatCurrency(payload.expectedUpside)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="font-mono text-[10px] text-ink-3">
        Break-even and upside include the selected PSA fee plus an estimated {feeTaxPct}% fee tax.
      </p>
    </div>
  );
}
