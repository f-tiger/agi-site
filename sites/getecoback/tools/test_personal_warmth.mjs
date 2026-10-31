import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateWarmth,EXAMPLES,warmthKind,shareWarmth} from '../site/assets/personal-warmth.mjs';
test('full-load energy and monetary calculation preserves fractional hours and rounds only for display',()=>{
 assert.deepEqual(calculateWarmth(EXAMPLES.short),{wh:55,kwh:0.055,cost:0.01925,totalKwh:0.055,totalCost:0.01925});
 const own=calculateWarmth({watts:80,hours:2.5,days:30,tariff:.30});
 assert.equal(own.kwh,.2);assert.equal(own.cost,.06);assert.ok(Math.abs(own.totalCost-1.8)<1e-12);
 assert.equal(calculateWarmth({watts:0,hours:0,days:1,tariff:0}).totalCost,0);
});
test('invalid input never becomes a monetary claim',()=>{
 for(const [key,values] of Object.entries({watts:[NaN,Infinity,-1,501,'110'],hours:[-1,25],days:[0,1.5,367],tariff:[-1,5.1]}))
  for(const value of values)assert.equal(calculateWarmth({...EXAMPLES.sofa,[key]:value}),null);
});
test('an unchanged example is never own calculation; changing then restoring inputs returns example',()=>{
 assert.equal(warmthKind({...EXAMPLES.sofa},EXAMPLES.sofa),'example');
 assert.equal(warmthKind({...EXAMPLES.sofa,tariff:.40},EXAMPLES.sofa),'own');
 assert.equal(warmthKind({...EXAMPLES.sofa,tariff:.35},EXAMPLES.sofa),'example');
});
test('share text identifies currency, assumptions, limits and a canonical URL without input parameters',()=>{
 const text=shareWarmth({...EXAMPLES.sofa},'CHF','example');
 assert.match(text,/Rechenbeispiel/);assert.match(text,/CHF/);assert.match(text,/110 W × 2 h/);assert.match(text,/keine Messung/);
 assert.equal(text.match(/https:\/\/\S+/g).length,1);assert.ok(text.endsWith('.html#waerme-rechner'));
 assert.equal(shareWarmth(EXAMPLES.sofa,'USD','example'),'');
});
