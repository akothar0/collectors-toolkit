import test from 'node:test';
import assert from 'node:assert/strict';
import type { PricingResponse } from '../src/lib/cardsight/types';
import {
  sliceMarketCache,
  strictValuationFromSlice,
} from '../src/lib/pricing/slice-market-cache';

const lincecumLikeResponse: PricingResponse = {
  meta: { total_records: 2 },
  raw: { records: [] },
  graded: [
    {
      company_name: 'BGS',
      grades: [
        {
          grade_id: 'bgs-95-id',
          grade_value: 9.5,
          records: [],
        },
        {
          grade_id: 'bgs-8-id',
          grade_value: 8,
          records: [
            {
              title: 'Lincecum BGS 8 Refractor',
              price: 300,
              date: '2026-04-01T00:00:00.000Z',
              source: 'ebay',
              listing_type: 'fixed',
              parallel_id: 'refractor-id',
              parallel_name: 'Refractor',
            },
            {
              title: 'Lincecum BGS 8 Base',
              price: 200,
              date: '2026-03-01T00:00:00.000Z',
              source: 'ebay',
              listing_type: 'fixed',
            },
          ],
        },
      ],
    },
  ],
};

test('sliceMarketCache uses relaxed tier when exact grade has no sales', () => {
  const sliced = sliceMarketCache({
    pricingResponse: lincecumLikeResponse,
    gradeId: 'bgs-95-id',
    gradingCompany: 'BGS',
    grade: 9.5,
    parallelId: 'refractor-id',
    isGraded: true,
  });

  assert.equal(sliced.strict?.result.sampleSize, 0);
  assert.ok(sliced.display.result.sampleSize > 0);
  assert.equal(sliced.display.tier, 'same_grader_any_grade');
  assert.equal(sliced.comparables.length, 2);
  assert.match(sliced.scopeNote, /BGS/i);
});

test('strictValuationFromSlice only eligible with exact tier sales', () => {
  const sliced = sliceMarketCache({
    pricingResponse: lincecumLikeResponse,
    gradeId: 'bgs-8-id',
    gradingCompany: 'BGS',
    grade: 8,
    parallelId: null,
    isGraded: true,
  });

  const valuation = strictValuationFromSlice(sliced);
  assert.equal(valuation.valuationEligible, false);
  assert.equal(valuation.sampleSize, 2);
  assert.equal(valuation.medianSalePrice, 250);
});

test('sliceMarketCache raw card uses all_conditions', () => {
  const response: PricingResponse = {
    meta: { total_records: 1 },
    raw: {
      records: [
        {
          title: 'Raw sale',
          price: 50,
          date: '2026-05-01T00:00:00.000Z',
          source: 'ebay',
          listing_type: 'fixed',
        },
      ],
    },
    graded: [],
  };

  const sliced = sliceMarketCache({
    pricingResponse: response,
    isGraded: false,
  });

  assert.equal(sliced.display.tier, 'all_conditions');
  assert.equal(sliced.display.result.sampleSize, 1);
  assert.equal(sliced.strict, null);
});
