import { assessWantListPricingEligibility } from '@/lib/pricing/eligibility';
import { loadWantListItemForPricing, type WantListPricingRow } from '@/lib/pricing/refresh-want-list-item';
import { loadLatestSnapshotForWantListItem } from '@/lib/pricing/store';

export type WantListPricingDisplayResult =
  | { status: 'not_found' }
  | {
      status: 'incomplete_identity';
      message: string;
      missingFields?: string[];
    }
  | { status: 'idle'; message: string }
  | {
      status: 'cached';
      snapshot: Record<string, unknown>;
      comparables: Record<string, unknown>[];
    };

export async function getWantListItemPricingDisplay(
  wantListId: string,
  userId: string
): Promise<WantListPricingDisplayResult> {
  const row = await loadWantListItemForPricing(wantListId, userId);
  if (!row) {
    return { status: 'not_found' };
  }

  const eligibility = assessWantListPricingEligibility({
    player: row.player,
    description: row.description,
    year: row.year,
    setName: row.set_name,
  });

  if (!eligibility.ready) {
    return {
      status: 'incomplete_identity',
      message: eligibility.message,
      missingFields: eligibility.missingFields,
    };
  }

  const cached = await loadLatestSnapshotForWantListItem(wantListId);
  if (cached) {
    return {
      status: 'cached',
      snapshot: cached.snapshot,
      comparables: cached.comparables,
    };
  }

  return {
    status: 'idle',
    message: 'Refresh comps to load CardSight sold prices.',
  };
}
