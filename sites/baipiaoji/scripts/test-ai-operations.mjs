import assert from 'node:assert/strict';
import { tools } from '../lib/ai-suite/operations.mjs';

const byId = new Map(tools.map((tool) => [tool.id, tool]));
assert.equal(byId.size, 180);
for (const tool of tools) {
  assert.deepEqual(
    Object.keys(tool.example),
    tool.inputs.map((input) => input.key),
    tool.id,
  );
  assert.doesNotMatch(tool.title.en + tool.description.en, /\p{Script=Han}/u);
  assert.match(tool.title.zh, /\p{Script=Han}/u);
  const result = tool.run(tool.example);
  assert.deepEqual(result, JSON.parse(JSON.stringify(result)), tool.id);
  assert.ok(Object.keys(result).length, tool.id);
  const key = tool.inputs[0].key;
  for (const invalid of [null, '1', NaN, Infinity]) {
    assert.throws(() => tool.run({ ...tool.example, [key]: invalid }), Error, tool.id);
  }
}

let checked = 0;
function known(id, inputs, expectedFields) {
  const tool = byId.get(id);
  assert.ok(tool, id);
  const result = tool.run({ ...tool.example, ...inputs });
  for (const [key, expected] of Object.entries(expectedFields)) {
    if (typeof expected === 'number') {
      assert.ok(
        Math.abs(result[key] - expected) <= 1e-7 * Math.max(1, Math.abs(expected)),
        id + ' ' + key + ' got ' + result[key] + ' expected ' + expected,
      );
    } else {
      assert.equal(result[key], expected, id + ' ' + key);
    }
  }
  checked++;
}
function invalid(id, changes) {
  const tool = byId.get(id);
  assert.throws(() => tool.run({ ...tool.example, ...changes }), Error, id);
  checked++;
}
known('cash-conversion-cycle', {}, { operatingCycleDays: 85, cashConversionDays: 57 });
known('price-volume-sales-bridge', {}, { priceEffect: 2400, volumeEffect: 8000, revenueVariance: 10400 });
known('balance-weighted-receivable-age', {}, { totalReceivables: 5000, weightedAgeDays: 20 });
known('receivables-loss-allowance', {}, { requiredAllowance: 330, adjustment: 150 });
known('bank-book-reconciliation', {}, { adjustedBank: 11700, adjustedBook: 11700, unexplainedDifference: 0 });
known('equal-cashflow-project-npv', { discount: 0 }, { netPresentValue: 6000 });
known('annual-coupon-bond-price', { coupon: 5, yieldRate: 5 }, { price: 1000 });
known('bond-cashflow-duration', { coupon: 0 }, { macaulayYears: 5 });
known('loan-balloon-balance', { nominal: 0, principal: 1000, payment: 100, months: 3 }, { remainingBalloon: 700 });
known('excess-cash-sweep', {}, { repaid: 22500, remainingCash: 52500, remainingDebt: 37500 });
known('effective-annual-yield', { nominal: 12, periods: 2 }, { effectiveAnnualPercent: 12.36 });
invalid('growing-perpetuity-value', { growth: 10 });
known('gross-net-retention', {}, { grossRetentionPercent: 94, netRetentionPercent: 102 });
known('subscription-proration', {}, { oldPlanCredit: 16, newPlanCharge: 30, netAdjustment: 14 });
known('graduated-usage-bill', {}, { firstTierCharge: 400, secondTierCharge: 375, bill: 775 });
known(
  'subscription-migration-payback',
  { service: 1200, saving: 500, overlap: 100, overlapMonths: 2 },
  { paybackMonths: 2.8 },
);
known(
  'retention-offer-lift-value',
  { saved: 10, months: 12, discountMonths: 2, concession: 50, baseline: 50, treated: 80 },
  { expectedWithoutOffer: 60, expectedWithOffer: 88, incrementalExpectedRevenue: 28 },
);
invalid('renewal-book-cash-check', { renewed: 26 });
known(
  'weighted-average-stock-issue',
  { first: 10, firstCost: 2, second: 10, secondCost: 4, issue: 12 },
  { costIssued: 36, remainingValue: 24 },
);
known(
  'fifo-lot-issue',
  { first: 10, firstCost: 2, second: 10, secondCost: 4, issue: 12 },
  { costIssued: 28, remainingValue: 32 },
);
known('purchase-case-rounding', {}, { cases: 6, orderedUnits: 144, excessUnits: 4 });
known('purchase-case-rounding', { demand: 0 }, { orderedUnits: 0, excessUnits: 0 });
known('two-part-kit-availability', {}, { completeKits: 40, leftoverA: 20, leftoverB: 0 });
known('periodic-review-order-up-to', {}, { targetUnits: 355, inventoryPosition: 235, orderUnits: 120 });
invalid('consignment-remittance', { remain: 219 });
known('carrier-billable-weight', {}, { dimensionalKg: 14.4, billableKg: 14.5 });
known(
  'balanced-carton-packout',
  { units: 11, capacity: 5 },
  { cartons: 3, smallerCartons: 1, unitsPerSmallerCarton: 3, largerCartons: 2, unitsPerLargerCarton: 4 },
);
known('on-time-in-full-orders', {}, { failedOrders: 25, onTimeInFullOrders: 175, otifPercent: 87.5 });
known('overall-equipment-effectiveness', {}, { oeePercent: 71.875 });
known('freight-dwell-demurrage', {}, { overdueHours: 14, billedDays: 1, demurrageFee: 95 });
invalid('on-time-in-full-orders', { both: 14 });
known('weekly-overtime-pay', {}, { regularHours: 40, overtimeHours: 6, totalPay: 1176 });
known('capped-leave-accrual', {}, { hoursEarned: 24, carryHours: 48, forfeitedHours: 0 });
known(
  'new-hire-ramp-payback',
  { induction: 3000, full: 6000, loaded: 4000, ramp: 50, rampMonths: 2 },
  { rampMonthlyNet: -1000, postRampMonthlyNet: 2000, paybackMonths: 4.5 },
);
known('headcount-turnover-reconciliation', {}, { impliedHires: 14, averageHeadcount: 103 });
known('wright-unit-learning-time', { first: 8, learning: 50, unit: 8 }, { projectedUnitHours: 1 });
known(
  'cost-performance-completion-forecast',
  { budget: 100, earned: 40, actual: 50 },
  { costPerformanceIndex: 0.8, estimateAtCompletion: 125, forecastOverrun: 25 },
);
known(
  'incentive-contract-sharing',
  { targetCost: 100, reimbursable: 90, targetFee: 20, share: 50, minFee: 10, maxFee: 22 },
  { unboundedFee: 25, adjustedFee: 22, totalPrice: 112 },
);
known('milestone-billing-retainage', {}, { grossCertificate: 22500, retainage: 2250, currentPayable: 20250 });
known(
  'fixed-fee-project-quote',
  { labor: 100, materials: 20, contingency: 25, margin: 25 },
  { riskAdjustedCost: 150, quotedFee: 200 },
);
invalid('to-complete-performance-index', { target: 40000 });
known('marketplace-settlement-payout', {}, { netSales: 11200, platformCommission: 1344, merchantPayout: 8806 });
known('buy-get-promotion-basket', {}, { freeUnits: 1, chargedUnits: 4, merchandiseCharge: 200 });
known(
  'return-adjusted-order-profit',
  { price: 100, cost: 40, returns: 10, recovery: 75, shippingCost: 5, reverse: 5 },
  { keptOrderContribution: 55, returnedOrderContribution: -20, expectedContribution: 47.5 },
);
known(
  'gift-card-redemption-forecast',
  { issued: 100, redeemed: 95, breakage: 20 },
  { furtherExpectedRedemption: 0, projectedFinalUnredeemed: 5 },
);
known('cash-drawer-closeout', {}, { expectedDrawer: 640, overShort: -5 });
known('geo-control-adjusted-lift', {}, { baselineAdjusted: 220, incrementalConversions: 40 });
known('geo-control-adjusted-lift', { controlPost: 0 }, { baselineAdjusted: 0, liftPercent: null });
known('position-based-attribution-credit', {}, { firstTouch: 100, lastTouch: 100, creditPerMiddle: 50 / 3 });
known(
  'email-list-fatigue-projection',
  { subscribers: 100, unsub: 100, rounds: 2 },
  { expectedRemaining: 0, expectedMessagesAcrossRounds: 100 },
);
known('advertising-adstock-decay', {}, { carryoverAtEnd: 60, closingAdstock: 140 });
known(
  'experiment-cohort-allocation',
  { sample: 11, excluded: 20, groupShare: 50 },
  { holdout: 2, treatment: 4, control: 5 },
);
invalid('position-based-attribution-credit', { touches: 2 });
console.log(
  'PASS 180 operations examples, invalid numeric inputs, and ' + checked + ' known-answer or boundary scenarios.',
);
