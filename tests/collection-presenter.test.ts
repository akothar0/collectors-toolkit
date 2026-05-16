import test from 'node:test';
import assert from 'node:assert/strict';
import {
  displayPlayer,
  displaySetName,
  formatGradeBadge,
  formatPlayerYearLine,
  formatPrice,
} from '../src/lib/collection-presenter';
import type { CollectionCardItem } from '../src/lib/collection';

test('formatGradeBadge returns Raw for raw cards', () => {
  assert.equal(formatGradeBadge('raw', 9, 'PSA'), 'Raw');
});

test('formatGradeBadge formats graded cards', () => {
  assert.equal(formatGradeBadge('graded', 9.5, 'BGS'), 'BGS 9.5');
  assert.equal(formatGradeBadge('graded', 10, 'PSA'), 'PSA 10');
});

test('displayPlayer prefers collection item player field', () => {
  const item: CollectionCardItem = {
    id: '1',
    frontImageUrl: null,
    player: 'Mike Trout',
    year: 2011,
    setName: 'Topps Update',
    parallel: null,
    cardNumber: null,
    sport: 'Baseball',
    conditionType: 'graded',
    grade: 9,
    gradingCompany: 'PSA',
    certNumber: null,
    purchasePrice: null,
    purchaseDate: null,
    currentValue: null,
    createdAt: '2024-01-01',
  };

  assert.equal(displayPlayer(item), 'Mike Trout');
  assert.equal(displaySetName(item), 'Topps Update');
});

test('formatPlayerYearLine includes year when present', () => {
  assert.equal(formatPlayerYearLine('Mike Trout', 2011), 'Mike Trout · 2011');
  assert.equal(formatPlayerYearLine('Mike Trout', null), 'Mike Trout');
});

test('formatPrice returns currency string', () => {
  assert.equal(formatPrice(125), '$125');
  assert.equal(formatPrice(null), null);
});
