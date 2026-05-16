export type CertLookupSource = 'psa_api' | 'beckett_scrape' | 'sgc_scrape' | 'cardgrade_io';

export type CertSubGrades = {
  centering?: number;
  corners?: number;
  edges?: number;
  surface?: number;
};

export type CertLookupResult = {
  certNumber: string;
  player: string;
  year: number | null;
  setName: string | null;
  cardNumber: string | null;
  parallel: string | null;
  grade: number | null;
  gradeDescription: string | null;
  qualifierCode?: string | null;
  autographGrade?: number | null;
  subGrades?: CertSubGrades;
  popAtGrade?: number | null;
  popWithQualifier?: number | null;
  popHigher?: number | null;
  isDualCert?: boolean;
  psaSpecId?: string | null;
  sport?: string | null;
  manufacturer?: string | null;
  source: CertLookupSource;
  raw: unknown;
};
