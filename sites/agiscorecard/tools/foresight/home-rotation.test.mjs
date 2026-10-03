import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {contentItems} from '../../foresight-assets/discovery.mjs';
import {homeSnapshot} from '../../foresight-assets/home.mjs';
import {rotationDay,rotationPool,homeEdition,renderHomeFeature,renderHomePicks} from '../../home-focus/rotation.mjs';

const data=JSON.parse(fs.readFileSync(new URL('../../foresight-assets/discovery.json',import.meta.url)));
const items=contentItems(data),pool=rotationPool(items),start=Date.parse(rotationDay(data.checkedAt)+'T04:00:00Z'),DAY=86400000;
const ids=e=>Object.fromEntries(Object.entries(e.recommendations).map(([l,vs])=>[l,vs.map(v=>v.video)]));

test('editorial day changes at Beijing midnight, independently of the visitor timezone',()=>{
 assert.equal(rotationDay('2026-10-03T15:59:59Z'),'2026-10-03');
 assert.equal(rotationDay('2026-10-03T16:00:00Z'),'2026-10-04');
 assert.equal(rotationDay('2026-10-03T09:00:00-07:00'),'2026-10-04');
 assert.throws(()=>rotationDay('invalid'));
 assert.deepEqual(homeEdition(pool,'2026-10-03T00:00:00+08:00'),homeEdition(pool,'2026-10-03T23:59:59+08:00'));
});

test('100 daily editions rotate the main video through freshness cutoffs without adjacent repeats',()=>{
 const original=JSON.stringify(pool),heroes=new Set(),publishers=new Set(),topics=new Set();let previous;
 for(let day=0;day<100;day++){
  const e=homeEdition(pool,start+day*DAY),picks=ids(e);
  assert.notEqual(e.feature.video,previous?.feature.video,e.day+' does not repeat yesterday');
  assert.ok(e.feature.date<=e.day);assert.ok(e.feature.views.some(v=>v.id===e.view.id));
  heroes.add(e.feature.video);publishers.add(e.feature.publisher);e.feature.goals.forEach(g=>topics.add(g));
  for(const lang of ['en','zh']){
   assert.equal(picks[lang].length,4,e.day+' '+lang);assert.equal(new Set(picks[lang]).size,4);
   assert.ok(!picks[lang].includes(e.feature.video));assert.ok(e.recommendations[lang].every(v=>v.language===lang&&v.date<=e.day));
   if(previous)assert.notDeepEqual([...picks[lang]].sort(),[...ids(previous)[lang]].sort(),e.day+' changes the card selection');
  }
  previous=e;
 }
 assert.ok(heroes.size>=8);assert.ok(publishers.size>=3);assert.ok(topics.size>=3);
 assert.equal(JSON.stringify(pool),original,'selection never rewrites source dates or evidence');
});

test('both languages share the selected video and its actual reviewed summary',()=>{
 const snapshot=homeSnapshot(data,{now:start}),e=homeEdition(snapshot.rotation,start);
 assert.equal(snapshot.checkedAt,data.checkedAt);assert.equal(snapshot.editionDay,e.day);
 for(const lang of ['en','zh']){
  const html=snapshot.locales[lang].feature;
  assert.ok(html.includes('data-home-video="'+e.feature.video+'"'));
  assert.ok(html.includes('/future-guide/'+e.view.id));assert.ok(html.includes(e.feature.date));assert.ok(!html.includes('<iframe'));
  for(const i of e.recommendations[lang])assert.ok(items.some(v=>v.video===i.video&&v.date===i.date));
 }
 const tomorrow=homeSnapshot(data,{now:start+DAY});assert.equal(tomorrow.checkedAt,snapshot.checkedAt);
 assert.notEqual(tomorrow.locales.en.feature,snapshot.locales.en.feature);
});

test('malformed, duplicate and future sources cannot become featured evidence; sparse pools degrade safely',()=>{
 const base=structuredClone(pool.videos.find(v=>v.views.length));
 const valid={...base,date:'2026-09-30'};
 const dirty={version:1,videos:[valid,valid,null,{...valid,video:'bad<script>'},{...valid,video:'future00001',date:'2027-01-01'},{...valid,video:'badDate0001',date:'2026-02-31'}]};
 const e=homeEdition(dirty,'2026-10-03T04:00:00Z');assert.equal(e.feature.video,valid.video);assert.equal(e.recommendations[valid.language].length,0);
 assert.equal(homeEdition({version:1,videos:[]},start),null);
 assert.equal(homeEdition({version:1,videos:[{...valid,views:[{id:'../oops'}]}]},start),null);
 assert.throws(()=>homeEdition({version:2,videos:[]},start));
 const injected={...valid,video:'safeVideo01',title:'<script>alert(1)</script>',publisher:'<img onerror="bad()">',views:[]};
 const render={...e,recommendations:{en:[injected],zh:[]}};
 assert.ok(!renderHomePicks(render,'en').includes('<script>'));assert.match(renderHomePicks(render,'en'),/&lt;script&gt;/);
 const feature={...e,feature:{...e.feature,title:injected.title},view:{...e.view,en:{title:injected.title,summary:injected.title}}};
 assert.ok(!renderHomeFeature(feature,'en').includes('<script>'));
});
