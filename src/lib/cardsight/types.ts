export type CardSightListingType = 'auction' | 'fixed' | 'both';
export type CardSightPeriod = '7d' | '14d' | '2w' | '3m' | '1y' | 'all' | '90d';

export type PricingRecord = {
  title: string;
  price: number;
  date: string;
  source: string;
  listing_type: string;
  url?: string | null;
  image_url?: string | null;
  parallel_id?: string | null;
  parallel_name?: string | null;
};

export type PricingGradeGroup = {
  grade_id?: string;
  grade_value?: string | number;
  count?: number;
  records: PricingRecord[];
};

export type PricingCompanyGroup = {
  company_id?: string;
  company_name?: string;
  grades: PricingGradeGroup[];
};

export type PricingResponse = {
  card?: {
    id?: string;
    name?: string;
    number?: string;
    set?: { id?: string; name?: string; year?: number };
    release?: { id?: string; name?: string };
  };
  query?: Record<string, unknown>;
  raw?: { count?: number; records: PricingRecord[] };
  graded?: PricingCompanyGroup[];
  meta?: {
    total_records?: number;
    last_sale_date?: string | null;
    sources?: string[];
  };
};

export type BulkPricingResult = {
  card_id: string;
  success: boolean;
  data?: PricingResponse;
  error?: { message?: string; code?: string };
};

export type BulkPricingResponse = {
  meta?: { requested?: number; successful?: number; failed?: number };
  results: BulkPricingResult[];
};

export type CatalogCard = {
  id: string;
  name?: string;
  number?: string;
  year?: number;
  set?: { id?: string; name?: string; year?: number };
  release?: { id?: string; name?: string };
  manufacturer?: string;
  parallels?: { id?: string; name?: string }[];
};

export type CatalogCardsResponse = {
  cards?: CatalogCard[];
  data?: CatalogCard[];
  total_count?: number;
  skip?: number;
  take?: number;
};

export type CatalogParallelsResponse = {
  parallels?: CatalogParallel[];
  data?: CatalogParallel[];
  total_count?: number;
};

export type GradingCompaniesResponse = {
  companies?: GradingCompany[];
  data?: GradingCompany[];
  total?: number;
};

export type GradingTypesResponse = {
  types?: GradingType[];
  data?: GradingType[];
  total?: number;
};

export type GradingGradesResponse = {
  grades?: GradingGrade[];
  data?: GradingGrade[];
  total?: number;
};

export type CatalogParallel = {
  id: string;
  name?: string;
};

export type GradingCompany = {
  id: string;
  name: string;
  short_name?: string;
};

export type GradingGrade = {
  id: string;
  name?: string;
  value?: string | number;
  numeric_value?: number;
};

export type GradingType = {
  id: string;
  name?: string;
  grades?: GradingGrade[];
};
