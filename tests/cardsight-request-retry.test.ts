import test from 'node:test';
import assert from 'node:assert/strict';

test('cardsightRequest retries once after HTTP 429 then succeeds', async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;

  process.env.CARDSIGHTAI_API_KEY = 'test-key-for-retry';

  globalThis.fetch = async () => {
    calls += 1;
    if (calls === 1) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded', code: 'RATE_LIMIT_EXCEEDED' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ cards: [{ id: '11111111-1111-4111-8111-111111111111', name: 'Test' }] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    const { searchCatalogCards } = await import('../src/lib/cardsight/client');
    const cards = await searchCatalogCards({ name: 'Test', take: 1 });
    assert.equal(calls, 2);
    assert.equal(cards.length, 1);
    assert.equal(cards[0]?.name, 'Test');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('cardsightRequest throws CardSightApiError after retry budget exhausted', async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;

  process.env.CARDSIGHTAI_API_KEY = 'test-key-for-retry';

  globalThis.fetch = async () => {
    calls += 1;
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    const { searchCatalogCards, CardSightApiError } = await import('../src/lib/cardsight/client');
    await assert.rejects(
      () => searchCatalogCards({ name: 'Test' }),
      (error: unknown) => {
        assert.ok(error instanceof CardSightApiError);
        assert.equal(error.status, 429);
        return true;
      }
    );
    assert.equal(calls, 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
