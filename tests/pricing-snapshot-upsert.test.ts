import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePricingResponse } from '../src/lib/pricing/normalize';
import type { PricingResponse } from '../src/lib/cardsight/types';
import { buildGradedCompsScopeNote } from '../src/lib/pricing/presenter';

test('normalizePricingResponse with grade filter keeps raw sales in broad pass', () => {
  const response: PricingResponse = {
    raw: {
      records: [
        {
          title: 'Raw sale',
          price: 80,
          date: '2026-03-01',
          source: 'eBay',
          listing_type: 'auction',
        },
      ],
    },
    graded: [
      {
        company_name: 'BGS',
        grades: [
          {
            grade_id: 'grade-bgs-95',
            grade_value: 9.5,
            records: [
              {
                title: 'BGS 9.5 sale',
                price: 400,
                date: '2026-03-02',
                source: 'eBay',
                listing_type: 'auction',
              },
            ],
          },
          {
            grade_id: 'grade-psa-9',
            grade_value: 9,
            records: [
              {
                title: 'PSA 9 sale',
                price: 250,
                date: '2026-03-03',
                source: 'eBay',
                listing_type: 'auction',
              },
            ],
          },
        ],
      },
    ],
  };

  const gradedOnly = normalizePricingResponse(response, {
    gradeId: 'grade-bgs-95',
  });
  const allConditions = normalizePricingResponse(response, { gradeId: null });

  assert.equal(gradedOnly.sampleSize, 1);
  assert.equal(gradedOnly.medianSalePrice, 400);
  assert.equal(allConditions.sampleSize, 3);
  assert.equal(allConditions.comparables.some((row) => row.title === 'Raw sale'), true);
  assert.equal(allConditions.comparables.some((row) => row.title === 'PSA 9 sale'), true);
});

test('buildGradedCompsScopeNote explains grade-specific median vs mixed list', () => {
  const note = buildGradedCompsScopeNote({
    conditionBucket: 'graded',
    gradingCompany: 'BGS',
    grade: 9.5,
  });

  assert.match(note ?? '', /BGS 9\.5/i);
  assert.match(note ?? '', /raw and other grades/i);
});
