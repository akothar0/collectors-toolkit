import assert from 'node:assert/strict';
import test from 'node:test';
import type { PricingResponse } from '../src/lib/cardsight/types';
import {
  buildGradeProfitabilityPayload,
  calculateBreakEvenRawPrice,
  calculateExpectedValue,
  calculateUpside,
  extractExactPsaGradeSummary,
  mapPredictionToPsaProbabilities,
} from '../src/lib/grading-roi';

const pricingResponse: PricingResponse = {
  meta: { total_records: 7 },
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
              title: 'PSA 10 sale A',
              price: 420,
              date: '2026-05-01T00:00:00.000Z',
              source: 'ebay',
              listing_type: 'fixed',
            },
            {
              title: 'PSA 10 sale B',
              price: 400,
              date: '2026-04-20T00:00:00.000Z',
              source: 'ebay',
              listing_type: 'auction',
            },
          ],
        },
        {
          grade_id: 'psa-9',
          grade_value: 9,
          records: [
            {
              title: 'PSA 9 sale A',
              price: 180,
              date: '2026-05-03T00:00:00.000Z',
              source: 'ebay',
              listing_type: 'fixed',
            },
            {
              title: 'PSA 9 sale B',
              price: 170,
              date: '2026-04-19T00:00:00.000Z',
              source: 'ebay',
              listing_type: 'auction',
            },
            {
              title: 'PSA 9 sale C',
              price: 190,
              date: '2026-04-11T00:00:00.000Z',
              source: 'ebay',
              listing_type: 'auction',
            },
          ],
        },
      ],
    },
    {
      company_name: 'BGS',
      grades: [
        {
          grade_id: 'bgs-10',
          grade_value: 10,
          records: [
            {
              title: 'BGS 10 sale',
              price: 999,
              date: '2026-04-01T00:00:00.000Z',
              source: 'ebay',
              listing_type: 'fixed',
            },
          ],
        },
      ],
    },
  ],
};

test('extractExactPsaGradeSummary uses only exact PSA groups', () => {
  const grade10 = extractExactPsaGradeSummary({ pricingResponse, grade: 10 });
  const grade8 = extractExactPsaGradeSummary({ pricingResponse, grade: 8 });

  assert.equal(grade10.gradedValue, 410);
  assert.equal(grade10.sampleSize, 2);
  assert.equal(grade10.confidenceLabel, 'low');
  assert.equal(grade8.gradedValue, null);
  assert.equal(grade8.sampleSize, 0);
  assert.equal(grade8.confidenceLabel, 'none');
});

test('mapPredictionToPsaProbabilities linearly interpolates between adjacent grades', () => {
  assert.deepEqual(mapPredictionToPsaProbabilities(8.2), { 8: 0.8, 9: 0.2, 10: 0 });
  assert.deepEqual(mapPredictionToPsaProbabilities(8.8), { 8: 0.2, 9: 0.8, 10: 0 });
  assert.deepEqual(mapPredictionToPsaProbabilities(9.4), { 8: 0, 9: 0.6, 10: 0.4 });
  assert.deepEqual(mapPredictionToPsaProbabilities(9.8), { 8: 0, 9: 0.2, 10: 0.8 });
});

test('roi formulas calculate break-even, upside, and expected value', () => {
  assert.equal(calculateBreakEvenRawPrice(180, 20, 0.08), 158.4);
  assert.equal(
    calculateUpside({ gradedValue: 180, rawPrice: 70, gradingFee: 20, feeTaxEstimate: 0.08 }),
    88.4
  );
  assert.equal(
    calculateExpectedValue({
      probabilities: { 8: 0.2, 9: 0.5, 10: 0.3 },
      gradeValues: { 8: 90, 9: 180, 10: 420 },
      gradingFee: 20,
    }),
    214
  );
});

test('buildGradeProfitabilityPayload returns rows and expected values without faking missing comps', () => {
  const payload = buildGradeProfitabilityPayload({
    pricingResponse,
    psaPrediction: 9.4,
    rawPrice: 70,
    feeTier: 'economy',
    cardsightCardId: 'card-123',
    parallelId: null,
    pricingResolvedAt: '2026-05-18T12:00:00.000Z',
  });

  assert.equal(payload.gradingFee, 20);
  assert.equal(payload.rows[0]?.grade, 10);
  assert.equal(payload.rows[1]?.grade, 9);
  assert.equal(payload.rows[2]?.grade, 8);
  assert.equal(payload.rows[0]?.gradedValue, 410);
  assert.equal(payload.rows[1]?.gradedValue, 180);
  assert.equal(payload.rows[2]?.gradedValue, null);
  assert.equal(payload.rows[2]?.status, 'no_sales');
  assert.equal(payload.expectedValue, 252);
  assert.equal(payload.expectedUpside, 182);
});
