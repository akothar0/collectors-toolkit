import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

test('refresh-collection-card appends observations only on persist path', () => {
  const source = readFileSync(
    join(process.cwd(), 'src/lib/pricing/refresh-collection-card.ts'),
    'utf8'
  );
  assert.match(source, /appendCollectionCardMarketObservation/);
  assert.doesNotMatch(
    readFileSync(join(process.cwd(), 'src/lib/pricing/explore-collection-pricing.ts'), 'utf8'),
    /appendCollectionCardMarketObservation/
  );
});
