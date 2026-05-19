import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCardSightCatalogSearchQuery } from '../src/lib/cardsight/catalog-search';

test('buildCardSightCatalogSearchQuery omits year and setName', () => {
  const query = buildCardSightCatalogSearchQuery({
    player: 'Juan Soto',
    cardNumber: 'US300',
    segment: 'Baseball',
  });

  assert.equal(query.name, 'Juan Soto');
  assert.equal(query.number, 'US300');
  assert.equal(query.segment, 'Baseball');
  assert.equal(query.year, undefined);
  assert.equal(query.setName, undefined);
});

test('buildCardSightCatalogSearchQuery omits empty card number', () => {
  const query = buildCardSightCatalogSearchQuery({
    player: 'Juan Soto',
    cardNumber: '  ',
    segment: 'Baseball',
  });

  assert.equal(query.number, undefined);
});

test('buildCardSightCatalogSearchQuery strips hash from card number', () => {
  const query = buildCardSightCatalogSearchQuery({
    player: 'Luka Doncic',
    cardNumber: '#280',
  });

  assert.equal(query.number, '280');
});
