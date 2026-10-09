import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {commercialEvidence as e,COMMERCIAL_CLAIM as id,COMMERCIAL_VERSION as version,emptyFit,qualifies,normalizeCommercial,boundedPlan,commercialMarkup,commercialText} from '../../foresight-assets/commercial.mjs';
import {blank,emptyNote,normalize,PRODUCT,reviewedCounts} from '../../foresight-assets/core.mjs';
import {reviewed} from '../../foresight-assets/catalog.mjs';
import {selectedItems,discoveryStatus} from '../../foresight-assets/discovery.mjs';
test('commercial receipt joins a real discovered video without adding or regrading interviews',()=>{
 const d=JSON.parse(fs.readFileSync(new URL('../../foresight-assets/discovery.json',import.meta.url))),item=d.items.find(x=>x.id===e.discoveryId);
 assert.equal(item.videoId,e.videoId);assert.equal(item.publishedAt,e.publishedAt);assert.equal(item.firstSeenAt,e.firstSeenAt);
 assert.deepEqual(reviewedCounts,{interviews:16,claims:30,recent:14});assert.equal(reviewed,'2026-10-03');
 assert.equal(selectedItems(d,{goal:'earn',medium:'video'}).filter(x=>x.views.length).length,8);
 assert.equal(discoveryStatus(d,'en',Date.parse(d.checkedAt)+37*3600000).split(' · ')[0],'Update overdue');
 assert.equal(e.checkedAt,'2026-10-09');assert.deepEqual(e.rows.map(r=>r.kind),['participant_account','participant_account','official_offer']);
 assert.equal(commercialMarkup('deployable-trust','en'),'');
});
test('two frozen fit cases allow only a bounded existing-workflow check',()=>{
 const fit={recurring:true,records:true,owner:true};assert.ok(qualifies(fit));assert.ok(!qualifies(emptyFit()));
 for(const key of Object.keys(fit)){assert.ok(!qualifies({...fit,[key]:false}));assert.ok(!qualifies({...fit,[key]:null}));}
 for(const lang of ['en','zh']){const text=commercialText({version,fit},lang);assert.match(text,/openrouter.ai\/pricing/);assert.match(text,/29:09/);assert.match(text,/5.5%/);assert.match(text,/workflow-maintenance/);assert.ok(boundedPlan(lang).action);const no=commercialText({version,fit:{recurring:false,records:null,owner:null}},lang);assert.ok(!no.includes('/earn/cases/'));assert.match(no,/No maintenance|不推荐/);}
});
test('old records survive, explicit evidence roundtrips, unknown or corrupt evidence fails closed without losing the plan',()=>{
 const r={version:1,product:PRODUCT,values:blank()};r.values.saved=[id];r.values.notes[id]={...emptyNote(),task:'Existing task',action:'Existing action',counter:'Existing stop condition',review:'2026-10-12',done:true};assert.deepEqual(normalize(r),r);
 const next=structuredClone(r);next.values.notes[id].commercial={version,fit:{recurring:true,records:true,owner:true},url:'https://untrusted.test'};
 const normalized=normalize(next);assert.equal(normalized.values.notes[id].commercial.url,undefined);assert.equal(normalized.values.notes[id].review,'2026-10-12');assert.equal(normalized.values.notes[id].done,true);assert.deepEqual(normalize(JSON.parse(JSON.stringify(normalized))),normalized);
 for(const commercial of [{version:'future-unknown',fit:emptyFit()},{version,fit:{recurring:'yes',records:true,owner:true}},{version,fit:null}]){const bad=structuredClone(r);bad.values.notes[id].commercial=commercial;const result=normalize(bad);assert.deepEqual(result.values.notes[id],{...r.values.notes[id],commercial:{version:'unavailable'}});assert.ok(!commercialText(result.values.notes[id].commercial,'en').includes('/earn/cases/'));}
 assert.deepEqual(normalizeCommercial({version,fit:emptyFit()},'software-judgment'),{version:'unavailable'});
});
test('static sources, receipt wording, schema and bilingual mirrors keep commercial claims bounded',()=>{
 for(const lang of ['en','zh']){const h=commercialMarkup(id,lang);assert.ok(h.includes('id="commercial-case"'));assert.match(h,/id="commercial-case"[^>]*hidden/);assert.ok(!h.includes('data-verified'));assert.ok(h.includes('36'));assert.ok(h.includes('28'));}
 const source=fs.readFileSync(new URL('../../foresight-assets/app.mjs',import.meta.url),'utf8');const tracking=source.slice(source.indexOf('function event('),source.indexOf('function capture('));assert.ok(!tracking.includes('commercial'));assert.ok(!tracking.includes('fit'));
 const policy=fs.readFileSync(new URL('../../../../docs/agi-earn-launch-2026-09-30.md',import.meta.url),'utf8');for(const s of ['28 complete days','≥300','≥30','≥10','≥5'])assert.ok(policy.includes(s));
});
