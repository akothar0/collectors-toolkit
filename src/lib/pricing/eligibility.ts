export const PRICING_SUPPORTED_SPORTS = ['Baseball', 'Basketball', 'Football'] as const;

export type PricingSupportedSport = (typeof PRICING_SUPPORTED_SPORTS)[number];

export type PricingEligibilityInput = {
  sport: string | null;
  player: string | null;
  year: number | null;
  setName: string | null;
  cardNumber?: string | null;
  conditionType: string;
  gradingCompany?: string | null;
  grade?: number | null;
};

export type PricingEligibilityReady = {
  ready: true;
  segment: PricingSupportedSport;
};

export type PricingEligibilityBlocked = {
  ready: false;
  status: 'unsupported_sport' | 'incomplete_identity';
  message: string;
  missingFields?: string[];
};

export type PricingEligibilityResult = PricingEligibilityReady | PricingEligibilityBlocked;

export function mapSportToCardSightSegment(sport: string | null | undefined): PricingSupportedSport | null {
  const normalized = sport?.trim().toLowerCase();
  if (!normalized) return null;

  for (const supported of PRICING_SUPPORTED_SPORTS) {
    if (supported.toLowerCase() === normalized) {
      return supported;
    }
  }

  return null;
}

export function assessPricingEligibility(input: PricingEligibilityInput): PricingEligibilityResult {
  const segment = mapSportToCardSightSegment(input.sport);
  const sportLabel = input.sport?.trim() || 'Unknown';

  if (input.sport?.trim() && !segment) {
    return {
      ready: false,
      status: 'unsupported_sport',
      message: `CardSight sold comps are available for baseball, basketball, and football only. This card is listed as ${sportLabel}.`,
    };
  }

  const missingFields: string[] = [];

  if (!segment) {
    missingFields.push('sport');
  }
  if (!input.player?.trim()) {
    missingFields.push('player');
  }
  if (input.year == null || !Number.isFinite(input.year)) {
    missingFields.push('year');
  }
  if (!input.setName?.trim()) {
    missingFields.push('set');
  }

  if (input.conditionType === 'graded') {
    if (!input.gradingCompany?.trim()) {
      missingFields.push('grading company');
    }
    if (input.grade == null || !Number.isFinite(Number(input.grade))) {
      missingFields.push('grade');
    }
  }

  if (missingFields.length > 0) {
    const fieldList = missingFields.join(', ');
    return {
      ready: false,
      status: 'incomplete_identity',
      message: `To load market comps, add: ${fieldList}.`,
      missingFields,
    };
  }

  return { ready: true, segment: segment! };
}

export function assessWantListPricingEligibility(input: {
  player: string | null;
  description: string;
  year: number | null;
  setName: string | null;
}): PricingEligibilityResult {
  const player = input.player?.trim() || input.description.trim();
  const missingFields: string[] = [];

  if (!player) {
    missingFields.push('player');
  }
  if (input.year == null || !Number.isFinite(input.year)) {
    missingFields.push('year');
  }
  if (!input.setName?.trim()) {
    missingFields.push('set');
  }

  if (missingFields.length > 0) {
    return {
      ready: false,
      status: 'incomplete_identity',
      message: `To load market comps, add: ${missingFields.join(', ')}.`,
      missingFields,
    };
  }

  return { ready: true, segment: 'Baseball' };
}
