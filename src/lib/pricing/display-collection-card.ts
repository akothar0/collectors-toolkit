import { assessPricingEligibility } from '@/lib/pricing/eligibility';
import {
  loadCollectionCardForPricing,
  type CollectionCardPricingRow,
} from '@/lib/pricing/refresh-collection-card';
import { loadLatestSnapshotForCollectionCard } from '@/lib/pricing/store';

export type CollectionCardPricingDisplayResult =
  | { status: 'collection_not_found' }
  | {
      status: 'unsupported_sport' | 'incomplete_identity';
      message: string;
      missingFields?: string[];
    }
  | { status: 'idle'; message: string }
  | {
      status: 'cached';
      snapshot: Record<string, unknown>;
      comparables: Record<string, unknown>[];
      referenceKey?: {
        condition_bucket: string;
        grading_company: string | null;
        grade: number | null;
      } | null;
    };

function eligibilityInputFromRow(row: CollectionCardPricingRow) {
  const catalog = row.cards;
  return {
    sport: row.sport ?? catalog?.sport ?? null,
    player: row.override_player ?? catalog?.player ?? null,
    year: row.override_year ?? catalog?.year ?? null,
    setName: row.override_set_name ?? catalog?.set_name ?? null,
    cardNumber: row.override_card_number ?? catalog?.card_number ?? null,
    conditionType: row.condition_type,
    gradingCompany: row.grading_company,
    grade: row.grade != null ? Number(row.grade) : null,
  };
}

export async function getCollectionCardPricingDisplay(
  collectionCardId: string,
  userId: string
): Promise<CollectionCardPricingDisplayResult> {
  const row = await loadCollectionCardForPricing(collectionCardId, userId);
  if (!row) {
    return { status: 'collection_not_found' };
  }

  const eligibility = assessPricingEligibility(eligibilityInputFromRow(row));
  if (!eligibility.ready) {
    return {
      status: eligibility.status,
      message: eligibility.message,
      missingFields: eligibility.missingFields,
    };
  }

  const cached = await loadLatestSnapshotForCollectionCard(collectionCardId);
  if (cached) {
    return {
      status: 'cached',
      snapshot: cached.snapshot,
      comparables: cached.comparables,
      referenceKey: cached.referenceKey ?? null,
    };
  }

  return {
    status: 'idle',
    message: 'Refresh comps to load CardSight sold prices.',
  };
}
