export const COLLECTION_LIST_LIMIT = 200;

export const SPORTS = [
  'Baseball',
  'Basketball',
  'Football',
  'Soccer',
  'Tennis',
  'Hockey',
  'Other',
] as const;

export type Sport = (typeof SPORTS)[number];

export const GRADING_COMPANIES = ['PSA', 'BGS', 'SGC', 'CGC', 'Other'] as const;
export type GradingCompany = (typeof GRADING_COMPANIES)[number];

export const PURCHASE_SOURCES = ['eBay', 'Fanatics', 'LCS', 'Trade', 'Gift', 'Other'] as const;
export type PurchaseSource = (typeof PURCHASE_SOURCES)[number];

export const GRADE_OPTIONS = [10, 9.5, 9, 8.5, 8, 7, 6, 5, 4, 3, 2, 1] as const;
export const PROMINENT_GRADES = [10, 9.5, 9] as const;

export type CollectionSortBy = 'created_at' | 'player' | 'grade' | 'value';
export type CollectionSortDir = 'asc' | 'desc';

export type CollectionListFilters = {
  sport?: string;
  gradingCompany?: string;
  conditionType?: 'raw' | 'graded';
  minGrade?: number;
  maxGrade?: number;
  search?: string;
  sortBy?: CollectionSortBy;
  sortDir?: CollectionSortDir;
};

export type CollectionCardItem = {
  id: string;
  frontImageUrl: string | null;
  player: string | null;
  year: number | null;
  setName: string | null;
  parallel: string | null;
  cardNumber: string | null;
  sport: string | null;
  conditionType: string;
  grade: number | null;
  gradingCompany: string | null;
  certNumber: string | null;
  purchasePrice: number | null;
  purchaseDate: string | null;
  currentValue: number | null;
  valueSource?: string | null;
  marketPriceSampleSize?: number | null;
  createdAt: string;
};

export type CardSearchResult = {
  id: string;
  player: string;
  year: number | null;
  set_name: string | null;
};

export type GraderSessionPrefill = {
  sessionId: string;
  frontImageUrl: string | null;
  subGrades: {
    centering?: number;
    corners?: number;
    edges?: number;
    surface?: number;
  } | null;
  conditionNotes: string | null;
  psaPrediction: number | null;
  bgsPrediction: number | null;
  cgcPrediction: number | null;
  imageCount: number;
};

export function buildCollectionQuery(filters: CollectionListFilters) {
  const params = new URLSearchParams();

  if (filters.sport && filters.sport !== 'All') {
    params.set('sport', filters.sport);
  }
  if (filters.gradingCompany && filters.gradingCompany !== 'All') {
    params.set('gradingCompany', filters.gradingCompany);
  }
  if (filters.conditionType) {
    params.set('conditionType', filters.conditionType);
  }
  if (filters.minGrade != null) {
    params.set('minGrade', String(filters.minGrade));
  }
  if (filters.maxGrade != null) {
    params.set('maxGrade', String(filters.maxGrade));
  }
  if (filters.search?.trim()) {
    params.set('search', filters.search.trim());
  }
  if (filters.sortBy) {
    params.set('sortBy', filters.sortBy);
  }
  if (filters.sortDir) {
    params.set('sortDir', filters.sortDir);
  }

  return params.toString();
}

export function parseCollectionSortBy(value: string | null): CollectionSortBy {
  if (value === 'player' || value === 'grade' || value === 'value') {
    return value;
  }
  return 'created_at';
}

export function parseCollectionSortDir(value: string | null): CollectionSortDir {
  return value === 'asc' ? 'asc' : 'desc';
}

export function composeGraderPrefillNotes(prefill: GraderSessionPrefill, queryGrade?: string, queryCompany?: string) {
  const lines: string[] = [];

  if (prefill.conditionNotes?.trim()) {
    lines.push(prefill.conditionNotes.trim());
  }

  const estimates: string[] = [];
  if (prefill.psaPrediction != null) estimates.push(`PSA ${prefill.psaPrediction}`);
  if (prefill.bgsPrediction != null) estimates.push(`BGS ${prefill.bgsPrediction}`);
  if (prefill.cgcPrediction != null) estimates.push(`CGC ${prefill.cgcPrediction}`);

  if (estimates.length > 0) {
    lines.push(`AI estimates: ${estimates.join(', ')} (not a slab grade).`);
  } else if (queryGrade && queryCompany) {
    lines.push(`AI estimate context: ${queryCompany} ${queryGrade} (not a slab grade).`);
  }

  return lines.join('\n\n');
}
