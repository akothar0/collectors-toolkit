'use client';

import { Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { GradeProfitabilityTable } from '@/components/GradeProfitabilityTable';
import { Button, Eyebrow } from '@/components/editorial';
import { readJsonResponse } from '@/lib/http-json';
import type { GradeProfitabilityPayload, PsaFeeTier } from '@/lib/grading-roi';

type GradeProfitabilitySectionProps = {
  collectionCardId: string;
  initialRawPrice: number | null;
  hasPrediction: boolean;
};

const FEE_TIER_OPTIONS: Array<{ value: PsaFeeTier; label: string }> = [
  { value: 'economy', label: 'PSA Economy · $20' },
  { value: 'value', label: 'PSA Value · $50' },
  { value: 'regular', label: 'PSA Regular · $100' },
];

export function GradeProfitabilitySection({
  collectionCardId,
  initialRawPrice,
  hasPrediction,
}: GradeProfitabilitySectionProps) {
  const [rawPrice, setRawPrice] = useState(initialRawPrice != null ? String(initialRawPrice) : '');
  const [feeTier, setFeeTier] = useState<PsaFeeTier>('economy');
  const [payload, setPayload] = useState<GradeProfitabilityPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canCalculate = useMemo(() => {
    const parsed = Number.parseFloat(rawPrice);
    return hasPrediction && rawPrice.trim() !== '' && Number.isFinite(parsed);
  }, [hasPrediction, rawPrice]);

  async function handleCalculate() {
    const parsed = Number.parseFloat(rawPrice);
    if (!Number.isFinite(parsed)) {
      setError('Enter a raw price to calculate profitability.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/pricing/roi/${collectionCardId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawPrice: parsed, feeTier }),
      });
      const data = await readJsonResponse<GradeProfitabilityPayload & { error?: string }>(response);
      if (!response.ok) {
        throw new Error(data.error ?? 'Unable to calculate profitability.');
      }
      setPayload(data);
    } catch (roiError) {
      setPayload(null);
      setError(roiError instanceof Error ? roiError.message : 'Unable to calculate profitability.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 rounded border border-rule bg-surface p-4">
      <div>
        <Eyebrow>Grade profitability</Eyebrow>
        <p className="mt-2 font-serif italic text-[24px] leading-none text-ink">
          Is it worth grading?
        </p>
      </div>

      {!hasPrediction ? (
        <p className="text-[13px] leading-6 text-ink-2">
          Profitability requires a grader prediction first. Run this card through the grader to
          compare PSA outcomes against your raw price.
        </p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                Raw price
              </span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={rawPrice}
                onChange={(event) => setRawPrice(event.target.value)}
                className="mt-2 h-11 w-full rounded border border-rule bg-surface-2 px-4 text-sm text-ink outline-none focus:border-ink"
              />
            </label>
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                PSA fee
              </span>
              <select
                value={feeTier}
                onChange={(event) => setFeeTier(event.target.value as PsaFeeTier)}
                className="mt-2 h-11 min-w-[190px] rounded border border-rule bg-surface-2 px-4 text-sm text-ink outline-none focus:border-ink"
              >
                {FEE_TIER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <Button type="button" onClick={handleCalculate} disabled={!canCalculate || loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Calculate grading profit
          </Button>
        </>
      )}

      {error ? <p className="font-mono text-[11px] text-negative">{error}</p> : null}
      {payload ? <GradeProfitabilityTable payload={payload} /> : null}
    </div>
  );
}
