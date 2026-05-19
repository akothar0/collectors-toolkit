import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildGradedCompsScopeNote,
  formatPricingDate,
  mapPricingPayload,
} from '../src/lib/pricing/presenter';

test('mapPricingPayload maps idle state without snapshot', () => {
  const payload = mapPricingPayload({
    configured: true,
    status: 'idle',
    message: 'Refresh comps to load CardSight sold prices.',
    canRefresh: true,
  });

  assert.equal(payload.configured, true);
  assert.equal(payload.status, 'idle');
  assert.equal(payload.medianLabel, null);
  assert.equal(payload.comparables.length, 0);
  assert.equal(payload.canRefresh, true);
  assert.equal(payload.message, 'Refresh comps to load CardSight sold prices.');
});

test('mapPricingPayload maps cached snapshot and comparables', () => {
  const payload = mapPricingPayload({
    configured: true,
    status: 'cached',
    canRefresh: true,
    snapshot: {
      median_sale_price: 125.5,
      sample_size: 12,
      confidence_label: 'high',
      valuation_eligible: true,
      queried_at: '2026-05-18T12:00:00.000Z',
    },
    comparables: [
      {
        title: 'Juan Soto US300',
        sale_price: 130,
        sale_date: '2026-05-01T00:00:00.000Z',
        item_url: 'https://example.com/sale/1',
      },
    ],
  });

  assert.equal(payload.status, 'cached');
  assert.equal(payload.medianLabel, '$126');
  assert.equal(payload.sampleSize, 12);
  assert.equal(payload.valuationEligible, true);
  assert.equal(payload.comparables.length, 1);
  assert.equal(payload.comparables[0]?.title, 'Juan Soto US300');
  assert.equal(payload.comparables[0]?.salePriceLabel, '$130');
});

test('mapPricingPayload maps unsupported sport with refresh disabled', () => {
  const payload = mapPricingPayload({
    configured: true,
    status: 'unsupported_sport',
    message: 'CardSight sold comps are available for baseball, basketball, and football only.',
    canRefresh: false,
  });

  assert.equal(payload.status, 'unsupported_sport');
  assert.equal(payload.canRefresh, false);
});

test('mapPricingPayload includes compsScopeNote separately from message', () => {
  const payload = mapPricingPayload({
    configured: true,
    status: 'cached',
    message: 'Refresh comps to load CardSight sold prices.',
    compsScopeNote: 'Median reflects PSA 10 sales. Recent sales may include raw and other grades.',
    canRefresh: true,
  });

  assert.equal(payload.message, 'Refresh comps to load CardSight sold prices.');
  assert.match(payload.compsScopeNote ?? '', /PSA 10/);
});

test('formatPricingDate returns null for empty input', () => {
  assert.equal(formatPricingDate(null), null);
  assert.equal(formatPricingDate(''), null);
});
