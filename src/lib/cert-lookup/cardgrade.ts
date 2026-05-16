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

export function parseCardGradeVerifyHtml(certNumber: string, html: string): CertLookupResult | null {
  const normalizedHtml = html.replace(/\s+/g, ' ');
  const lower = normalizedHtml.toLowerCase();

  if (
    lower.includes('not found') ||
    lower.includes('no cert') ||
    lower.includes('invalid cert') ||
    lower.includes('does not exist')
  ) {
    return null;
  }

  const player =
    matchFirst(normalizedHtml, [
      /(?:player|subject|card)[^>]*>([^<]{2,80})</i,
      /"player"\s*:\s*"([^"]{2,80})"/i,
    ]) ?? null;

  const setName =
    matchFirst(normalizedHtml, [
      /(?:set|brand|manufacturer)[^>]*>([^<]{2,120})</i,
      /"set"\s*:\s*"([^"]{2,120})"/i,
    ]) ?? null;

  const cardNumber =
    matchFirst(normalizedHtml, [
      /(?:card\s*#|cardNumber)[^>]*>([^<]{1,40})</i,
      /"cardNumber"\s*:\s*"([^"]{1,40})"/i,
    ]) ?? null;

  const gradeText =
    matchFirst(normalizedHtml, [
      /(?:grade)[^>]*>([^<]{2,40})</i,
      /"grade"\s*:\s*"([^"]{2,40})"/i,
    ]) ?? null;

  const yearText =
    matchFirst(normalizedHtml, [
      /(?:year)[^>]*>([^<]{4,12})</i,
      /"year"\s*:\s*"?(\d{4})"?/i,
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
    source: 'cardgrade_io',
    raw: { htmlLength: html.length },
  };
}

export async function lookupCardGradeFallback(certNumber: string): Promise<CertLookupResult | null> {
  const normalized = normalizeCertNumber(certNumber);
  if (!normalized) {
    return null;
  }

  await delay(SCRAPE_DELAY_MS);

  try {
    const response = await fetch(`https://www.cardgrade.io/verify/${encodeURIComponent(normalized)}`, {
      method: 'GET',
      headers: scrapeHeaders(),
      redirect: 'follow',
    });

    if (!response.ok) {
      console.error('CardGrade.io cert lookup failed', {
        certNumber: normalized,
        status: response.status,
      });
      return null;
    }

    const html = await response.text();
    return parseCardGradeVerifyHtml(normalized, html);
  } catch (error) {
    console.error('CardGrade.io cert lookup error', {
      certNumber: normalized,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
