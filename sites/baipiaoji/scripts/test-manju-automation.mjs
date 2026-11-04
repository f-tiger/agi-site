import {workURL,hasWorkPage,validateWorkEvidence,createWorkResolver,promoteSearchDetails,officialWorkId} from './manju-work-urls.mjs';
import {buildWorkPages} from './manju-work-pages.mjs';
import {buildInsights,validateInsights,metricFor} from './manju-insights.mjs';
import {discoverySearch} from './manju-discovery.mjs';
import {classifyConsumerLink} from './manju-consumer-links.mjs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,mkdtempSync,openSync,closeSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';import {join} from 'node:path';
import {refresh,syncFailureDiagnostic,syncFailureStatus} from './manju-sync.mjs';import {validateManju} from './manju-catalog.mjs';import '../assets/manju-search.js';
const read=n=>JSON.parse(readFileSync(new URL('../data/'+n,import.meta.url))),catalog=read('manju.json'),insights=read('manju-insights.json');
const payload={checkedAt:insights.reviewedAt,checkedAtTime:insights.reviewedAt+'T08:00:00Z',cohorts:insights.cohorts.filter(c=>c.metric==='snapshot_heat').map(c=>({kind:c.id.includes('comic')?'comic-drama':'ai-drama',observedAt:insights.reports.find(r=>r.id===c.reportId).observedAt,records:c.records,sourcePages:c.sourcePages}))};
test('refresh is idempotent, retains catalogue and refreshes source provenance',()=>{const a=refresh(catalog,insights,payload),b=refresh(a.catalog,a.insights,payload);assert.equal(b.added,0);assert.equal(a.catalog.items.length,b.catalog.items.length);assert.equal(validateManju(b.catalog).records,b.catalog.items.length);});
// Select a currently present official source identity so cached board churn does
// not invalidate synthetic rename cases. No failed source payload is replayed.
const comicRows=payload.cohorts.find(c=>c.kind==='comic-drama').records,aiURLs=new Set(payload.cohorts.find(c=>c.kind==='ai-drama').records.map(r=>r.url));
const eligibleComicRows=comicRows.filter(r=>catalog.items.some(x=>x.evidence?.sourceKind==='hongguo-ranking'&&x.destination===r.url));
const renamedURL=(eligibleComicRows.find(r=>!aiURLs.has(r.url))||eligibleComicRows[0]).url,renamedId=officialWorkId(renamedURL);
const fixtureRow=p=>p.cohorts.find(c=>c.kind==='comic-drama').records.find(r=>r.url===renamedURL);
test('a synthetic title change for one official ID updates in place and remains idempotent',()=>{
 const p=structuredClone(payload),row=fixtureRow(p),original=catalog.items.find(x=>x.id===renamedId);
 row.title='合成身份回归新标题第一季';const before=JSON.stringify([catalog,insights,p]);
 const a=refresh(catalog,insights,p),x=a.catalog.items.find(x=>x.id===renamedId),b=refresh(a.catalog,a.insights,p);
 assert.equal(a.added,0);assert.equal(a.catalog.items.length,catalog.items.length);assert.equal(x.title,row.title);assert.equal(x.seriesTitle,'合成身份回归新标题');
 assert.equal(x.firstSeenAt,original.firstSeenAt);assert.equal(x.destination,original.destination);assert.equal(workURL(x),workURL(original));
 assert.equal(a.catalog.items.filter(x=>x.id===renamedId).length,1);assert.deepEqual(a.catalog,b.catalog);assert.deepEqual(a.insights,b.insights);
 assert.equal(JSON.stringify([catalog,insights,p]),before);assert.ok(a.changes.every(c=>c.newEntries===0));
});
test('two boards retain distinct titles and metrics for one ID with a deterministic current title',()=>{
 const p=structuredClone(payload),ai=p.cohorts.find(c=>c.kind==='ai-drama'),comic=p.cohorts.find(c=>c.kind==='comic-drama');
 const a=ai.records.find(r=>r.url===renamedURL)||ai.records[0],b=comic.records.find(r=>r.url===renamedURL);a.url=renamedURL;a.title='合成AI榜记录名';b.title='合成漫剧榜记录名';
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
test('different official IDs sharing a normalized title remain separate source records',()=>{
 const p=structuredClone(payload),row=fixtureRow(p),before=JSON.stringify([catalog,insights]),original=catalog.items.find(x=>x.id===renamedId);
 row.url='https://hongguoduanju.com/detail?series_id=123456788';row.title=' '+row.title+'！';
 const result=refresh(catalog,insights,p),added=result.catalog.items.find(x=>x.id==='hg-123456788');
 assert.equal(result.added,1);assert.equal(added.title,row.title);assert.deepEqual(result.catalog.items.find(x=>x.id===renamedId),original);
 assert.notEqual(workURL(added),workURL(original));assert.equal(JSON.stringify([catalog,insights]),before);
 assert.deepEqual(refresh(result.catalog,result.insights,p).catalog,result.catalog);
});
// The failed source payloads were not retained. These are synthetic ambiguity
// cases built from the saved catalogue, not replays of the Nov3 source payload.
const nonofficialOwner=catalog.items.find(x=>x.evidence?.sourceKind!=='hongguo-ranking'&&x.searchEvidence);
function conflictFrom(c,p){
 let error;try{refresh(c,insights,p);}catch(caught){error=caught;}
 assert.match(error?.message||'',/Conflicting official title identity/);return error;
}
test('real conflict errors project bounded IDs and dates without exposing titles or error fields',()=>{
 const p=structuredClone(payload),cohort=p.cohorts.find(c=>c.kind==='comic-drama'),row=cohort.records.find(r=>r.url===renamedURL);
 row.url='https://hongguoduanju.com/detail?series_id=987654310';row.title=' '+nonofficialOwner.title+'！';
 const before=JSON.stringify([catalog,insights,p]),error=conflictFrom(catalog,p);
 const expected={code:'official-title-identity-conflict',incomingWorkId:'hg-987654310',conflictingCatalogId:nonofficialOwner.id,cohortKind:cohort.kind,sourceDate:cohort.observedAt};
 assert.deepEqual(syncFailureDiagnostic(error),expected);
 Object.assign(error,{diagnostic:{title:'private source title'},cause:{media:'https://private.test/video'},incomingWorkId:'forged',title:'untrusted title'});
 assert.deepEqual(syncFailureDiagnostic(error),expected);
 const returned=syncFailureDiagnostic(error);returned.sourceDate='1900-01-01';assert.deepEqual(syncFailureDiagnostic(error),expected);
 const attempt={version:1,attemptedAt:'2026-11-03T00:00:00Z',schedule:'synthetic fixture',status:'failed'},previous={lastSuccessAt:'2026-11-01T06:47:56.186123+00:00',diagnostic:{title:'stale'},customer:'excluded'};
 const status=syncFailureStatus(attempt,previous,error);
 assert.deepEqual(status,{...attempt,lastSuccessAt:previous.lastSuccessAt,error:'采集或数据校验失败；保留上次有效内容。详见 Actions 日志。',diagnostic:expected});
 assert.equal(JSON.stringify([catalog,insights,p]),before);
 assert.ok(JSON.stringify(status).length<600);assert.ok(!JSON.stringify(status).includes(row.title));
 const failedAgain=syncFailureStatus(attempt,status,new Error('arbitrary source text'));
 assert.equal(failedAgain.lastSuccessAt,previous.lastSuccessAt);assert.equal('diagnostic' in failedAgain,false);
 assert.equal(syncFailureStatus(attempt,{},new Error()).lastSuccessAt,null);
});
test('an existing official ID cannot overwrite a nonofficial title owner',()=>{
 for(const other of [nonofficialOwner]){
  const p=structuredClone(payload),cohort=p.cohorts.find(c=>c.kind==='comic-drama');
  cohort.records.find(r=>r.url===renamedURL).title=other.title;
  const error=conflictFrom(catalog,p),diagnostic=syncFailureDiagnostic(error);
  assert.equal(diagnostic.incomingWorkId,renamedId);assert.equal(diagnostic.conflictingCatalogId,other.id);assert.equal(diagnostic.cohortKind,cohort.kind);assert.equal(diagnostic.sourceDate,cohort.observedAt);
 }
});
test('forged errors and invalid diagnostic primitives stay unknown while conflicts remain rejected',()=>{
 const fake={code:'official-title-identity-conflict',incomingWorkId:renamedId,conflictingCatalogId:'hg-123456789',cohortKind:'ai-drama',sourceDate:'2026-11-01'};
 for(const error of [null,'source error',new Error('Conflicting official title identity: '+renamedId),fake,Object.assign(new Error(),{diagnostic:fake}),Object.create(null)])assert.equal(syncFailureDiagnostic(error),null);
 for(const mutate of [
  (c,p,row)=>{row.url='https://hongguoduanju.com/detail?series_id=123456789012345678901';},
  (c,p,row,cohort)=>{cohort.observedAt='2099-02-29';},
  (c,p,row,cohort)=>{cohort.observedAt='2099-13-01';},
  (c,p,row)=>{c.items.find(x=>x.id===nonofficialOwner.id).id='bad\nprivate value';},
  (c,p,row)=>{c.items.find(x=>x.id===nonofficialOwner.id).id='x'.repeat(101);},
 ]){
  const c=structuredClone(catalog),p=structuredClone(payload),cohort=p.cohorts.find(c=>c.kind==='comic-drama'),row=cohort.records.find(r=>r.url===renamedURL);
  row.url='https://hongguoduanju.com/detail?series_id=987654310';row.title=nonofficialOwner.title;mutate(c,p,row,cohort);
  const before=JSON.stringify([c,insights,p]),error=conflictFrom(c,p);
  assert.equal(syncFailureDiagnostic(error),null);assert.equal(JSON.stringify([c,insights,p]),before);
  const status=syncFailureStatus({attemptedAt:'2026-11-03T00:00:00Z',schedule:'synthetic fixture'},{lastSuccessAt:'2026-11-01T06:47:56.186123+00:00'},error);
  assert.equal(status.status,'failed');assert.equal(status.lastSuccessAt,'2026-11-01T06:47:56.186123+00:00');assert.equal('diagnostic' in status,false);
 }
});
test('a new official ID appearing under two synthetic board titles is added only once',()=>{
 const p=structuredClone(payload),url='https://hongguoduanju.com/detail?series_id=987654320';
 for(const c of p.cohorts){c.records[0].url=url;c.records[0].title=c.kind==='ai-drama'?'合成新身份AI榜名':'合成新身份漫剧榜名';}
 const result=refresh(catalog,insights,p),work=result.catalog.items.find(x=>x.id==='hg-987654320');
 assert.equal(result.added,1);assert.equal(result.catalog.items.length,catalog.items.length+1);assert.equal(result.catalog.items.filter(x=>x.destination===url).length,1);assert.equal(work.searchEvidence.length,2);assert.equal(work.title,'合成新身份漫剧榜名');
 assert.equal(refresh(result.catalog,result.insights,p).added,0);
});
test('an earlier source title can occur under another ID without stealing retained evidence',()=>{
 const p=structuredClone(payload),ai=p.cohorts.find(c=>c.kind==='ai-drama'),comic=p.cohorts.find(c=>c.kind==='comic-drama');
 const a=ai.records.find(r=>r.url===renamedURL)||ai.records[0];a.url=renamedURL;a.title='合成先前榜名';
 comic.records.find(r=>r.url===renamedURL).title='合成后续榜名';
 comic.records.at(-1).url='https://hongguoduanju.com/detail?series_id=987654311';comic.records.at(-1).title='合成先前榜名';
 const before=JSON.stringify([catalog,insights,p]),result=refresh(catalog,insights,p),original=result.catalog.items.find(x=>x.id===renamedId),added=result.catalog.items.find(x=>x.id==='hg-987654311');
 assert.equal(result.added,1);assert.equal(original.title,'合成后续榜名');assert.equal(added.title,'合成先前榜名');
 assert.ok(original.searchEvidence.every(e=>e.url===renamedURL));assert.equal(added.searchEvidence,undefined);
 assert.deepEqual(refresh(result.catalog,result.insights,p).catalog,result.catalog);
 assert.equal(JSON.stringify([catalog,insights,p]),before);
});
test('duplicate IDs inside one board and excluded renamed titles cannot hide behind a merge',()=>{
 const p=structuredClone(payload),rows=p.cohorts[0].records;rows[1].url=rows[0].url;rows[1].title='合成同榜重复身份';assert.throws(()=>refresh(catalog,insights,p),/Duplicate official work in cohort/);
 const excluded=structuredClone(payload),ai=excluded.cohorts.find(c=>c.kind==='ai-drama').records.find(r=>r.url===renamedURL)||excluded.cohorts.find(c=>c.kind==='ai-drama').records[0];ai.url=renamedURL;ai.title='桃 花 簪';
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

// Synthetic HTML -> production parser/complete-snapshot validator -> refresh ->
// public renderers. The failed Nov3 payload was not saved; this is not its replay.
const producerPayload=()=>{const dir=mkdtempSync(join(tmpdir(),'manju-identity-fixture-')),path=join(dir,'synthetic.json'),fd=openSync(path,'w');try{execFileSync('python3',[fileURLToPath(new URL('./test-manju-fetch.py',import.meta.url)),'--synthetic-identity-payload'],{stdio:['ignore',fd,'pipe']});return JSON.parse(readFileSync(path,'utf8'));}finally{closeSync(fd);rmSync(dir,{recursive:true,force:true});}};
test('producer-backed same-title official rows retain exact heat, links, depth IDs and details',()=>{
 const p=producerPayload(),result=refresh(catalog,insights,p),rows=p.cohorts.find(c=>c.kind==='ai-drama').records.slice(0,2),works=rows.map(r=>result.catalog.items.find(x=>x.id===officialWorkId(r.url)));
 assert.equal(works[0].title,works[1].title);assert.notEqual(works[0].id,works[1].id);assert.equal(result.added,2);
 assert.notEqual(rows[0].value,rows[1].value);assert.deepEqual(refresh(result.catalog,result.insights,p).catalog,result.catalog);
 const pages=new Map(),exports=new Map(),external=(url,label,action,id)=>`<a href="${url}" data-action="${action||''}" data-id="${id||''}">${label}</a>`;
 buildInsights({insights:result.insights,catalog:result.catalog,publish:(id,body)=>pages.set(id,body),page:x=>x.body,external,workURL,hasWorkPage});
 buildWorkPages({catalog:result.catalog,insights:result.insights,publish:(id,body)=>pages.set(id,body),page:x=>x.body,write:(path,body)=>exports.set(path,body),external,plotFor:()=>null,save:()=>''});
 const cohort=result.insights.cohorts.find(c=>c.id.includes('ai-drama')),search=discoverySearch(result.catalog,result.insights),resolver=createWorkResolver(result.catalog,cohort.records);
 for(const [index,work] of works.entries()){
  const row=rows[index],metrics=metricFor(work,result.catalog,result.insights),entry=classifyConsumerLink(work,cohort.records),detail=JSON.parse(exports.get('manju/'+work.id+'.json'));
  assert.equal(metrics.length,1);assert.equal(metrics[0].url,row.url);assert.equal(metrics[0].value,row.value);assert.equal(metrics[0].sourceRank,index+1);
  assert.equal(resolver(row)?.id,work.id);assert.equal(entry.url,row.url);assert.equal(entry.action,'official_open');
  const tr=pages.get('rankings').match(new RegExp('<tr id="rank-'+cohort.id+'-'+(index+1)+'"[^]*?</tr>'))?.[0];
  assert.ok(tr.includes('href="'+workURL(work)+'"'));assert.ok(tr.includes('data-depth-work="'+work.id+'"'));assert.ok(!tr.includes(works[1-index].id));
  assert.ok(search.some(x=>x.n===row.title&&x.u===workURL(work)));
  assert.equal(detail.officialEntry,row.url);assert.ok(detail.observations.every(e=>e.url===row.url));assert.equal(detail.observations[0].heat,row.value);
  assert.ok(pages.get(work.id).includes('href="'+row.url+'" data-action="official_open" data-id="'+work.id+'"'));
  assert.ok(!pages.get(work.id).includes('查找标题相近的分季记录'));
 }
});
test('ambiguous title-only history and topic cases do not pick an official first match',()=>{
 const result=refresh(catalog,insights,producerPayload()),cohort=result.insights.cohorts.find(c=>c.id.includes('ai-drama')),rows=cohort.records.slice(0,2),title=rows[0].title;
 const history=result.insights.cohorts.find(c=>c.metric!=='snapshot_heat');history.records[0].title=title;
 const works=rows.map(r=>result.catalog.items.find(x=>x.id===officialWorkId(r.url))),resolve=createWorkResolver(result.catalog,cohort.records);
 assert.equal(resolve({title}),null);assert.equal(resolve({title,url:'https://evil.test/detail?series_id=1'}),null);
 assert.equal(resolve({title,url:'https://hongguoduanju.com/detail?series_id=987654300'}),null);
 for(const work of works)assert.ok(metricFor(work,result.catalog,result.insights).every(m=>m.cohort.metric==='snapshot_heat'&&m.url===work.destination));
 const topic=result.insights.topics.find(t=>t.reportId===cohort.reportId);
 if(topic){const tag=rows[0].tags[0];topic.sample={cohortId:cohort.id,tag,count:cohort.records.filter(r=>r.tags.includes(tag)).length,denominator:100};topic.evidenceCount=topic.sample.count;topic.examples=[title];}
 else {const source=result.insights.topics[0];result.insights.topics.push({...source,id:'synthetic-identity',reportId:cohort.reportId,examples:[title],sample:undefined});}
 const target=topic||result.insights.topics.at(-1),pages=new Map();
 buildInsights({insights:result.insights,catalog:result.catalog,publish:(id,body)=>pages.set(id,body),page:x=>x.body,external:(url,label)=>`<a href="${url}">${label}</a>`,workURL,hasWorkPage});
 const examples=pages.get('topic-'+target.id).match(/<h2>来源中的案例<\/h2><ul>([^]*?)<\/ul>/)[1];
 assert.ok(examples.includes('https://www.douyin.com/search/'));assert.ok(works.every(x=>!examples.includes(workURL(x))));
 const historyRow=pages.get('rankings').match(new RegExp('<tr id="rank-'+history.id+'-1"[^]*?</tr>'))[0];assert.ok(!historyRow.includes('data-depth-work='));
});
test('nonofficial ambiguous source identities fail atomically and cannot overwrite retained evidence',()=>{
 const p=structuredClone(payload),ai=p.cohorts.find(c=>c.kind==='ai-drama');
 ai.records[0].title=ai.records[1].title=nonofficialOwner.title;
 const before=JSON.stringify([catalog,insights,p]),error=conflictFrom(catalog,p);assert.equal(syncFailureDiagnostic(error).conflictingCatalogId,nonofficialOwner.id);assert.equal(JSON.stringify([catalog,insights,p]),before);
 const source=structuredClone(insights),cohort=source.cohorts.find(c=>c.id.includes('ai-drama'));cohort.records=ai.records;
 const copy=structuredClone(catalog),owner=copy.items.find(x=>x.id===nonofficialOwner.id),retained=structuredClone(owner.searchEvidence);
 promoteSearchDetails(copy,source);assert.deepEqual(owner.searchEvidence,retained);
 const resolve=createWorkResolver(copy,ai.records);assert.equal(resolve({title:owner.title}),null);
 assert.equal(classifyConsumerLink({...owner,linkType:'search'},ai.records).official,false);
 const bad=structuredClone(catalog),item=bad.items.find(x=>x.id===nonofficialOwner.id);item.searchEvidence.push({...item.searchEvidence[0],kind:item.searchEvidence[0].kind==='ai-drama'?'comic-drama':'ai-drama',url:'https://hongguoduanju.com/detail?series_id=987654300'});assert.throws(()=>validateWorkEvidence(bad),/Ambiguous nonofficial work evidence/);
 const changedTarget={...ai.records[0],url:'https://hongguoduanju.com/detail?series_id=987654300'},changedResolver=createWorkResolver(catalog,[changedTarget]);
 assert.equal(changedResolver({title:nonofficialOwner.title}),null);assert.equal(changedResolver(changedTarget),null);
 const changed=structuredClone(insights);for(const c of changed.cohorts)if(c.metric==='snapshot_heat')c.records=[changedTarget];else c.records=[{title:nonofficialOwner.title,value:1}];
 assert.deepEqual(metricFor(nonofficialOwner,catalog,changed),[]);
});
test('duplicate IDs, forged official identity and nonofficial canonical title collisions stay rejected',()=>{
 const result=refresh(catalog,insights,producerPayload()),official=result.catalog.items.find(x=>x.evidence?.sourceKind==='hongguo-ranking');
 for(const edit of [x=>x.id=official.id,x=>{x.id='hg-987654301';x.destination='https://evil.test/detail?series_id=987654301';},x=>{x.id='hg-987654301';x.destination='https://hongguoduanju.com/detail?series_id=987654301';x.source='https://evil.test/rank/hot-ai-drama';},x=>{x.id='hg-987654301';x.destination='https://hongguoduanju.com/detail?series_id=987654301';x.title=nonofficialOwner.title;}]){
  const c=structuredClone(result.catalog),x=structuredClone(official);edit(x);c.items.push(x);assert.throws(()=>validateManju(c));
 }
 const i=structuredClone(result.insights),cohort=i.cohorts.find(c=>c.metric==='snapshot_heat');cohort.records[1].url=cohort.records[0].url;cohort.records[1].title='合成同ID不同标题';assert.throws(()=>validateInsights(i,result.catalog),/Invalid ranked record/);
});
test('cached data and statistics stay unchanged; unique-title history and exact official metrics remain safe',()=>{
 const checked=insights.reports.find(r=>r.kind==='official_snapshot').checkedAtTime,p={...payload,checkedAtTime:checked},result=refresh(catalog,insights,p);
 assert.equal(JSON.stringify(result.catalog),JSON.stringify(catalog));assert.equal(JSON.stringify(result.insights),JSON.stringify(insights));assert.equal(result.added,0);
 assert.deepEqual(result.changes.map(x=>[x.newEntries,x.heatChanges]),[[0,0],[0,0]]);
 const norm=s=>s.normalize('NFKC').replace(/[\s\p{P}\p{S}]/gu,'').toLowerCase(),allRows=insights.cohorts.flatMap(c=>c.records),current=insights.cohorts.filter(c=>c.metric==='snapshot_heat').flatMap(c=>c.records);
 for(const item of catalog.items){
  const metrics=metricFor(item,catalog,insights),official=item.evidence?.sourceKind==='hongguo-ranking';
  if(official)assert.deepEqual(metrics.filter(m=>m.cohort.metric==='snapshot_heat').map(m=>m.url),current.filter(r=>r.url===item.destination).map(r=>r.url),item.id);
  const matches=catalog.items.filter(x=>norm(x.title)===norm(item.title)),sameName=current.filter(r=>norm(r.title)===norm(item.title)),knownTargets=new Set([...sameName.map(r=>r.url),...(official?[item.destination]:(item.searchEvidence||[]).map(e=>e.url))]);
  const simple=matches.length===1&&knownTargets.size<=1&&allRows.filter(r=>norm(r.title)===norm(item.title)).every(r=>r.title===item.title)&&(!official||current.filter(r=>r.url===item.destination).every(r=>r.title===item.title));
  if(simple){const before=insights.cohorts.flatMap(c=>c.records.filter(r=>r.title===item.title).map(r=>({...r,cohort:c})));assert.deepEqual(metrics,before,item.id);}
  if(matches.length>1||knownTargets.size>1)assert.ok(metrics.every(m=>m.cohort.metric==='snapshot_heat'),item.id+' must not borrow ambiguous historical metrics');
 }
 // A controlled historical-only fixture proves the fallback independently of
 // whether tomorrow's live cache still contains unique literal titles.
 const historical={items:[{id:'mj-synthetic-history',title:'合成：唯一历史标题'}]},history={cohorts:[{metric:'peak_heat',records:[{title:'合成唯一历史标题',value:123}]}]};
 assert.equal(metricFor(historical.items[0],historical,history)[0].value,123);
});
