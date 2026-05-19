import type { PriceReferenceFingerprintInput } from '@/lib/pricing/types';

export function buildPriceFingerprint(input: PriceReferenceFingerprintInput) {
  const parallelKey = input.parallelId?.trim() || 'base';
  const company = (input.gradingCompany ?? '').trim().toUpperCase() || 'none';
  const grade = input.grade != null && Number.isFinite(input.grade) ? String(input.grade) : 'none';

  return [
    'cardsight',
    input.cardsightCardId,
    parallelKey,
    input.conditionBucket,
    company,
    grade,
  ].join(':');
}

export function buildPriceQueryText(input: PriceReferenceFingerprintInput) {
  const parts = [
    input.year != null ? String(input.year) : null,
    input.setName,
    input.player,
    input.cardNumber ? `#${input.cardNumber}` : null,
    input.parallel,
    input.conditionBucket === 'graded'
      ? [input.gradingCompany, input.grade != null ? String(input.grade) : null].filter(Boolean).join(' ')
      : 'raw',
  ].filter(Boolean);

  return parts.join(' ').trim();
}
