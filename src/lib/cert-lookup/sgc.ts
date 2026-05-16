import { normalizeCertNumber } from '@/lib/cert-number';
import {
  delay,
  matchFirst,
  parseGradeNumber,
  parseYear,
  SCRAPE_DELAY_MS,
  scrapeHeaders,
} from '@/lib/cert-lookup/scrape-utils';
import type { CertLookupResult } from '@/lib/cert-lookup/types';

export function parseSGCLookupHtml(certNumber: string, html: string): CertLookupResult | null {
  const normalizedHtml = html.replace(/\s+/g, ' ');
  const lower = normalizedHtml.toLowerCase();

  if (
    lower.includes('no results') ||
    lower.includes('not found') ||
    lower.includes('invalid cert') ||
    lower.includes('could not find')
  ) {
    return null;
  }

  const player =
    matchFirst(normalizedHtml, [
      /(?:player|subject|card\s*name)[^>]*>([^<]{2,80})</i,
      /class="[^"]*player[^"]*"[^>]*>([^<]{2,80})</i,
    ]) ?? null;

  const setName =
    matchFirst(normalizedHtml, [
      /(?:set|brand|description)[^>]*>([^<]{2,120})</i,
    ]) ?? null;

  const cardNumber =
    matchFirst(normalizedHtml, [
      /(?:card\s*#|card\s*number)[^>]*>([^<]{1,40})</i,
    ]) ?? null;

  const yearText =
    matchFirst(normalizedHtml, [
      /(?:year)[^>]*>([^<]{4,12})</i,
      /\b(19|20)\d{2}\b/,
    ]) ?? null;

  const gradeText =
    matchFirst(normalizedHtml, [
      /(?:grade|sgc\s*grade)[^>]*>([^<]{2,40})</i,
      /SGC\s*(\d+(?:\.\d+)?)/i,
      /(\d+(?:\.\d+)?)\s*SGC/i,
    ]) ?? null;

  const grade = parseGradeNumber(gradeText);
  const year = parseYear(yearText ?? setName ?? '');

  if (!player && !setName && grade === null) {
    return null;
  }

  return {
    certNumber,
    player: player ?? 'Unknown',
    year,
    setName,
    cardNumber,
    parallel: null,
    grade,
    gradeDescription: gradeText,
    source: 'sgc_scrape',
    raw: { htmlLength: html.length },
  };
}

export async function lookupSGC(certNumber: string): Promise<CertLookupResult | null> {
  const normalized = normalizeCertNumber(certNumber);
  if (!normalized) {
    return null;
  }

  await delay(SCRAPE_DELAY_MS);

  try {
    const body = new URLSearchParams();
    body.set('cert', normalized);

    const response = await fetch('https://www.gosgc.com/cert-code-lookup', {
      method: 'POST',
      headers: {
        ...scrapeHeaders(),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
      redirect: 'follow',
    });

    if (!response.ok) {
      console.error('SGC cert lookup failed', {
        certNumber: normalized,
        status: response.status,
      });
      return null;
    }

    const html = await response.text();
    return parseSGCLookupHtml(normalized, html);
  } catch (error) {
    console.error('SGC cert lookup error', {
      certNumber: normalized,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
