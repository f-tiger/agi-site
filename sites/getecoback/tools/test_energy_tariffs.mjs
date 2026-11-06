import test from 'node:test';import assert from 'node:assert/strict';
import {example,calculate,normalize,encode,decode,parseCSV} from '../site/assets/energy-tariff-model.mjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
test('DE: first-year, recurring and two-year costs stay separate',()=>{const r=calculate(example('de'));near(r.firstSaving,124);near(r.recurringSaving,24);near(r.twoYearSaving,148);});
test('FR: off-peak break-even includes subscriptions; shift is separate',()=>{const r=calculate(example('fr'));near(r.A.recurring,840);near(r.B.recurring,840);near(r.threshold,.3);near(r.shiftSaving,24);near(r.firstSaving,0);});
test('ES: two contracted powers are daily costs for 365 days',()=>{const r=calculate(example('es'));near(r.B.power,167.9);near(r.A.recurring,803.9);near(r.B.recurring,719.9);near(r.firstSaving,84);});
test('IT: annual power fee and three consumption bands',()=>{const r=calculate(example('it'));near(r.A.recurring,948);near(r.B.recurring,945);near(r.firstSaving,3);});
test('Bonus trap, switching costs and sensitivity are not recurring discounts',()=>{const s=example();s.B.fixed=250;s.switchCost=10;const r=calculate(s);assert.equal(r.bonusTrap,true);near(r.firstSaving,44);near(r.recurringSaving,-46);near(r.stressLow,970);near(r.stressHigh,1330);});
test('Invalid prices, consumption, versions and prototypes fail closed',()=>{for(const change of [s=>s.kwh=[0],s=>s.A.rates=[-1],s=>s.B.fixed=NaN,s=>s.shift=9000,s=>s.market='toString',s=>s.version=2,s=>s.own='true']){const s=example();change(s);assert.throws(()=>normalize(s));}});
test('Sharing normalizes known fields, rejects oversized content and roundtrips',()=>{const s=example('it');s.email='ignored';assert.deepEqual(decode(encode(s)),example('it'));assert.throws(()=>decode('x'.repeat(12001)));});
test('CSV: the DE one-column template accepts decimal comma and decimal point',()=>{
 for(const csv of ['kwh1\n10,5\n20,25','kwh1\n10.5\n20.25','\uFEFFkwh1\r\n 10,5 \r\n20,25\r\n'])assert.deepEqual(parseCSV(csv,'de'),[30.75]);
});
test('CSV: multi-band markets keep exact columns and delimiter-specific decimals',()=>{
 assert.deepEqual(parseCSV('kwh1;kwh2\n10,5;20\n9,5;30','fr'),[20,50]);
 assert.deepEqual(parseCSV('kwh1,kwh2\n10.5,20\n9.5,30','fr'),[20,50]);
 for(const market of ['it','es']){
  assert.deepEqual(parseCSV('kwh1;kwh2;kwh3\n10,5;20,25;30\n9,5;9,75;40',market),[20,30,70]);
  assert.deepEqual(parseCSV('kwh1,kwh2,kwh3\n10.5,20.25,30\n9.5,9.75,40',market),[20,30,70]);
 }
 for(const market of ['fr','it','es'])assert.throws(()=>parseCSV('kwh1\n10,5',market));
});
test('CSV: malformed fields, formulas, extra columns and unsupported quoting fail closed',()=>{
 for(const csv of ['wrong\n1','kwh1;kwh2\n1;2','kwh1\n=1+2','kwh1\n-1','kwh1\n+1','kwh1\n10,5,2','kwh1\n10;5','kwh1\n1.000,5','kwh1\n"10,5"','kwh1\n10\n\n20'])assert.throws(()=>parseCSV(csv,'de'),csv);
 for(const csv of ['kwh1;kwh2\n=1;2','kwh1;kwh2\n;2','kwh1;kwh2\n-1;2','kwh1;kwh2\n1;2;3','kwh1,kwh2\n10,5,20','kwh1,kwh2\n"10,5",20'])assert.throws(()=>parseCSV(csv,'fr'),csv);
 for(const market of ['it','es'])for(const row of ['1;2','1;2;3;4','1;=2;3','1;2;-3'])assert.throws(()=>parseCSV('kwh1;kwh2;kwh3\n'+row,market));
});
test('CSV: input, row, field and aggregate limits still apply',()=>{
 assert.deepEqual(parseCSV('kwh1\n1000000,0','de'),[1000000]);
 assert.deepEqual(parseCSV('kwh1\n'+'1\n'.repeat(366),'de'),[366]);
 for(const csv of ['kwh1\n1000000,1','kwh1\n600000,5\n400000','kwh1\n'+'1\n'.repeat(367),'kwh1\n'+'1'.repeat(100000)])assert.throws(()=>parseCSV(csv,'de'));
 assert.throws(()=>parseCSV('kwh1;kwh2\n600000,5;1\n400000;2','fr'));
 assert.throws(()=>parseCSV('kwh1\n1','toString'));
});
