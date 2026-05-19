#!/usr/bin/env node
/**
 * Smoke test: CardSight catalog search + pricing parse path.
 * Usage: node --env-file=.env.local scripts/verify-cardsight-pricing.mjs
 */
import { parseCatalogCardsResponse } from '../src/lib/cardsight/client.ts';

const key = process.env.CARDSIGHTAI_API_KEY?.trim();
if (!key) {
  console.error('CARDSIGHTAI_API_KEY is not set');
  process.exit(1);
}

const headers = { 'X-API-Key': key, Accept: 'application/json' };

const searchRes = await fetch(
  'https://api.cardsight.ai/v1/catalog/cards?name=Mike%20Trout&year=2011&take=3',
  { headers }
);
const searchBody = await searchRes.json();
const cards = parseCatalogCardsResponse(searchBody);

console.log('catalog search:', searchRes.status, 'cards:', cards.length);
if (cards.length === 0) {
  console.error('FAIL: parseCatalogCardsResponse returned no cards');
  process.exit(1);
}

const cardId = cards[0].id;
const pricingRes = await fetch(
  `https://api.cardsight.ai/v1/pricing/${cardId}?period=3m&limit=3`,
  { headers }
);
const pricingBody = await pricingRes.json();

console.log('pricing:', pricingRes.status, 'raw sales:', pricingBody.raw?.records?.length ?? 0);
if (!pricingRes.ok) {
  console.error('FAIL: pricing request failed');
  process.exit(1);
}

console.log('OK: CardSight catalog + pricing path verified');
