import type { CollectionCardItem } from '@/lib/collection';
import { displayPlayer } from '@/lib/collection-presenter';

export type PortfolioSummary = {
  totalCards: number;
  totalCostBasis: number;
  totalCurrentValue: number;
  unrealizedGain: number;
  unrealizedGainPct: number | null;
  bySport: { sport: string; count: number }[];
  byGrade: { grade: number | null; count: number }[];
  byCompany: { company: string; count: number }[];
  topCards: PortfolioCardRow[];
  recentCards: PortfolioRecentRow[];
  scanCount: number;
  gradeSessionCount: number;
};

export type PortfolioCardRow = {
  id: string;
  player: string;
  grade: number | null;
  currentValue: number | null;
  purchasePrice: number | null;
  displayValue: number | null;
  valueLabel: string | null;
};

export type PortfolioRecentRow = {
  id: string;
  player: string;
  grade: number | null;
  createdAt: string;
};

function cardValue(row: CollectionCardItem) {
  if (row.currentValue != null && Number.isFinite(row.currentValue)) {
    return row.currentValue;
  }
  if (row.purchasePrice != null && Number.isFinite(row.purchasePrice)) {
    return row.purchasePrice;
  }
  return 0;
}

function sortValueForTop(row: CollectionCardItem) {
  if (row.currentValue != null && Number.isFinite(row.currentValue)) {
    return row.currentValue;
  }
  if (row.purchasePrice != null && Number.isFinite(row.purchasePrice)) {
    return row.purchasePrice;
  }
  return -Infinity;
}

export function buildPortfolioSummary(
  cards: CollectionCardItem[],
  scanCount: number,
  gradeSessionCount: number
): PortfolioSummary {
  const totalCards = cards.length;
  const totalCostBasis = cards.reduce((sum, row) => sum + (row.purchasePrice ?? 0), 0);
  const totalCurrentValue = cards.reduce((sum, row) => sum + cardValue(row), 0);
  const unrealizedGain = totalCurrentValue - totalCostBasis;
  const unrealizedGainPct =
    totalCostBasis > 0 ? (unrealizedGain / totalCostBasis) * 100 : null;

  const sportMap = new Map<string, number>();
  for (const row of cards) {
    const sport = row.sport?.trim() || 'Unknown';
    sportMap.set(sport, (sportMap.get(sport) ?? 0) + 1);
  }
  const bySport = [...sportMap.entries()]
    .map(([sport, count]) => ({ sport, count }))
    .sort((a, b) => b.count - a.count);

  const gradeMap = new Map<string, { grade: number | null; count: number }>();
  for (const row of cards) {
    const key = row.grade == null ? 'null' : String(row.grade);
    const entry = gradeMap.get(key) ?? { grade: row.grade, count: 0 };
    entry.count += 1;
    gradeMap.set(key, entry);
  }
  const byGrade = [...gradeMap.values()].sort((a, b) => {
    if (a.grade == null && b.grade == null) return 0;
    if (a.grade == null) return 1;
    if (b.grade == null) return -1;
    return b.grade - a.grade;
  });

  const companyMap = new Map<string, number>();
  for (const row of cards) {
    const company =
      row.conditionType === 'raw'
        ? 'Raw'
        : row.gradingCompany?.trim() || 'Unknown';
    companyMap.set(company, (companyMap.get(company) ?? 0) + 1);
  }
  const byCompany = [...companyMap.entries()]
    .map(([company, count]) => ({ company, count }))
    .sort((a, b) => b.count - a.count);

  const topSorted = [...cards].sort((a, b) => sortValueForTop(b) - sortValueForTop(a));
  const topCards: PortfolioCardRow[] = topSorted.slice(0, 5).map((row) => {
    const hasCurrent =
      row.currentValue != null && Number.isFinite(row.currentValue);
    return {
      id: row.id,
      player: displayPlayer(row),
      grade: row.grade,
      currentValue: row.currentValue,
      purchasePrice: row.purchasePrice,
      displayValue: hasCurrent ? row.currentValue : row.purchasePrice,
      valueLabel: hasCurrent ? null : row.purchasePrice != null ? '(cost)' : null,
    };
  });

  const recentSorted = [...cards].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const recentCards: PortfolioRecentRow[] = recentSorted.slice(0, 5).map((row) => ({
    id: row.id,
    player: displayPlayer(row),
    grade: row.grade,
    createdAt: row.createdAt,
  }));

  return {
    totalCards,
    totalCostBasis,
    totalCurrentValue,
    unrealizedGain,
    unrealizedGainPct,
    bySport,
    byGrade,
    byCompany,
    topCards,
    recentCards,
    scanCount,
    gradeSessionCount,
  };
}
