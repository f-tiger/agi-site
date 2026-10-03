import test from 'node:test';import assert from 'node:assert/strict';
import {blank,normalize,emptyNote,PRODUCT,selectClaims,sourceUrl,inWindow,reviewedCounts} from '../../foresight-assets/core.mjs';
import {claims,goals,interviews} from '../../foresight-assets/catalog.mjs';
test('portable records reject unknown products, arbitrary fields, malformed dates and excessive text',()=>{
 const r={version:1,product:PRODUCT,values:blank()};r.values.saved=['software-judgment'];r.values.notes['software-judgment']={...emptyNote(),action:'Check a real task',review:'2026-10-20'};assert.deepEqual(normalize(r),r);
 for(const mutate of [v=>v.product='work-mentor',v=>v.values.saved.push('untrusted'),v=>v.values.notes['software-judgment'].review='2026-02-30',v=>v.values.notes['software-judgment'].action='x'.repeat(1501),v=>v.values.notes['software-judgment'].stance='92%']){const copy=structuredClone(r);mutate(copy);assert.throws(()=>normalize(copy));}
 const copy=structuredClone(r);copy.values.notes['software-judgment'].secret='ignored';assert.equal(normalize(copy).values.notes['software-judgment'].secret,undefined);
});
test('every advertised need has a sourced path and speaker search works',()=>{
 for(const g of goals)assert.ok(selectClaims(g.id).length,g.id);
 assert.equal(selectClaims('all','Diogo')[0].id,'software-judgment');assert.ok(selectClaims('family').length>=5);
 for(const c of claims){assert.ok(interviews[c.interview]);assert.ok(claims.some(x=>x.id===c.related));const i=interviews[c.interview];if(i.video)assert.match(i.video,/^[A-Za-z0-9_-]{11}$/);assert.ok(c.start===null&&c.locator||Number.isInteger(c.start)&&c.start>=0);assert.match(sourceUrl(i,c.start),/^https:/);for(const lang of ['en','zh'])for(const key of ['title','short','summary','question','limit','test','scenario'])assert.ok(c[lang][key]);}
});

test('freshness windows use source publication and preserve the old collection',()=>{
 assert.deepEqual(reviewedCounts,{interviews:16,claims:30,recent:14});
 const selected=selectClaims('all','',null,{asOf:'2026-10-03'});assert.equal(selected[0].interview,'airbnb');
 assert.ok(inWindow('2026-09-04','30','2026-10-03'));assert.ok(!inWindow('2026-09-03','30','2026-10-03'));
 assert.ok(!inWindow('2026-10-04','all','2026-10-03'));assert.ok(!inWindow('bad','all','2026-10-03'));
 assert.equal(selectClaims('all','',null,{window:'archive',asOf:'2026-10-03'}).length,3);
 assert.equal(new Set(claims.map(c=>c.id)).size,claims.length);
 assert.equal(new Set(Object.values(interviews).map(i=>i.source)).size,16);
 assert.equal(interviews.leah.date,'2026-09-14');assert.ok(interviews.leah.dateNote.zh.includes('9 月 29'));
 assert.ok(!sourceUrl(interviews.airbnb).includes('youtube'));assert.ok(!sourceUrl(interviews.platt,null).includes('&t='));
});

import fs from 'node:fs';
import {contentItems,selectedItems,discoveryCards,videoId} from '../../foresight-assets/discovery.mjs';
test('media classification overrides podcast syndication, preserves reviewed views and deduplicates videos',()=>{
 const data=JSON.parse(fs.readFileSync(new URL('../../foresight-assets/discovery.json',import.meta.url)));
 const items=contentItems(data);assert.equal(items.filter(i=>i.interview==='devday').length,1);assert.equal(items.find(i=>i.interview==='devday').medium,'video');
 const videos=items.filter(i=>i.medium==='video'&&i.video);assert.ok(videos.length>=300);assert.equal(new Set(videos.map(i=>i.video)).size,videos.length);
 assert.ok(new Set(videos.map(i=>i.publisher)).size>=30);assert.ok(videos.some(i=>i.language==='zh'));
 const creator=selectedItems(data,{creator:'Matt Wolfe',asOf:'2026-10-03'});assert.ok(creator.length);assert.ok(creator.every(i=>i.publisher==='Matt Wolfe'));
 assert.ok(data.items.every(i=>!i.url.includes('/shorts/')));
 assert.equal(items.filter(i=>i.views.length).length,16);assert.equal(items.reduce((n,i)=>n+i.views.length,0),30);
 for(const medium of ['video','audio','text']){const matches=selectedItems(data,{medium,asOf:'2026-10-03'});assert.ok(matches.length);assert.ok(matches.every(i=>i.medium===medium));}
 assert.equal(selectedItems(data,{medium:'audio',goal:'family',query:'Belsky',asOf:'2026-10-03'})[0].id,'leah');
 const html=discoveryCards(data,'zh',{medium:'audio'},4);assert.match(html,/观点重点/);assert.match(html,/学习也需要连接/);assert.ok(!html.includes('media-poster'));assert.match(html,/节目简介（出版方原文）/);
 assert.equal(videoId('https://evil.test/watch?v=abcdefghijk'),null);assert.equal(videoId('https://www.youtube.com/watch?v=abcdefghijk'),'abcdefghijk');
 const evil={sources:[{id:'test',name:'Publisher',language:'en'}],items:[{id:'test',sourceId:'test',url:'https://example.com/source',title:'<script>alert(1)</script>',medium:'audio',publishedAt:'2026-10-03T00:00:00Z',goals:['work'],publisherExcerpt:'<img onerror="evil()">',audioUrl:'javascript:alert(1)'}]};
 const safe=discoveryCards(evil,'en',{medium:'audio',query:'alert'},4);assert.ok(!safe.includes('<script>')&&!safe.includes('data-play-audio'));assert.match(safe,/&lt;script&gt;/);
});
