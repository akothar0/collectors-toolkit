import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePricingResponse } from '../src/lib/pricing/normalize';
import type { PricingResponse } from '../src/lib/cardsight/types';

const sampleResponse: PricingResponse = {
  raw: {
    count: 1,
    records: [
      {
        title: '2011 Topps Update Mike Trout US175',
        price: 100,
        date: '2026-01-01T00:00:00Z',
        source: 'eBay',
        listing_type: 'auction',
      },
    ],
  },
  graded: [
    {
      company_name: 'PSA',
      grades: [
        {
          grade_value: 10,
          records: [
            {
              title: 'PSA 10 Trout',
              price: 500,
              date: '2026-02-01T00:00:00Z',
              source: 'eBay',
              listing_type: 'fixed',
            },
            {
              title: 'PSA 10 Trout 2',
              price: 600,
              date: '2026-02-15T00:00:00Z',
              source: 'eBay',
              listing_type: 'fixed',
            },
            {
              title: 'PSA 10 Trout 3',
              price: 550,
              date: '2026-02-20T00:00:00Z',
              source: 'eBay',
              listing_type: 'fixed',
            },
          ],
        },
      ],
    },
  ],
  meta: { total_records: 4, last_sale_date: '2026-02-20T00:00:00Z' },
};

test('normalizePricingResponse computes median and valuation eligibility', () => {
  const normalized = normalizePricingResponse(sampleResponse, { period: '3m' });

  assert.equal(normalized.sampleSize, 4);
  assert.equal(normalized.valuationEligible, true);
  assert.equal(normalized.medianSalePrice, 525);
  assert.equal(normalized.confidenceLabel, 'medium');
  assert.equal(normalized.comparables.length, 4);
});

test('normalizePricingResponse excludes raw sales when gradeId filter is set', () => {
  const response: PricingResponse = {
    raw: {
      records: [
        {
          title: 'Raw sale',
          price: 50,
          date: '2026-01-01',
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
                title: 'BGS 9.5',
                price: 400,
                date: '2026-02-01',
                source: 'eBay',
                listing_type: 'auction',
              },
            ],
          },
        ],
      },
    ],
  };

  const gradedOnly = normalizePricingResponse(response, { gradeId: 'grade-bgs-95' });
  const all = normalizePricingResponse(response, { gradeId: null });

  assert.equal(gradedOnly.sampleSize, 1);
  assert.equal(gradedOnly.medianSalePrice, 400);
  assert.equal(all.sampleSize, 2);
});

test('normalizePricingResponse marks low sample as not valuation eligible', () => {
  const normalized = normalizePricingResponse(
    {
      raw: {
        records: [
          {
            title: 'Single sale',
            price: 20,
            date: '2026-01-01',
            source: 'eBay',
            listing_type: 'auction',
          },
        ],
      },
    },
    { period: '7d' }
  );

  assert.equal(normalized.sampleSize, 1);
  assert.equal(normalized.valuationEligible, false);
  assert.equal(normalized.confidenceLabel, 'low');
});
