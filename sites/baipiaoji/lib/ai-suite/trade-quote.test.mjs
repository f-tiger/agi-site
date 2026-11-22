import assert from 'node:assert/strict';
import test from 'node:test';
import {executeSuiteTool} from './runtime.mjs';
import {tools} from './trade-quote.mjs';

const [tool] = tools;
const run = (changes = {}) => executeSuiteTool(tool, {...tool.example, ...changes});

test('the CIF worked example reconciles both currencies and each quoted fee', () => {
  const quote = run();
  assert.equal(quote.productCostInQuoteCurrency, 2520);
  assert.deepEqual(quote.sellerFeeLines.map(fee => fee.inQuoteCurrency), [49,91,250,30]);
  assert.equal(quote.sellerCost, 2940);
  assert.equal(quote.minimumOrderTotal, 4055.18);
  assert.equal(quote.minimumUnitPrice, 8.12);
  assert.equal(quote.orderTotalAtMinimumUnitPrice, 4060);
  assert.deepEqual(quote.quotedOrder, {
    unitPrice:8.4, orderTotal:4200, commission:210, paymentFee:105,
    profit:945, marginPercent:22.5, meetsTarget:true,
  });
  assert.equal(run({quotedUnitPrice:8.11}).quotedOrder.meetsTarget, false);
  assert.equal(run({quotedUnitPrice:8.12}).quotedOrder.meetsTarget, true);
  // Terms describe the scenario. Charges come from the seller's own worksheet.
  assert.equal(run({incoterm:'EXW'}).sellerCost, quote.sellerCost);
  assert.equal(run({incoterm:'FOB'}).sellerCost, quote.sellerCost);
});

test('an exact decimal price threshold stays on its currency increment', () => {
  const inputs = {
    costCurrency:'USD',quoteCurrency:'USD',quotePerCostUnit:1,quantity:1,unitProductCost:0.07,
    sellerFees:'[]',commissionPercent:7,paymentFeePercent:0,targetMarginPercent:23,
  };
  const exact = run({...inputs, quotedUnitPrice:0.1});
  assert.equal(exact.minimumOrderTotal, 0.1);
  assert.equal(exact.quotedOrder.commission, 0.007);
  assert.equal(exact.quotedOrder.marginPercent, 23);
  assert.equal(exact.quotedOrder.meetsTarget, true);
  assert.equal(run({...inputs,quotedUnitPrice:0.09}).quotedOrder.meetsTarget, false);
  assert.equal(run({...inputs,quotedUnitPrice:0}).quotedOrder, null);
});

test('seller costs round up in zero-decimal and three-decimal quote currencies', () => {
  const yen = run({
    costCurrency:'USD',quoteCurrency:'JPY',quotePerCostUnit:149.905,quantity:1,unitProductCost:2,
    sellerFees:'[]',commissionPercent:0,paymentFeePercent:0,targetMarginPercent:10,quotedUnitPrice:334,
  });
  assert.equal(yen.sellerCost, 300);
  assert.equal(yen.minimumUnitPrice, 334);
  assert.equal(yen.quotedOrder.meetsTarget, true);

  const dinar = run({
    costCurrency:'USD',quoteCurrency:'KWD',quotePerCostUnit:0.30673359,quantity:3,unitProductCost:1,
    sellerFees:'[]',commissionPercent:0,paymentFeePercent:0,targetMarginPercent:0,quotedUnitPrice:0.307,
  });
  assert.equal(dinar.sellerCost, 0.921);
  assert.equal(dinar.minimumUnitPrice, 0.307);
  assert.equal(dinar.quotedOrder.meetsTarget, true);
});

test('each converted cost line uses the quote currency increment', () => {
  const quote = run({
    unitProductCost:0,sellerFees:JSON.stringify([
      {name:'Packing',amount:0.02,currency:'CNY'},{name:'Handling',amount:0.02,currency:'CNY'},
    ]),quotedUnitPrice:0,commissionPercent:0,paymentFeePercent:0,targetMarginPercent:0,
  });
  assert.equal(quote.sellerCost, 0.02);
  assert.deepEqual(quote.sellerFeeLines.map(fee => fee.inQuoteCurrency), [0.01,0.01]);
});

test('uncalculable quotes give an input error', () => {
  assert.throws(() => run({targetMarginPercent:92.5}), /less than 100%/);
  assert.throws(() => run({costCurrency:'USD'}), /exchange rate 1/);
  assert.throws(() => run({quoteCurrency:'ZZZ'}), /supported currency/);
  assert.throws(() => run({incoterm:'DAP'}), /EXW, FOB or CIF/);
  assert.throws(() => run({quotedUnitPrice:8.399}), /2 decimal/);
  assert.throws(() => run({commissionPercent:1.23456}), /4 decimal/);
  assert.throws(() => run({sellerFees:'[{"name":"Port", "currency":"EUR", "amount":1}]'}), /cost or quote currency/);
  assert.throws(() => run({sellerFees:'[{"name":"Port", "currency":"USD", "amount":"1"}]'}), /nonnegative number/);
  assert.throws(() => run({unitProductCost:0,sellerFees:'[]'}), /positive product cost/);
  assert.throws(() => run({quantity:1_000_000,unitProductCost:1e9,quotePerCostUnit:1e6}), /supported range/);
});
