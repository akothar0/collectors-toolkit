import type { CardSightListingType, CardSightPeriod, PricingRecord } from '@/lib/cardsight/types';

export type PriceQuery = {
  cardsightCardId: string;
  parallelId?: string | null;
  gradeId?: string | null;
  period?: CardSightPeriod;
  listingType?: CardSightListingType;
  limit?: number;
};

export type NormalizedComparable = {
  title: string;
  salePrice: number;
  saleDate: string | null;
  itemUrl: string | null;
  imageUrl: string | null;
  listingFormat: string | null;
  conditionLabel: string | null;
  gradingCompany: string | null;
  grade: number | null;
  parallelId: string | null;
  parallelName: string | null;
  source: string;
};

export type NormalizedPriceResult = {
  source: 'cardsight';
  sampleSize: number;
  avgSalePrice: number | null;
  medianSalePrice: number | null;
  minSalePrice: number | null;
  maxSalePrice: number | null;
  latestSaleAt: string | null;
  confidenceLabel: 'high' | 'medium' | 'low' | 'none';
  confidenceScore: number;
  valuationEligible: boolean;
  comparables: NormalizedComparable[];
  rawResponse: unknown;
  windowDays: number;
};

export type PriceReferenceFingerprintInput = {
  cardsightCardId: string;
  parallelId?: string | null;
  conditionBucket: 'raw' | 'graded';
  gradingCompany?: string | null;
  grade?: number | null;
  player?: string | null;
  year?: number | null;
  setName?: string | null;
  parallel?: string | null;
  cardNumber?: string | null;
};

export type FlatPricingRecord = PricingRecord & {
  gradingCompany?: string | null;
  grade?: number | null;
};
