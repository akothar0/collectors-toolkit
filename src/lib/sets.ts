export type SetListItem = {
  id: string;
  name: string;
  year: number | null;
  sport: string | null;
  totalCards: number;
  cardsOwned: number;
  percent: number;
};

export type SetProgressDetail = {
  set: {
    id: string;
    name: string;
    year: number | null;
    sport: string | null;
    totalCards: number;
  };
  cardsOwned: number;
  cardChecklist: Record<string, boolean>;
};

export function countOwned(checklist: Record<string, boolean>) {
  return Object.values(checklist).filter(Boolean).length;
}

export function setPercent(cardsOwned: number, totalCards: number) {
  if (totalCards <= 0) return 0;
  return Math.round((cardsOwned / totalCards) * 100);
}
