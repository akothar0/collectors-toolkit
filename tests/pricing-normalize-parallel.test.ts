import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flattenPricingRecords } from '../src/lib/pricing/normalize';
import type { PricingResponse } from '../src/lib/cardsight/types';

const response: PricingResponse = {
  meta: { total_records: 2 },
  raw: { records: [] },
  graded: [
    {
      company_name: 'PSA',
      grades: [
        {
          grade_id: 'psa-10',
          grade_value: 10,
          records: [
            {
              title: 'Blue Refractor sale',
              price: 100,
              parallel_id: 'blue-id',
              parallel_name: 'Blue Refractor',
            },
            {
              title: 'Mojo sale',
              price: 50,
              parallel_id: 'mojo-id',
              parallel_name: 'Mojo',
            },
            {
              title: 'Missing parallel id',
              price: 25,
            },
          ],
        },
      ],
    },
  ],
};

test('flattenPricingRecords excludes non-matching parallels when filter set', () => {
  const records = flattenPricingRecords(response, { parallelId: 'blue-id' });
  assert.equal(records.length, 1);
  assert.equal(records[0]?.title, 'Blue Refractor sale');
});
