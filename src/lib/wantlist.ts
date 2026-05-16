export type WantListItem = {
  id: string;
  description: string;
  player: string | null;
  year: number | null;
  setName: string | null;
  parallel: string | null;
  targetGrade: number | null;
  targetPrice: number | null;
  notes: string | null;
  status: string;
  fulfilledAt: string | null;
  createdAt: string;
};

export function buildWantListAddUrl(item: WantListItem) {
  const params = new URLSearchParams();
  if (item.player) params.set('player', item.player);
  if (item.year != null) params.set('year', String(item.year));
  if (item.setName) params.set('setName', item.setName);
  return `/collection/add?${params.toString()}`;
}
