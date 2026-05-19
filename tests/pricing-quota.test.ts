import test from 'node:test';
import assert from 'node:assert/strict';
import { getCronCardLimit } from '../src/lib/pricing/bulk-refresh';
import { getPricingMonthlyCap } from '../src/lib/pricing/pricing-quota';

test('getCronCardLimit defaults to 15 for weekly quota budget', () => {
  const prev = process.env.PRICING_CRON_CARD_LIMIT;
  delete process.env.PRICING_CRON_CARD_LIMIT;
  try {
    assert.equal(getCronCardLimit(), 15);
  } finally {
    if (prev !== undefined) process.env.PRICING_CRON_CARD_LIMIT = prev;
  }
});

test('getPricingMonthlyCap defaults to 500', () => {
  const prev = process.env.PRICING_MONTHLY_CAP;
  delete process.env.PRICING_MONTHLY_CAP;
  try {
    assert.equal(getPricingMonthlyCap(), 500);
  } finally {
    if (prev !== undefined) process.env.PRICING_MONTHLY_CAP = prev;
  }
});
