import {test} from 'node:test';
import assert from 'node:assert/strict';
import core from '../../js/collector-core.js';
import {shareCopy,readShareSnapshot,createShareSession,wrapCardText,renderShareCanvas,canvasPNG} from '../../collector-assets/series-share-card.mjs';
import {buildSeries,seriesState} from './series-pages.mjs';
import {brands,locales,origin,route} from './content.mjs';

const series={id:'smiski-museum',title:'SMISKI Museum',names:['First style','Second style'],source:'https://smiski.com/e/products/museum/',checked:'2026-10-02',canonical:'https://thedollscout.com/series/smiski-museum',language:'en'};
const item=(patch={})=>({name:series.names[0],series:series.title,seriesId:series.id,styleId:core.styleId(series.names[0]),status:'owned',quantity:3,...patch});
const memory=(raw=null)=>({raw,getItem(key){assert.equal(key,core.COLLECTION_KEY);return this.raw;},setItem(){throw Error('Sharing must never write storage');}});
const png=()=>new Blob([new Uint8Array([137,80,78,71,13,10,26,10,0])],{type:'image/png'});

test('share counts aggregate actual owned quantities and exclude wishes, undo markers and other series',()=>{
 const items=[item(),item({quantity:2}),{name:series.names[0],series:series.title,status:'owned',quantity:4},item({status:'wish',quantity:8}),item({status:'wish',quantity:10,checklistMissing:true}),item({seriesId:'other-series',quantity:9}),item({name:'private unrelated note',series:'My own collection',seriesId:undefined,styleId:undefined,quantity:11})];
 const store=memory(core.backup(items)),before=store.raw;
 const card=readShareSnapshot(core,store,series).card;
 assert.equal(card.owned,1);assert.equal(card.missing,1);assert.equal(card.duplicates,8);
 assert.deepEqual(card.rows,[{name:'First style',quantity:9},{name:'Second style',quantity:0}]);
 assert.equal(store.raw,before);assert.doesNotMatch(JSON.stringify(card),/private unrelated|wishlist|price|notes|checklistMissing/);
 assert.deepEqual(readShareSnapshot(core,memory(core.backup(core.restore(before))),series).card,card);
});

test('empty storage is honestly empty; malformed and denied reads never become a zero collection',()=>{
 const empty=readShareSnapshot(core,memory(),series).card;
 assert.equal(empty.owned,0);assert.equal(empty.missing,2);assert.equal(empty.duplicates,0);
 for(const raw of ['', '{', 'null', '{"app":"wrong","version":1,"items":[]}'])assert.throws(()=>readShareSnapshot(core,memory(raw),series),{code:'read'});
 assert.throws(()=>readShareSnapshot(core,{getItem(){throw new DOMException('Denied','SecurityError');}},series),{code:'read'});
 assert.throws(()=>readShareSnapshot(core,memory(core.backup([item()])),{...series,names:[]}),{code:'read'});
});

function sessionFixture(options={}) {
 const storage=memory(core.backup([item()])),events=[],downloads=[];
 const session=createShareSession({read:()=>readShareSnapshot(core,storage,series),createPNG:async()=>png(),download:(blob,filename)=>{assert.equal(events.length,0);downloads.push({blob,filename});},record:name=>events.push(name),...options});
 return {storage,events,downloads,session};
}

test('preview emits nothing; only a valid PNG and initiated download emit the fixed completion',async()=>{
 const f=sessionFixture();const preview=await f.session.prepare();
 assert.equal(preview.card.duplicates,2);assert.deepEqual(f.events,[]);assert.deepEqual(f.downloads,[]);
 f.session.download();assert.deepEqual(f.events,['collector_series_export']);assert.equal(f.downloads[0].filename,'smiski-museum-en-collection.png');
 assert.equal(f.downloads[0].blob.type,'image/png');
});

test('a changed or unreadable ledger invalidates the preview and prevents stale download',async()=>{
 for(const raw of [core.backup([item({quantity:7})]),'{']){
  const f=sessionFixture();await f.session.prepare();f.storage.raw=raw;
  assert.throws(()=>f.session.download());assert.deepEqual(f.downloads,[]);assert.deepEqual(f.events,[]);
  f.storage.raw=core.backup([item()]);assert.equal(f.session.current(),null);
 }
 const f=sessionFixture();await f.session.prepare();f.session.invalidate();assert.throws(()=>f.session.download(),{code:'changed'});
});

