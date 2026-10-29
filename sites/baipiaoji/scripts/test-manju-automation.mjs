import {workURL,validateWorkEvidence} from './manju-work-urls.mjs';
import {buildWorkPages} from './manju-work-pages.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {refresh} from './manju-sync.mjs';import {validateManju} from './manju-catalog.mjs';import '../assets/manju-search.js';
const read=n=>JSON.parse(readFileSync(new URL('../data/'+n,import.meta.url))),catalog=read('manju.json'),insights=read('manju-insights.json');
const payload={checkedAt:insights.reviewedAt,checkedAtTime:insights.reviewedAt+'T08:00:00Z',cohorts:insights.cohorts.filter(c=>c.metric==='snapshot_heat').map(c=>({kind:c.id.includes('comic')?'comic-drama':'ai-drama',observedAt:insights.reports.find(r=>r.id===c.reportId).observedAt,records:c.records,sourcePages:c.sourcePages}))};
test('refresh is idempotent, retains catalogue and refreshes source provenance',()=>{const a=refresh(catalog,insights,payload),b=refresh(a.catalog,a.insights,payload);assert.equal(b.added,0);assert.equal(a.catalog.items.length,b.catalog.items.length);assert.equal(validateManju(b.catalog).records,b.catalog.items.length);});
// Synthetic variants of a persisted Oct22 identity reproduce the failure path;
// the failed Oct28 source payload was not saved, so these are not source claims.
const renamedId='hg-7691938290202577944',renamedURL='https://hongguoduanju.com/detail?series_id=7691938290202577944';
test('a synthetic title change for one official ID updates in place and remains idempotent',()=>{
 const p=structuredClone(payload),row=p.cohorts.flatMap(c=>c.records).find(r=>r.url===renamedURL),original=catalog.items.find(x=>x.id===renamedId);
 row.title='合成身份回归新标题第一季';const before=JSON.stringify([catalog,insights,p]);
 const a=refresh(catalog,insights,p),x=a.catalog.items.find(x=>x.id===renamedId),b=refresh(a.catalog,a.insights,p);
 assert.equal(a.added,0);assert.equal(a.catalog.items.length,catalog.items.length);assert.equal(x.title,row.title);assert.equal(x.seriesTitle,'合成身份回归新标题');
 assert.equal(x.firstSeenAt,original.firstSeenAt);assert.equal(x.destination,original.destination);assert.equal(workURL(x),workURL(original));
 assert.equal(a.catalog.items.filter(x=>x.id===renamedId).length,1);assert.deepEqual(a.catalog,b.catalog);assert.deepEqual(a.insights,b.insights);
 assert.equal(JSON.stringify([catalog,insights,p]),before);assert.ok(a.changes.every(c=>c.newEntries===0));
});
test('two boards retain distinct titles and metrics for one ID with a deterministic current title',()=>{
 const p=structuredClone(payload),ai=p.cohorts.find(c=>c.kind==='ai-drama'),comic=p.cohorts.find(c=>c.kind==='comic-drama');
 const a=ai.records[0],b=comic.records.find(r=>r.url===renamedURL);a.url=renamedURL;a.title='合成AI榜记录名';b.title='合成漫剧榜记录名';
 const result=refresh(catalog,insights,p),work=result.catalog.items.find(x=>x.id===renamedId),reverse=refresh(catalog,insights,{...p,cohorts:[...p.cohorts].reverse()});
 assert.equal(work.title,b.title);assert.deepEqual(result.catalog,reverse.catalog);assert.equal(work.searchEvidence.length,2);
 for(const [kind,row] of [['ai-drama',a],['comic-drama',b]]){const e=work.searchEvidence.find(e=>e.kind===kind);assert.equal(e.title,row.title);assert.equal(e.rank,row.sourceRank);assert.equal(e.heat,row.value);assert.equal(e.url,renamedURL);}
 const next=structuredClone(payload);next.cohorts.find(c=>c.kind==='comic-drama').records.find(r=>r.url===renamedURL).title='合成后续标题';
 const refreshed=refresh(result.catalog,result.insights,next),retained=refreshed.catalog.items.find(x=>x.id===renamedId);
 assert.equal(retained.title,'合成后续标题');assert.deepEqual(retained.searchEvidence.find(e=>e.kind==='ai-drama'),work.searchEvidence.find(e=>e.kind==='ai-drama'));
 assert.equal(workURL(retained),workURL(work));
 const exported=new Map(),pages=new Map();buildWorkPages({catalog:refreshed.catalog,insights:refreshed.insights,publish:(id,html)=>pages.set(id,html),page:x=>x.body,write:(path,body)=>exported.set(path,body),external:(u,label)=>label,plotFor:()=>null,save:()=>''});
 assert.match(pages.get(renamedId),/榜单中的记录名/);assert.ok(pages.get(renamedId).includes(a.title));assert.ok(exported.get('manju/'+renamedId+'.md').includes('来源记录名'));assert.ok(exported.get('manju/'+renamedId+'.md').includes(a.title));
 const json=JSON.parse(exported.get('manju/'+renamedId+'.json'));assert.equal(json.name,'合成后续标题');assert.equal(json.observations.find(e=>e.kind==='ai-drama').title,a.title);
 // Synthetic next-day observation, relative to the persisted fixture rather than a calendar deadline.
 const latest=[p.checkedAt,...p.cohorts.map(c=>c.observedAt)].sort().at(-1),newerDate=new Date(Date.parse(latest+'T00:00:00Z')+86400000).toISOString().slice(0,10);
 const newer=structuredClone(p);newer.cohorts.find(c=>c.kind==='ai-drama').observedAt=newerDate;newer.checkedAt=newerDate;newer.checkedAtTime=newerDate+'T08:00:00Z';
 const newest=refresh(catalog,insights,newer).catalog.items.find(x=>x.id===renamedId);assert.equal(newest.title,a.title);assert.equal(newest.lastSeenAt,newerDate);
});
test('different official IDs sharing a normalized title fail without changing prior data',()=>{
 const p=structuredClone(payload),row=p.cohorts.flatMap(c=>c.records).find(r=>r.url===renamedURL),before=JSON.stringify([catalog,insights]);
 row.url='https://hongguoduanju.com/detail?series_id=123456788';
 assert.throws(()=>refresh(catalog,insights,p),/Conflicting official title identity/);assert.equal(JSON.stringify([catalog,insights]),before);
 const collision=structuredClone(payload),incoming=collision.cohorts.flatMap(c=>c.records).find(r=>r.url===renamedURL);
 incoming.title=catalog.items.find(x=>x.evidence?.sourceKind==='hongguo-ranking'&&x.id!==renamedId).title;
 assert.throws(()=>refresh(catalog,insights,collision),/Conflicting official title identity/);
});
test('a new official ID appearing under two synthetic board titles is added only once',()=>{
 const p=structuredClone(payload),url='https://hongguoduanju.com/detail?series_id=987654320';
 for(const c of p.cohorts){c.records[0].url=url;c.records[0].title=c.kind==='ai-drama'?'合成新身份AI榜名':'合成新身份漫剧榜名';}
 const result=refresh(catalog,insights,p),work=result.catalog.items.find(x=>x.id==='hg-987654320');
 assert.equal(result.added,1);assert.equal(result.catalog.items.length,catalog.items.length+1);assert.equal(result.catalog.items.filter(x=>x.destination===url).length,1);assert.equal(work.searchEvidence.length,2);assert.equal(work.title,'合成新身份漫剧榜名');
 assert.equal(refresh(result.catalog,result.insights,p).added,0);
});
test('a different ID cannot reuse an earlier board title after the first work changes name',()=>{
 const p=structuredClone(payload),ai=p.cohorts.find(c=>c.kind==='ai-drama'),comic=p.cohorts.find(c=>c.kind==='comic-drama');
 ai.records[0].url=renamedURL;ai.records[0].title='合成先前榜名';
 comic.records.find(r=>r.url===renamedURL).title='合成后续榜名';
 comic.records.at(-1).url='https://hongguoduanju.com/detail?series_id=987654311';comic.records.at(-1).title='合成先前榜名';
 const before=JSON.stringify([catalog,insights,p]);
 assert.throws(()=>refresh(catalog,insights,p),/Conflicting official title identity/);
 assert.throws(()=>refresh(catalog,insights,p),/Conflicting official title identity/);
 assert.equal(JSON.stringify([catalog,insights,p]),before);
});
test('duplicate IDs inside one board and excluded renamed titles cannot hide behind a merge',()=>{
 const p=structuredClone(payload),rows=p.cohorts[0].records;rows[1].url=rows[0].url;rows[1].title='合成同榜重复身份';assert.throws(()=>refresh(catalog,insights,p),/Duplicate official work in cohort/);
 const excluded=structuredClone(payload),ai=excluded.cohorts.find(c=>c.kind==='ai-drama').records[0];ai.url=renamedURL;ai.title='桃 花 簪';
 assert.throws(()=>refresh(catalog,insights,excluded),/Invalid official work identity\/title/);
});
test('official retained evidence binds exact series identity while nonofficial evidence still binds title',()=>{
 const copy=structuredClone(catalog),official=copy.items.find(x=>x.id===renamedId);official.searchEvidence[0].title='合成历史来源名';assert.doesNotThrow(()=>validateWorkEvidence(copy));
 official.searchEvidence[0].url='https://hongguoduanju.com/detail?series_id=123456788';assert.throws(()=>validateWorkEvidence(copy));
 const wrongDestination=structuredClone(catalog),x=wrongDestination.items.find(x=>x.id===renamedId);x.destination='https://hongguoduanju.com/detail?series_id=123456788';assert.throws(()=>validateWorkEvidence(wrongDestination));
 const other=structuredClone(catalog),nonofficial=other.items.find(x=>x.searchEvidence&&x.evidence?.sourceKind!=='hongguo-ranking');nonofficial.searchEvidence[0].title='合成不同作品';assert.throws(()=>validateWorkEvidence(other));
});
test('new official titles enter directory and remain after leaving the current ranking',()=>{const p=structuredClone(payload),row=p.cohorts[0].records[0];row.title='测试原创记录';row.url='https://hongguoduanju.com/detail?series_id=123456789';const a=refresh(catalog,insights,p);assert.ok(a.catalog.items.some(x=>x.id==='hg-123456789'));const b=refresh(a.catalog,a.insights,payload);assert.ok(b.catalog.items.some(x=>x.id==='hg-123456789'));assert.ok(!b.insights.cohorts.some(c=>c.records.some(r=>r.title==='测试原创记录')));});
test('invalid or incomplete batches cannot mutate previous good data',()=>{const before=JSON.stringify([catalog,insights]);for(const mutate of [p=>p.cohorts.pop(),p=>p.cohorts[0].records.pop(),p=>p.cohorts[0].observedAt='2020-01-01',p=>p.cohorts[0].records[0].url='https://evil.test/',p=>p.cohorts[0].records[0].title='桃花簪',p=>p.cohorts[0].records[0].thumbnail.url='https://evil.test/a.png']){const p=structuredClone(payload);mutate(p);assert.throws(()=>refresh(catalog,insights,p));assert.equal(JSON.stringify([catalog,insights]),before);}});
test('query supports multi-term AND, aliases, normalization and exact-title priority',()=>{const S=globalThis.ManjuSearch,work={title:'重生归来',genre:'仙侠',tags:['逆袭','修真'],search:'重生归来 仙侠 逆袭 修真'};assert.ok(S.score(work,'重生 逆袭'));assert.ok(S.score(work,'修仙'));assert.equal(S.score(work,'重生 恋爱'),0);assert.ok(S.score(work,'重生归来')>S.score({...work,title:'其他作品'},'重生归来'));assert.equal(S.score(work,'<img onerror=alert(1)>'),0);});
test('recommendations exclude seeds, respect channel and explain matches',()=>{const S=globalThis.ManjuSearch,items=[{id:'a',title:'甲',category:'urban',genre:'都市',channel:'stories',tags:['逆袭']},{id:'b',title:'乙',category:'urban',genre:'都市',channel:'stories',tags:['逆袭']},{id:'c',title:'丙',category:'urban',genre:'都市',channel:'culture',tags:['逆袭']}];const results=S.related(null,items,['a']);assert.deepEqual(results.map(r=>r.id),['b']);assert.ok(results[0].reason.includes('逆袭'));assert.deepEqual(S.related(null,items,[]),[]);});

