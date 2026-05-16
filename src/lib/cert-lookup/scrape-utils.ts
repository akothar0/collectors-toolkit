const SCRAPE_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

export const SCRAPE_DELAY_MS = 2000;

export function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function scrapeHeaders() {
  return {
    'User-Agent': SCRAPE_USER_AGENT,
    Accept: 'text/html,application/xhtml+xml',
    'Accept-Language': 'en-US,en;q=0.9',
  };
}

export function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"');
}

export function stripHtmlTags(value: string) {
  return decodeHtmlEntities(value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}

export function matchFirst(html: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]?.trim()) {
      return stripHtmlTags(match[1]);
    }
  }

  return null;
}

export function parseGradeNumber(value: string | null) {
  if (!value) {
    return null;
  }

  const match = value.match(/(\d+(?:\.\d+)?)/);
  if (!match) {
    return null;
  }

  const parsed = Number.parseFloat(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseYear(value: string | null) {
  if (!value) {
    return null;
  }

  const match = value.match(/\b(19|20)\d{2}\b/);
  if (!match) {
    return null;
  }

  return Number.parseInt(match[0], 10);
}
