export type OcrGradingCompany = 'PSA' | 'BGS' | 'SGC' | 'CGC' | 'UNKNOWN';
export type OcrConfidence = 'high' | 'medium' | 'low';

export type ScannerResult = {
  scanId: string;
  imageUrl: string;
  ocrCertNumber: string | null;
  ocrGradingCompany: OcrGradingCompany | null;
  ocrConfidence: OcrConfidence;
  certLookupSuccess: boolean;
  certNumber: string | null;
  gradingCompany: string | null;
  itemStatus: string | null;
  cardId: string | null;
  cardPlayer: string | null;
  cardYear: number | null;
  cardManufacturer: string | null;
  cardSport: string | null;
  cardSet: string | null;
  cardParallel: string | null;
  cardNumber: string | null;
  officialGrade: number | null;
  gradeDescription: string | null;
  qualifierCode: string | null;
  autographGrade: number | null;
  isDualCert: boolean;
  popAtGrade: number | null;
  popWithQualifier: number | null;
  popHigher: number | null;
  error?: string;
};

export type ManualCollectionInput = {
  cardId?: string | null;
  scanId?: string | null;
  imageUrl?: string | null;
  player?: string | null;
  year?: number | null;
  setName?: string | null;
  parallel?: string | null;
  cardNumber?: string | null;
  sport?: string | null;
  manufacturer?: string | null;
  gradingCompany?: string | null;
  certNumber?: string | null;
  grade?: number | null;
  gradeDescription?: string | null;
  qualifierCode?: string | null;
  autographGrade?: number | null;
  popAtGrade?: number | null;
  popHigher?: number | null;
  notes?: string | null;
  purchasePrice?: number | null;
  purchaseDate?: string | null;
};

