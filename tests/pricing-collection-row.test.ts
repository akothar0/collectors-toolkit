import test from 'node:test';
import assert from 'node:assert/strict';
import { mapCollectionPricingRow } from '../src/lib/pricing/refresh-collection-card';

test('mapCollectionPricingRow prefers override card number over catalog', () => {
  const row = mapCollectionPricingRow({
    id: 'cc-1',
    card_id: 'card-1',
    override_player: 'Juan Soto',
    override_year: 2018,
    override_set_name: 'Topps Update',
    override_parallel: null,
    override_card_number: 'US300',
    sport: 'Baseball',
    condition_type: 'graded',
    grade: 10,
    grading_company: 'BGS',
    latest_price_snapshot_id: null,
    cards: {
      id: 'card-1',
      player: 'Juan Soto',
      year: 2018,
      set_name: 'Topps Update',
      card_number: 'OLD',
      parallel: null,
      manufacturer: null,
      sport: 'Baseball',
      source: null,
      source_id: null,
    },
  });

  assert.equal(row.override_card_number, 'US300');
  assert.equal(row.cards?.card_number, 'OLD');
});

test('mapCollectionPricingRow unwraps cards array join from PostgREST', () => {
  const row = mapCollectionPricingRow({
    id: 'cc-2',
    card_id: 'card-2',
    override_player: null,
    override_year: null,
    override_set_name: null,
    override_parallel: null,
    override_card_number: null,
    sport: 'Basketball',
    condition_type: 'graded',
    grade: 10,
    grading_company: 'PSA',
    latest_price_snapshot_id: null,
    cards: [
      {
        id: 'card-2',
        player: 'Luka Doncic',
        year: 2018,
        set_name: 'Panini Prizm',
        card_number: '280',
        parallel: null,
        manufacturer: null,
        sport: 'Basketball',
        source: null,
        source_id: null,
      },
    ],
  });

  assert.equal(row.cards?.player, 'Luka Doncic');
  assert.equal(row.cards?.card_number, '280');
});
