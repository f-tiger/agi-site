import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {packCost,careDecision,careShareText,careEventName,careComplete,CARE_URL} from '../site/assets/meaco-care.mjs';
test('annual consumption and rounded pack purchases remain different, including carried inventory',()=>{
 assert.deepEqual(packCost(),{annualUsePence:3999,packs:2,purchasePence:5998,leftover:2});
 assert.deepEqual(packCost({openingStock:2}),{annualUsePence:3999,packs:1,purchasePence:2999,leftover:1});
 assert.deepEqual(packCost({filtersUsed:0}),{annualUsePence:0,packs:0,purchasePence:0,leftover:0});
 assert.deepEqual(packCost({openingStock:6}),{annualUsePence:3999,packs:0,purchasePence:0,leftover:2});
 for(const input of [{packSize:0},{packPence:-1},{filtersUsed:1.5},{openingStock:Infinity}])assert.throws(()=>packCost(input),RangeError);
});
test('10/12L evidence never leaks into other generations or 20/25L compatibility',()=>{
 for(const generation of ['one','two'])for(const size of ['10','12'])assert.equal(careDecision({generation,size,purpose:'air'}).status,'verified');
 for(const generation of ['unknown','other'])for(const size of ['10','12','20','25','unknown','other'])assert.equal(careDecision({generation,size,purpose:'air'}).status,'unverified');
 for(const generation of ['one','two'])for(const size of ['20','25','unknown','other'])assert.equal(careDecision({generation,size,purpose:'air'}).status,'unverified');
 assert.throws(()=>careDecision({generation:'Platinum'}),RangeError);
});
test('drying-only users get a no-purchase route; unchosen purpose gets no cost recommendation',()=>{
 const dry=careDecision({generation:'two',size:'12',purpose:'dry'});assert.equal(dry.status,'optional');assert.equal(dry.cost,false);assert.match(dry.text,/standard dust filter/);
 assert.equal(careDecision({generation:'one',size:'10'}).status,'purpose');assert.equal(careDecision().cost,false);
 assert(!careShareText(dry).includes('£29.99'));assert.match(careShareText(dry),/Do not wash, cut/);
});
test('completion requires all three explicit choices, regardless of compatibility outcome',()=>{
 assert.equal(careComplete(),false);
 const full={generation:'two',size:'12',purpose:'air'};
 for(const key of ['generation','size','purpose'])for(const value of [undefined,'unknown',''])assert.equal(careComplete({...full,[key]:value}),false);
 assert.equal(careComplete(full),true);
 for(const generation of ['one','two','other'])for(const size of ['10','12','20','25','other'])for(const purpose of ['dry','air'])assert.equal(careComplete({generation,size,purpose}),true);
 assert.equal(careComplete({...full,generation:'unlisted'}),false);
});
test('share text preserves uncertainty and evidence date, with a canonical link and no tracking state',()=>{
 const text=careShareText(careDecision({generation:'one',size:'12',purpose:'air'}));
 for(const value of ['17 October 2026','£39.99','£59.98','not a lifespan guarantee','Verify stock',CARE_URL])assert(text.includes(value));
 assert(!text.includes('utm_'));assert(!text.includes('current stock'));
 assert.equal(careEventName('view'),'eco_upkeep_view');assert.equal(careEventName('share'),'eco_upkeep_share');assert.equal(careEventName('purchase'),null);
 const source=readFileSync(new URL('../site/assets/meaco-care.mjs',import.meta.url),'utf8');
 assert(source.includes('detail:{name}'));assert(!/fetch\s*\(|localStorage|sessionStorage/.test(source));
});
