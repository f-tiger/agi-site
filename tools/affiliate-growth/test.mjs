import test from 'node:test';import assert from 'node:assert/strict';
import {scenario,verifiedEpc} from './model.mjs';
test('unit economics invert the entire funnel and do not equate commission with GMV',()=>{
 const r=scenario({targetUsd:1000,approvedCommissionUsd:9,merchantConversion:.05,eligibleVisitClickRate:.15});
 assert.equal(r.approvedTransactions,112);assert.equal(r.merchantClicks,2223);assert.equal(r.eligibleLandingVisits,14815);
 for(const n of [0,-1,NaN,Infinity])assert.throws(()=>scenario({targetUsd:1000,approvedCommissionUsd:n,merchantConversion:.05,eligibleVisitClickRate:.15}));
 assert.throws(()=>scenario({targetUsd:1000,approvedCommissionUsd:9,merchantConversion:5,eligibleVisitClickRate:.15}));
});
test('shared tags cannot create site-attributed revenue, and no clicks keeps EPC unknown',()=>{
 const a={market:'de',start:'2026-09-01',end:'2026-09-28',currency:'EUR',clicks:0,commission:0,siteExclusive:false};
 assert.equal(verifiedEpc(a).commissionPerClick,null);assert.equal(verifiedEpc(a).scope,'account_only_not_eco_attributable');
 assert.equal(verifiedEpc({...a,clicks:10,commission:-2}).commissionPerClick,-.2);
 assert.throws(()=>verifiedEpc({...a,customerEmail:'private@example.org'}));
 assert.throws(()=>verifiedEpc({...a,start:'2026-09-31'}));
});
