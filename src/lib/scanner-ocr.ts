import { normalizeCertNumber } from '@/lib/cert-number';
import type { OcrConfidence, OcrGradingCompany } from '@/lib/scanner';

export type ScannerOcrResponse = {
  certNumber: string | null;
  gradingCompany: OcrGradingCompany;
};

type OpenAIResponseLike = {
  output_text?: string | null;
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
      parsed?: unknown;
    }>;
  }>;
};

export function normalizeGradingCompany(value: unknown): OcrGradingCompany {
  const normalized = typeof value === 'string' ? value.trim().toUpperCase() : '';
  if (normalized === 'PSA' || normalized === 'BGS' || normalized === 'SGC' || normalized === 'CGC') {
    return normalized;
  }

  return 'UNKNOWN';
}

export function inferConfidence(certNumber: string | null, gradingCompany: OcrGradingCompany | null): OcrConfidence {
  if (certNumber && gradingCompany && gradingCompany !== 'UNKNOWN') {
    return 'high';
  }

  if (certNumber || (gradingCompany && gradingCompany !== 'UNKNOWN')) {
    return 'medium';
  }

  return 'low';
}

function collectStructuredText(response: OpenAIResponseLike) {
  const directText = response.output_text?.trim();
  if (directText) {
    return directText;
  }

  const parts: string[] = [];
  for (const output of response.output ?? []) {
    if (output.type !== 'message') {
      continue;
    }

    for (const content of output.content ?? []) {
      if (content.type !== 'output_text') {
        continue;
      }

      if (content.parsed && typeof content.parsed === 'object') {
        try {
          return JSON.stringify(content.parsed);
        } catch {
          // Fall through to plain text handling.
        }
      }

      if (typeof content.text === 'string' && content.text.trim()) {
        parts.push(content.text.trim());
      }
    }
  }

  const joined = parts.join('').trim();
  return joined || null;
}

export function parseScannerOcrResponse(response: unknown): ScannerOcrResponse | null {
  if (!response || typeof response !== 'object') {
    return null;
  }

  const text = collectStructuredText(response as OpenAIResponseLike);
  if (!text) {
    return null;
  }

  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    const rawCert =
      typeof parsed.certNumber === 'string' && parsed.certNumber.trim() ? parsed.certNumber.trim() : null;

    return {
      certNumber: normalizeCertNumber(rawCert),
      gradingCompany: normalizeGradingCompany(parsed.gradingCompany),
    };
  } catch (error) {
    console.error('Unable to parse OpenAI OCR response', {
      error: error instanceof Error ? error.message : String(error),
      text,
    });
    return null;
  }
}

