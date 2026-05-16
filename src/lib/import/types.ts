export type ParsedImportItem = {
  rawTitle: string;
  rawPrice: number | null;
  rawDate: string | null;
  rawSource: string;
};

export type NormalizedImportItem = ParsedImportItem & {
  parsedPlayer: string | null;
  parsedYear: number | null;
  parsedSet: string | null;
  parsedCardNumber: string | null;
  parsedGrade: number | null;
  parsedCompany: 'PSA' | 'BGS' | 'SGC' | null;
  parsedParallel: string | null;
  parsedSerialNumber: number | null;
  parsedPrintRun: number | null;
  isRookie: boolean;
  isAutograph: boolean;
  parseConfidence: 'high' | 'medium' | 'low';
  cardId: string | null;
};

export type ImportBatchItem = NormalizedImportItem & {
  id: string;
  reviewStatus: 'pending' | 'confirmed' | 'skipped' | 'edited';
  collectionCardId: string | null;
};

export type ImportBatch = {
  id: string;
  source: string;
  status: string;
  totalParsed: number;
  totalMatched: number;
  totalSaved: number;
  createdAt: string;
  items: ImportBatchItem[];
};
