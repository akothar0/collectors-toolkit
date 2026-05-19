import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCatalogCardsResponse } from '../src/lib/cardsight/client';

test('parseCatalogCardsResponse reads cards array from live API shape', () => {
  const parsed = parseCatalogCardsResponse({
    cards: [
      {
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Mike Trout',
        number: 'US175',
      },
    ],
    total_count: 1,
    skip: 0,
    take: 20,
  });

  assert.equal(parsed.length, 1);
  assert.equal(parsed[0]?.name, 'Mike Trout');
});

test('parseCatalogCardsResponse falls back to data array', () => {
  const parsed = parseCatalogCardsResponse({
    data: [{ id: '22222222-2222-4222-8222-222222222222', name: 'Test' }],
  });

  assert.equal(parsed.length, 1);
});

test('parseCatalogCardsResponse accepts bare array', () => {
  const parsed = parseCatalogCardsResponse([{ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }]);
  assert.equal(parsed.length, 1);
});
