import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildIdentifyUserPrompt,
  extractStoredIdentifiedCard,
  normalizeIdentifiedCard,
  parseIdentifyResponse,
} from '../src/lib/grader-identify';

test('buildIdentifyUserPrompt asks for tiny-print inspection and cautious year inference', () => {
  const prompt = buildIdentifyUserPrompt(1);

  assert.match(prompt, /tiny corner card numbers/i);
  assert.match(prompt, /serial numbering like 091\/150/i);
  assert.match(prompt, /including the release year if it is visible or strongly implied/i);
  assert.match(prompt, /you may infer it with lower confidence/i);
});

test('parseIdentifyResponse normalizes extracted AI fields', () => {
  const parsed = parseIdentifyResponse(
    JSON.stringify({
      player: ' Shohei Ohtani ',
      year: '2018',
      sport: 'Baseball',
      setName: 'Topps Chrome',
      cardNumber: '150',
      parallel: '',
      manufacturer: 'Topps',
      confidence: 'high',
    })
  );

  assert.deepEqual(parsed, {
    player: 'Shohei Ohtani',
    year: 2018,
    sport: 'Baseball',
    setName: 'Topps Chrome',
    cardNumber: '150',
    parallel: null,
    manufacturer: 'Topps',
    confidence: 'high',
  });
});

test('normalizeIdentifiedCard keeps valid candidates and strips invalid fields', () => {
  const identified = normalizeIdentifiedCard({
    player: 'Shohei Ohtani',
    year: '2018',
    sport: 'Baseball',
    setName: 'Topps Chrome',
    cardNumber: '150',
    parallel: null,
    manufacturer: 'Topps',
    confidence: 'medium',
    status: 'candidates',
    cardId: null,
    cardsightCardId: 'cs-1',
    candidates: [
      {
        cardId: 'card-1',
        player: 'Shohei Ohtani',
        year: 2018,
        setName: 'Topps Chrome',
        cardNumber: '150',
      },
      {
        cardId: '',
        player: '',
      },
    ],
  });

  assert.deepEqual(identified, {
    player: 'Shohei Ohtani',
    year: 2018,
    sport: 'Baseball',
    setName: 'Topps Chrome',
    cardNumber: '150',
    parallel: null,
    manufacturer: 'Topps',
    confidence: 'medium',
    status: 'candidates',
    cardId: null,
    cardsightCardId: 'cs-1',
    candidates: [
      {
        cardId: 'card-1',
        player: 'Shohei Ohtani',
        year: 2018,
        setName: 'Topps Chrome',
        cardNumber: '150',
      },
    ],
  });
});

test('extractStoredIdentifiedCard reads identifiedCard from raw_ai_response payload', () => {
  const identified = extractStoredIdentifiedCard({
    model: 'gpt-4o',
    identifiedCard: {
      player: 'Shohei Ohtani',
      year: 2018,
      sport: 'Baseball',
      setName: 'Topps Chrome',
      cardNumber: '150',
      parallel: 'Refractor',
      manufacturer: 'Topps',
      confidence: 'high',
      status: 'matched',
      cardId: 'card-1',
      cardsightCardId: 'cardsight-1',
    },
  });

  assert.equal(identified?.player, 'Shohei Ohtani');
  assert.equal(identified?.cardId, 'card-1');
  assert.equal(identified?.cardsightCardId, 'cardsight-1');
  assert.equal(identified?.parallel, 'Refractor');
});

test('parseIdentifyResponse handles bowman chrome parallel-style extraction', () => {
  const parsed = parseIdentifyResponse(
    JSON.stringify({
      player: 'Shohei Ohtani',
      year: '2019',
      sport: 'Baseball',
      setName: '2019 Bowman Chrome',
      cardNumber: '50',
      parallel: 'Blue Refractor',
      manufacturer: 'Topps',
      confidence: 'medium',
    })
  );

  assert.deepEqual(parsed, {
    player: 'Shohei Ohtani',
    year: 2019,
    sport: 'Baseball',
    setName: '2019 Bowman Chrome',
    cardNumber: '50',
    parallel: 'Blue Refractor',
    manufacturer: 'Topps',
    confidence: 'medium',
  });
});
