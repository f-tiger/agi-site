import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {contentItems} from '../../foresight-assets/discovery.mjs';
import {homeSnapshot} from '../../foresight-assets/home.mjs';
import {rotationDay,rotationPool,homeEdition,renderHomeFeature,renderHomePicks} from '../../home-focus/rotation.mjs';
const data=JSON.parse(fs.readFileSync(new URL('../../foresight-assets/discovery.json',import.meta.url)));
const pool=rotationPool(contentItems(data)),base=pool.videos.find(v=>v.views.length);
const old={...base,video:'oldVideo001',date:'2026-09-17',publishedAt:'2026-09-17T09:00:00Z'};
const recent={...base,video:'newVideo001',date:'2026-11-13',publishedAt:'2026-11-13T09:00:00Z',views:[],title:'Fixture new publication',publisherExcerpt:'An attributed publisher excerpt.'};
const newer={...recent,video:'newVideo002',publishedAt:'2026-11-13T10:00:00Z'};
const fixture={version:1,videos:[old,recent,newer]};

test('edition labels use Beijing dates without rewriting source publication dates',()=>{
 assert.equal(rotationDay('2026-11-13T15:59:59Z'),'2026-11-13');
 assert.equal(rotationDay('2026-11-13T16:00:00Z'),'2026-11-14');
 assert.throws(()=>rotationDay('invalid'));
 const today=homeEdition(fixture,'2026-11-13T12:00:00Z'),tomorrow=homeEdition(fixture,'2026-11-14T12:00:00Z');
 assert.equal(today.feature.video,'newVideo002');assert.equal(tomorrow.feature.video,today.feature.video);
 assert.equal(tomorrow.feature.date,'2026-11-13','no new publication means no invented freshness or old-video rotation');
});

test('the main card chooses the newest original timestamp even without a reviewed summary',()=>{
 const original=JSON.stringify(fixture),e=homeEdition(fixture,'2026-11-13T12:00:00Z');
 assert.equal(e.feature.video,'newVideo002');assert.equal(e.view,null);
 assert.equal(homeEdition({version:1,videos:[recent]},'2026-11-13T12:00:00Z').feature.video,'newVideo001','unreviewed-only feeds remain useful');
 assert.equal(JSON.stringify(fixture),original);
 for(const lang of ['en','zh'])assert.ok(!e.recommendations[lang].some(v=>v.video===e.feature.video));
});

test('both hero translations attribute publisher text and link to the exact new episode',()=>{
 const e=homeEdition(fixture,'2026-11-13T12:00:00Z');
 for(const lang of ['en','zh']){
  const html=renderHomeFeature(e,lang);
  assert.ok(html.includes('data-home-video="newVideo002"'));
  assert.ok(html.includes('?watch=newVideo002#fresh'));assert.ok(html.includes('2026-11-13'));
  assert.ok(html.includes(recent.publisherExcerpt));assert.ok(html.includes(lang==='en'?'Summary pending review':'观点总结待核对'));
  assert.ok(!html.includes('/undefined'));assert.ok(!html.includes('<iframe'));
 }
 const reviewed=homeEdition({version:1,videos:[old]},'2026-11-13T12:00:00Z');
 assert.ok(renderHomeFeature(reviewed,'en').includes('/future-guide/'+reviewed.view.id));
 assert.ok(renderHomeFeature(reviewed,'en').includes(reviewed.view.en.summary));
});

test('a same-day source update changes the prominent main card, not just lower recommendations',()=>{
 const before=homeEdition({version:1,videos:[old,recent]},'2026-11-13T12:00:00Z');
 const after=homeEdition(fixture,'2026-11-13T12:00:00Z');
 assert.equal(before.day,after.day);assert.equal(before.feature.video,'newVideo001');assert.equal(after.feature.video,'newVideo002');
 assert.equal(after.view,null);assert.equal(after.feature.publisherExcerpt,recent.publisherExcerpt);
});

test('malformed and future references are excluded and publisher text is escaped',()=>{
 const dirty={version:1,videos:[recent,recent,null,{...recent,video:'bad<script>'},{...recent,video:'future00001',date:'2027-01-01'},{...recent,video:'badDate0001',date:'2026-02-31'}]};
 const e=homeEdition(dirty,'2026-11-13T12:00:00Z');assert.equal(e.feature.video,'newVideo001');assert.equal(e.recommendations[recent.language].length,0);
 assert.equal(homeEdition({version:1,videos:[]}),null);assert.throws(()=>homeEdition({version:2,videos:[]}));
 const noView=homeEdition({version:1,videos:[{...recent,views:[{id:'../oops'}]}]},'2026-11-13T12:00:00Z');assert.equal(noView.view,null);
 const hostile={...e,feature:{...recent,title:'<script>bad()</script>',publisher:'<img onerror="bad()">',publisherExcerpt:'<script>bad()</script>'},view:null};
 assert.ok(!renderHomeFeature(hostile,'en').includes('<script>'));assert.match(renderHomeFeature(hostile,'en'),/&lt;script&gt;/);
 assert.ok(!renderHomePicks({...e,recommendations:{en:[hostile.feature],zh:[]}},'en').includes('<script>'));
});

test('the generated bilingual snapshot uses the same latest source and keeps source-check dates separate',()=>{
 const snapshot=homeSnapshot(data,{now:data.checkedAt}),e=homeEdition(snapshot.rotation,data.checkedAt);
 assert.equal(snapshot.checkedAt,data.checkedAt);
 for(const lang of ['en','zh']){
  assert.ok(snapshot.locales[lang].feature.includes('data-home-feature="'+e.feature.video+'"'));
  assert.ok(snapshot.locales[lang].feature.includes(e.feature.date));
 }
});
