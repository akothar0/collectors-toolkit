export type GraderConfidence = 'low' | 'medium' | 'high';
export type GradingCompanyPrediction = 'PSA' | 'BGS' | 'CGC';

export type GradeResult = {
  sessionId: string;
  frontImageUrl: string | null;
  backImageUrl: string | null;
  imageCount: number;
  overallGrade: number;
  centering: number;
  corners: number;
  edges: number;
  surface: number;
  psaPrediction: number;
  bgsPrediction: number;
  cgcPrediction: number;
  submissionCompany: GradingCompanyPrediction | null;
  submissionRecommended: boolean;
  submissionRoiNotes: string;
  conditionNotes: string;
  confidence: GraderConfidence;
  error?: string;
};

export const GRADE_LIMIT = 10;
