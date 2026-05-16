import type { GradeResult, GraderConfidence, GradingCompanyPrediction } from '@/lib/grader';

export const GRADING_SYSTEM_PROMPT = `You are an expert sports card grader with deep knowledge of the PSA, BGS, and CGC grading standards.`;

export function buildGradingUserPrompt(imageCount: number): string {
  return `Analyze the provided card image${imageCount > 1 ? 's' : ''} carefully. You are grading this sports trading card.

GRADING CRITERIA (examine each carefully):

CENTERING — measure border ratios top/bottom and left/right:
- PSA 10 / BGS 10: 55/45 or better on both axes
- PSA 9 / BGS 9: 60/40 or better
- PSA 8 / BGS 8: 65/35 or better
- PSA 7 / BGS 7: 70/30 or better
- Below 70/30: grade 6 or lower for centering

CORNERS — examine all 4 corners for wear, fraying, rounding, creases:
- 10: Perfectly sharp, no wear under any magnification
- 9: One barely visible nick or tiny wear point
- 8: Light wear on 1-2 corners
- 7: Noticeable wear on multiple corners, some fraying
- 6 and below: Heavy wear, significant fraying or creasing

EDGES — examine all 4 edges for nicks, chips, roughness:
- 10: Perfectly smooth, no defects
- 9: One very minor nick or rough spot
- 8: Light edge wear or very slight roughness
- 7: Multiple minor nicks, some roughness
- 6 and below: Significant nicks, chips, or roughness

SURFACE (front and back) — check for scratches, print lines, stains, creases, gloss loss:
- 10: Pristine, full original gloss, zero defects
- 9: One very minor flaw (tiny scratch, slight print line)
- 8: Light surface wear, minor scratches or slight gloss loss
- 7: Noticeable surface issues, multiple minor flaws
- 6 and below: Heavy surface wear, creases, stains

GRADING COMPANY SCALE DIFFERENCES:
- PSA: Reports whole numbers only (1-10). Overall grade = lowest sub-grade (PSA is strict on the weakest point).
- BGS: Reports in 0.5 increments (1.0-10.0). Averages sub-grades. Can award BGS 9.5 "Black Label" if all sub-grades are 9.5+. Slightly more lenient than PSA.
- CGC: Reports in 0.5 increments. Similar to PSA in strictness.

Return ONLY this JSON object, no other text:
{
  "overallGrade": number,
  "centering": number,
  "corners": number,
  "edges": number,
  "surface": number,
  "psaPrediction": number,
  "bgsPrediction": number,
  "cgcPrediction": number,
  "confidence": "low" | "medium" | "high",
  "conditionNotes": string,
  "submissionRecommended": boolean,
  "submissionCompany": "PSA" | "BGS" | "CGC" | null,
  "submissionRoiNotes": string
}

Rules:
- overallGrade: your synthesized estimate (can be decimal, e.g. 9.2)
- psaPrediction: whole number only (8, 9, 10 — not 8.5)
- bgsPrediction: 0.5 increments only (8.0, 8.5, 9.0, 9.5, 10.0)
- conditionNotes: 2-4 sentences describing SPECIFIC visible defects or strengths. Reference only what you can actually see. Do not fabricate defects.
- submissionCompany: which company gives the best grade for this card's profile; null if not recommended
- submissionRoiNotes: 1-2 sentences on cost-benefit. PSA economy ~$25/card, BGS ~$30, CGC ~$20. Only recommend if expected grade adds meaningful value.
- confidence: "low" if image quality prevents accurate assessment; explain in conditionNotes`;
}

export function parseGraderResponse(
  text: string | null
): Omit<GradeResult, 'sessionId' | 'frontImageUrl' | 'backImageUrl' | 'imageCount'> | null {
  if (!text) return null;
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    return {
      overallGrade: Number(parsed.overallGrade) || 0,
      centering: Number(parsed.centering) || 0,
      corners: Number(parsed.corners) || 0,
      edges: Number(parsed.edges) || 0,
      surface: Number(parsed.surface) || 0,
      psaPrediction: Number(parsed.psaPrediction) || 0,
      bgsPrediction: Number(parsed.bgsPrediction) || 0,
      cgcPrediction: Number(parsed.cgcPrediction) || 0,
      confidence: (parsed.confidence as GraderConfidence) || 'low',
      conditionNotes: typeof parsed.conditionNotes === 'string' ? parsed.conditionNotes : '',
      submissionRecommended: Boolean(parsed.submissionRecommended),
      submissionCompany: (parsed.submissionCompany as GradingCompanyPrediction | null) ?? null,
      submissionRoiNotes: typeof parsed.submissionRoiNotes === 'string' ? parsed.submissionRoiNotes : '',
    };
  } catch {
    return null;
  }
}
