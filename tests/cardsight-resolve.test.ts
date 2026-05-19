import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultCatalogMatchMinScore, pickBestCatalogMatches } from '../src/lib/cardsight/resolve-scoring';
import type { CatalogCard } from '../src/lib/cardsight/types';

const baseCandidate: CatalogCard = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Mike Trout',
  number: 'US175',
  year: 2011,
  set: { name: 'Topps Update', year: 2011 },
};

test('pickBestCatalogMatches returns matched when score is strong and unambiguous', () => {
  const result = pickBestCatalogMatches(
    [
      baseCandidate,
      {
        id: '22222222-2222-4222-8222-222222222222',
        name: 'Mike Trout',
        number: '1',
        year: 2012,
        set: { name: 'Topps', year: 2012 },
      },
    ],
    {
      player: 'Mike Trout',
      year: 2011,
      setName: 'Topps Update',
      cardNumber: 'US175',
    }
  );

  assert.equal(result.status, 'matched');
  if (result.status === 'matched') {
    assert.equal(result.match.id, baseCandidate.id);
    assert.ok(result.score >= 45);
  }
});

test('pickBestCatalogMatches picks match when tied candidates share the same card number', () => {
  const twinA: CatalogCard = {
    ...baseCandidate,
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    number: 'US300',
  };
  const twinB: CatalogCard = {
    ...baseCandidate,
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    number: 'US300',
  };

  const result = pickBestCatalogMatches([twinA, twinB], {
    player: 'Juan Soto',
    year: 2018,
    setName: 'Topps Update',
    cardNumber: 'US300',
  });

  assert.equal(result.status, 'matched');
});

test('pickBestCatalogMatches returns ambiguous when top scores are close', () => {
  const twinA: CatalogCard = {
    ...baseCandidate,
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    number: 'US175',
  };
  const twinB: CatalogCard = {
    ...baseCandidate,
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    parallels: [{ id: 'p1', name: 'Gold' }],
  };

  const result = pickBestCatalogMatches([twinA, twinB], {
    player: 'Mike Trout',
    year: 2011,
    setName: 'Topps Update',
  });

  assert.equal(result.status, 'ambiguous');
});

test('pickBestCatalogMatches matches without card number at lower threshold', () => {
  const result = pickBestCatalogMatches(
    [
      {
        id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        name: 'Juan Soto',
        year: 2018,
        set: { name: 'Topps Update', year: 2018 },
      },
    ],
    {
      player: 'Juan Soto',
      year: 2018,
      setName: 'Topps Update',
    }
  );

  assert.equal(result.status, 'matched');
});

test('defaultCatalogMatchMinScore is lower when card number is missing', () => {
  assert.equal(
    defaultCatalogMatchMinScore({ player: 'Juan Soto', cardNumber: 'US300' }),
    45
  );
  assert.equal(defaultCatalogMatchMinScore({ player: 'Juan Soto' }), 35);
});

test('pickBestCatalogMatches returns not_found when nothing scores high enough', () => {
  const result = pickBestCatalogMatches(
    [
      {
        id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        name: 'Shohei Ohtani',
        number: '1',
        year: 2018,
        set: { name: 'Topps', year: 2018 },
      },
    ],
    {
      player: 'Mike Trout',
      year: 2011,
      setName: 'Topps Update',
      cardNumber: 'US175',
    }
  );

  assert.equal(result.status, 'not_found');
});
