import { isPlausibleCertNumber, normalizeCertNumber } from '@/lib/cert-number';
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

export function extractCertDigits(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return normalizeCertNumber(String(Math.trunc(value)));
  }

  if (typeof value === 'string' && value.trim()) {
    return normalizeCertNumber(value);
  }

  return null;
}

/**
 * OCR-only confidence before PSA validates the read.
 * High is assigned only after PSA lookup succeeds (see scan route).
 */
export function inferConfidence(certNumber: string | null, gradingCompany: OcrGradingCompany | null): OcrConfidence {
  if (gradingCompany === 'PSA' && isPlausibleCertNumber(certNumber)) {
    return 'medium';
  }

  if (certNumber || (gradingCompany && gradingCompany !== 'UNKNOWN')) {
    return 'low';
  }

  return 'low';
}

function readFromParsedObject(parsed: unknown): ScannerOcrResponse | null {
  if (!parsed || typeof parsed !== 'object') {
    return null;
  }

  const record = parsed as Record<string, unknown>;
  return {
    certNumber: extractCertDigits(record.certNumber),
    gradingCompany: normalizeGradingCompany(record.gradingCompany),
  };
}

function collectStructuredText(response: OpenAIResponseLike) {
  for (const output of response.output ?? []) {
    if (output.type !== 'message') {
      continue;
    }

    for (const content of output.content ?? []) {
      if (content.parsed) {
        const fromParsed = readFromParsedObject(content.parsed);
        if (fromParsed) {
          return JSON.stringify(fromParsed);
        }
      }
    }
  }

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
      if (content.type !== 'output_text' && content.type !== 'text') {
        continue;
      }

      if (typeof content.text === 'string' && content.text.trim()) {
        parts.push(content.text.trim());
      }
    }
  }

  return parts.join('').trim() || null;
}

export function parseScannerOcrResponse(response: unknown): ScannerOcrResponse | null {
  if (!response || typeof response !== 'object') {
    return null;
  }

  const payload = response as OpenAIResponseLike;

  for (const output of payload.output ?? []) {
    if (output.type !== 'message') {
      continue;
    }

    for (const content of output.content ?? []) {
      if (content.parsed) {
        const fromParsed = readFromParsedObject(content.parsed);
        if (fromParsed) {
          return fromParsed;
        }
      }
    }
  }

  const text = collectStructuredText(payload);
  if (!text) {
    return null;
  }

  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    return {
      certNumber: extractCertDigits(parsed.certNumber),
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