test('changes during async PNG generation cannot publish an obsolete preview',async()=>{
 let finish;const f=sessionFixture({createPNG:()=>new Promise(resolve=>finish=resolve)});
 const pending=f.session.prepare();f.storage.raw=core.backup([item({quantity:12})]);finish(png());
 await assert.rejects(pending,{code:'changed'});assert.equal(f.session.current(),null);assert.deepEqual(f.events,[]);
 const g=sessionFixture({createPNG:()=>new Promise(resolve=>finish=resolve)});
 const interrupted=g.session.prepare();g.session.invalidate();finish(png());await assert.rejects(interrupted,{code:'changed'});
});

test('invalid PNGs, canvas failure and download failure never emit a completion',async()=>{
 for(const createPNG of [async()=>null,async()=>new Blob(['not a PNG'],{type:'image/png'}),async()=>new Blob(['<svg/>'],{type:'image/svg+xml'}),async()=>{throw Error('canvas');}]){
  const f=sessionFixture({createPNG});await assert.rejects(f.session.prepare(),{code:'image'});assert.deepEqual(f.events,[]);
 }
 const f=sessionFixture({download:()=>{throw Error('download');}});await f.session.prepare();assert.throws(()=>f.session.download(),{code:'image'});assert.deepEqual(f.events,[]);
 await assert.rejects(canvasPNG({toBlob(cb){cb(null);}}),{code:'image'});
});

test('long official names, localized labels and source URLs wrap without losing text',()=>{
 const text='一个很长的官方款式名称 / A long official style name and a https://example.com/very-long-source-path';
 const draws=[],ctx={font:'',measureText:t=>({width:Array.from(t).length*20}),fillRect(){},fillText(text,x,y){draws.push({text,x,y});}};
 const wrapped=wrapCardText(ctx,text,120);assert.equal(wrapped.join('').replace(/\s/g,''),text.replace(/\s/g,''));assert.ok(wrapped.every(line=>ctx.measureText(line).width<=120));
 assert.deepEqual(wrapCardText(ctx,'A shopping recommendation',300),['A shopping','recommendation']);
 for(const language of ['en','de','zh']){
  draws.length=0;const card={...readShareSnapshot(core,memory(core.backup([item()])),series).card,rows:[{name:text,quantity:3}],language};
  const canvas=renderShareCanvas(card,shareCopy[language],()=>({getContext:()=>ctx}));
  assert.equal(canvas.width,1080);assert.ok(canvas.height>800);assert.ok(draws.every(draw=>draw.y>=0&&draw.y+25<canvas.height));
  const drawn=draws.map(draw=>draw.text).join('').replace(/\s/g,'');
  for(const expected of [text,series.source,series.checked,series.canonical,shareCopy[language].note])assert.ok(drawn.includes(expected.replace(/\s/g,'')),expected);
 }
 assert.throws(()=>renderShareCanvas({},shareCopy.en,()=>({getContext:()=>null})),{code:'image'});
});

test('all official series in every language expose the localized preview with accurate public metadata',()=>{
 const outputs=[];
 const esc=value=>String(value).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
 buildSeries({brands,locales,origin,route,esc,write(){},emit:(...args)=>outputs.push(args)});
 const pages=outputs.filter(([,slug])=>slug.startsWith('series/'));
 assert.equal(pages.length,seriesState.series.length*3);
 for(const [language,slug,,,body,text] of pages){
  const official=seriesState.series.find(s=>'series/'+s.id===slug);
  const config=JSON.parse(body.match(/data-share-config>(.*?)<\/script>/s)[1]);
  assert.deepEqual(config.names,official.names);assert.equal(config.checked,official.checked);assert.equal(config.source,official.source);assert.equal(config.canonical,origin+route(language,slug));
  assert.match(body,/href="#share-card"/);assert.match(body,/data-share-download disabled/);assert.match(body,/data-share-status role="status"/);
  assert.ok(body.includes(shareCopy[language].note));assert.ok(text.includes(shareCopy[language].intro));
 }
});
