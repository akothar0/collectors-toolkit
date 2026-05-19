import test from 'node:test';
import assert from 'node:assert/strict';
import type { PricingResponse } from '../src/lib/cardsight/types';
import { extractCacheFilterOptions } from '../src/lib/pricing/cache-dimensions';

const sample: PricingResponse = {
  meta: { total_records: 2 },
  raw: { records: [] },
  graded: [
    {
      company_name: 'PSA',
      grades: [
        {
          grade_value: 10,
          records: [
            {
              title: 'Sale',
              price: 100,
              date: '2026-01-01',
              source: 'ebay',
              listing_type: 'fixed',
              parallel_id: 'p1',
              parallel_name: 'Silver',
            },
          ],
        },
        {
          grade_value: 9,
          records: [],
        },
      ],
    },
    {
      company_name: 'BGS',
      grades: [{ grade_value: 9.5, records: [] }],
    },
  ],
};

test('extractCacheFilterOptions lists graders, grades, parallels', () => {
  const options = extractCacheFilterOptions(sample);
  assert.deepEqual(options.gradingCompanies, ['BGS', 'PSA']);
  assert.deepEqual(options.gradesByCompany.PSA, [10, 9]);
  assert.equal(options.parallels.length, 1);
  assert.equal(options.parallels[0].name, 'Silver');
});
