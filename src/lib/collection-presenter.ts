import type { CollectionCardItem } from '@/lib/collection';

export function displayPlayer(item: CollectionCardItem) {
  return item.player?.trim() || 'Unknown player';
}

export function displayYear(item: CollectionCardItem) {
  return item.year ?? null;
}

export function displaySetName(item: CollectionCardItem) {
  return item.setName?.trim() || null;
}

export function displayCardNumber(item: CollectionCardItem) {
  return item.cardNumber?.trim() || null;
}

export function formatGradeBadge(
  conditionType: string | null | undefined,
  grade: number | null | undefined,
  gradingCompany: string | null | undefined
) {
  if (conditionType === 'raw' || !grade) {
    return 'Raw';
  }

  const company = gradingCompany?.trim() || 'Graded';
  const formatted =
    grade % 1 === 0 ? String(Math.round(grade)) : grade.toFixed(1);

  return `${company} ${formatted}`;
}

export function formatPrice(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPlayerYearLine(player: string, year: number | null) {
  if (year) {
    return `${player} · ${year}`;
  }
  return player;
}

export function formatGainLoss(purchasePrice: number | null, currentValue: number | null) {
  if (purchasePrice == null || currentValue == null || !Number.isFinite(purchasePrice) || !Number.isFinite(currentValue)) {
    return null;
  }

  const delta = currentValue - purchasePrice;
  const percent = purchasePrice > 0 ? (delta / purchasePrice) * 100 : 0;

  return { delta, percent };
}

export function formatDateLabel(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