test('new top entries get stable detail pages and retained evidence when off the next board',()=>{const p=structuredClone(payload),row=p.cohorts[0].records[0];row.title='测试新入榜作品';row.url='https://hongguoduanju.com/detail?series_id=987654321';const a=refresh(catalog,insights,p),x=a.catalog.items.find(x=>x.id==='hg-987654321');assert.ok(x.searchEvidence.length);const url=workURL(x);assert.equal(url,'https://baipiaoji.com/manju/hg-987654321');const b=refresh(a.catalog,a.insights,payload),retained=b.catalog.items.find(y=>y.id===x.id);assert.equal(workURL(retained),url);assert.deepEqual(retained.searchEvidence,x.searchEvidence);const exported=new Map();buildWorkPages({catalog:b.catalog,insights:b.insights,publish(){},page:x=>x.body,write:(p,s)=>exported.set(p,s),external:(u,label)=>label,plotFor:()=>null,save:()=>''});const json=JSON.parse(exported.get('manju/'+x.id+'.json'));assert.equal(json.currentlyInVerifiedSnapshot,false);assert.ok(exported.get('manju/'+x.id+'.md').includes('保留历史快照'));});
test('retained detail evidence rejects untrusted sources and invalid metrics',()=>{for(const edit of [e=>e.source='https://evil.test',e=>e.url='javascript:alert(1)',e=>e.rank=0,e=>e.heat=-1,e=>e.observedAt='2099-01-01',e=>e.title='不同作品']){const copy=structuredClone(catalog);edit(copy.items.find(x=>x.searchEvidence).searchEvidence[0]);assert.throws(()=>validateWorkEvidence(copy));}});

test('older snapshots are rejected for either board without mutating the inputs',()=>{
 for(const kind of ['ai-drama','comic-drama']){
  const p=structuredClone(payload),board=p.cohorts.find(c=>c.kind===kind);
  board.observedAt=new Date(Date.parse(board.observedAt+'T00:00:00Z')-86400000).toISOString().slice(0,10);
  const before=JSON.stringify([catalog,insights,p]);
  assert.throws(()=>refresh(catalog,insights,p),/Snapshot moved backwards/);
  assert.equal(JSON.stringify([catalog,insights,p]),before);
 }
});
