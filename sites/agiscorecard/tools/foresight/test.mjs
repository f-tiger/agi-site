import test from 'node:test';import assert from 'node:assert/strict';
import {blank,normalize,emptyNote,PRODUCT,selectClaims} from '../../foresight-assets/core.mjs';
import {claims,goals,interviews} from '../../foresight-assets/catalog.mjs';
test('portable records reject unknown products, arbitrary fields, malformed dates and excessive text',()=>{
 const r={version:1,product:PRODUCT,values:blank()};r.values.saved=['software-judgment'];r.values.notes['software-judgment']={...emptyNote(),action:'Check a real task',review:'2026-10-20'};assert.deepEqual(normalize(r),r);
 for(const mutate of [v=>v.product='work-mentor',v=>v.values.saved.push('untrusted'),v=>v.values.notes['software-judgment'].review='2026-02-30',v=>v.values.notes['software-judgment'].action='x'.repeat(1501),v=>v.values.notes['software-judgment'].stance='92%']){const copy=structuredClone(r);mutate(copy);assert.throws(()=>normalize(copy));}
 const copy=structuredClone(r);copy.values.notes['software-judgment'].secret='ignored';assert.equal(normalize(copy).values.notes['software-judgment'].secret,undefined);
});
test('every advertised need has a sourced path and speaker search works',()=>{
 for(const g of goals)assert.ok(selectClaims(g.id).length,g.id);
 assert.equal(selectClaims('all','Diogo')[0].id,'software-judgment');assert.equal(selectClaims('family').length,1);
 for(const c of claims){assert.ok(interviews[c.interview]);assert.ok(claims.some(x=>x.id===c.related));assert.match(interviews[c.interview].video,/^[A-Za-z0-9_-]{11}$/);assert.ok(Number.isInteger(c.start)&&c.start>=0);}
});
