import {test} from 'node:test';import assert from 'node:assert/strict';
import {compareBlindBoxBudget as budget,estimateCollectionProgress as progress} from '../../collector-assets/planning-core.mjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);
test('capped budget matches explicit stopping outcomes, including failure',()=>{
 const r=budget({budget:100,boxCost:15,fixedCost:10,confirmedCost:80,probabilityPercent:5});
 assert.equal(r.boxes,6);assert.equal(r.maxSpend,100);near(r.probabilityAtLeastOne,1-.95**6);near(r.probabilityNoTarget,.95**6);
 let expected=6*(.95**6);for(let n=1;n<=6;n++)expected+=n*.05*.95**(n-1);near(r.expectedSpendIfStoppingAtFirstTarget,expected*15+10);
 for(const p of [0,100]){const q=budget({budget:100,boxCost:15,fixedCost:10,confirmedCost:101,probabilityPercent:p});assert.equal(q.confirmedWithinBudget,false);assert.equal(q.expectedSpendIfStoppingAtFirstTarget,p?25:100);}
 const zero=budget({budget:9,boxCost:15,fixedCost:10,confirmedCost:0,probabilityPercent:100});assert.equal(zero.boxes,0);assert.equal(zero.maxSpend,0);assert.equal(zero.probabilityAtLeastOne,0);
 const cents=budget({budget:.3,boxCost:.1,fixedCost:0,confirmedCost:.3,probabilityPercent:0});assert.equal(cents.boxes,3);assert.equal(cents.unspentBudget,0);
});
test('progress agrees with enumeration of every small draw sequence',()=>{
 // Two equiprobable regulars A/B plus secret S at 1/3 each, A already owned.
 const outcomes=['A','B','S'];let totalNew=0,totalRepeat=0,totalSecret=0,any=0;
 for(const x of outcomes)for(const y of outcomes)for(const z of outcomes){const draws=[x,y,z],seen=new Set(['A']);let added=0,repeated=0,secrets=0;for(const d of draws){if(d==='S')secrets++;else if(seen.has(d))repeated++;else{seen.add(d);added++;}}totalNew+=added;totalRepeat+=repeated;totalSecret+=secrets;if(added)any++;}
 const r=progress({regularStyles:2,ownedStyles:1,boxes:3,secretPercent:100/3});near(r.expectedNewRegularStyles,totalNew/27);near(r.expectedRepeatedRegularDraws,totalRepeat/27);near(r.expectedSecretDraws,totalSecret/27);near(r.probabilityAtLeastOneNewRegular,any/27);
 for(const n of [0,1,100000]){const full=progress({regularStyles:6,ownedStyles:6,boxes:n,secretPercent:0});assert.equal(full.expectedNewRegularStyles,0);assert.equal(full.expectedRepeatedRegularDraws,n);const secret=progress({regularStyles:6,ownedStyles:0,boxes:n,secretPercent:100});assert.equal(secret.expectedNewRegularStyles,0);assert.equal(secret.expectedSecretDraws,n);}
});
test('empty, non-finite, impossible counts and excessive workloads are rejected',()=>{
 for(const a of [{regularStyles:6,ownedStyles:7,boxes:6,secretPercent:0},{regularStyles:6,ownedStyles:0,boxes:1.5,secretPercent:0},{regularStyles:6,ownedStyles:0,boxes:6,secretPercent:NaN},{regularStyles:'6',ownedStyles:0,boxes:6,secretPercent:0}])assert.throws(()=>progress(a),RangeError);
 assert.throws(()=>budget({budget:1000000,boxCost:.01,fixedCost:0,confirmedCost:1,probabilityPercent:1}),RangeError);
});
