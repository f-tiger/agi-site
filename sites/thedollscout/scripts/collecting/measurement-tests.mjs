import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {onRequest as mcp} from '../../functions/mcp.js';
import {onRequestPost as beacon} from '../../functions/api/ev.js';
import {onRequestGet as growth, COLLECTOR_QUERY, collectorWindow, aggregateCollector, usesDateRangeIndex} from '../../functions/api/collector-growth.js';
import {recordMcpSuccess} from '../../lib/collector-measurement.js';

function recorder({fail=false}={}) {
  const rows=[], pending=[];
  const HITS={prepare(){
    if(fail==='prepare')throw Error('Unavailable');
    return {bind(...args){return {async run(){if(fail)throw Error('Unavailable');rows.push(args);}};}};
  }};
  return {rows,pending,env:{HITS},waitUntil:p=>pending.push(p)};
}
const probability = {name:'secret_pull_probability',arguments:{oddsN:72,boxes:12}};
async function rpc(rec,method='tools/call',params=probability,{url='https://thedollscout.com/mcp',headers={}}={}) {
  const request=new Request(url,{method:'POST',headers:{'user-agent':'CollectorClient/1.0',...headers},body:JSON.stringify({jsonrpc:'2.0',id:'private-request-id',method,params})});
  const response=await mcp({...rec,request});await Promise.all(rec.pending);
  return response.json();
}

test('MCP records only successful executed tools and fixed result labels, never request data',async()=>{
  const rec=recorder();const answer=await rpc(rec);
  assert.equal(answer.result.isError,false);
  assert.deepEqual(rec.rows,[[new Date().toISOString().slice(0,10),'/mcp/secret_pull_probability','','','result','collector_mcp_call']]);
  for(const method of ['initialize','ping','tools/list','resources/list','notifications/initialized']){
    // Notifications without an id have their own protocol semantics; listed calls still must not count.
    const r=recorder();await rpc(r,method,{});assert.equal(r.rows.length,0,method);
  }
  for(const params of [{name:'private-tool'},{...probability,arguments:{oddsN:72,boxes:'private'}},{name:'estimate_collection_progress',arguments:{regularStyles:6,ownedStyles:7,boxes:1,secretPercent:0}}]){
    const r=recorder();const body=await rpc(r,'tools/call',params);assert.ok(body.error||body.result.isError);assert.equal(r.rows.length,0);
  }
  const missing=recorder();missing.env.ASSETS={fetch:async()=>new Response('',{status:503})};
  assert.ok((await rpc(missing,'tools/call',{name:'labubu_rarity_odds'})).error);assert.equal(missing.rows.length,0);
  const unknown=recorder();unknown.env.ASSETS={fetch:async()=>Response.json({terms:[]})};
  assert.equal((await rpc(unknown,'tools/call',{name:'define_labubu_term',arguments:{term:'private inquiry'}})).result.structuredContent.found,false);
  assert.deepEqual(unknown.rows[0].slice(1),['/mcp/define_labubu_term','','','no_result','collector_mcp_call']);
});

const exclusions=[
  ...['ci','__ci','__probe','qa','__qa','utm_source=verify'].map(q=>({url:'https://thedollscout.com/mcp?'+q})),
  {url:'https://preview.pages.dev/mcp'},
  ...['x-probe','x-ci','x-qa','x-tds-test'].map(h=>({headers:{[h]:''}})),
  ...['HeadlessChrome','Playwright','tds-ci-selfcheck/1.0','tds-growth-qa/1.0','test-agent','fleet-analytics-probe/1.0','release-check','Glama health check','Smithery Inspector','MCP-Inspector','Googlebot','GPTBot','OAI-SearchBot'].map(ua=>({headers:{'user-agent':ua}})),
  {headers:{dnt:'1'}},{headers:{'sec-gpc':'1'}},{headers:{'x-analytics-consent':'denied'}},
  {headers:{cookie:'other=yes; tds_analytics_choice_v1=denied; more=x'}},
  {headers:{referer:'https://thedollscout.com/for-agents?__qa=1'}}
];
test('QA, preview, crawler self-checks and privacy refusal keep working without producing MCP growth',async()=>{
  for(const options of exclusions){const r=recorder();assert.equal((await rpc(r,'tools/call',probability,options)).result.isError,false);assert.equal(r.rows.length,0,JSON.stringify(options));}
  // Normal assistant/user initiated clients must not be mistaken for a crawler merely for using MCP.
  for(const ua of ['ChatGPT-User','Claude-User','Smithery Client','python-httpx/0.28']){const r=recorder();await rpc(r,'tools/call',probability,{headers:{'user-agent':ua}});assert.equal(r.rows.length,1,ua);}
});
test('MCP telemetry failures never break results and the helper refuses arbitrary labels',async()=>{
  for(const fail of [true,'prepare']){const r=recorder({fail});assert.equal((await rpc(r)).result.isError,false);assert.equal(r.rows.length,0);}
  const r=recorder(),request=new Request('https://thedollscout.com/mcp');
  for(const [tool,category]of [['private-input','result'],['secret_pull_probability','private-result']])recordMcpSuccess({...r,request},tool,category);
  assert.equal(r.rows.length,0);
});

async function event(rec,p,e,options={}) {
  const request=new Request((options.url||'https://thedollscout.com/api/ev'),{method:'POST',headers:{origin:'https://thedollscout.com','user-agent':'Mozilla/5.0',...options.headers},body:JSON.stringify({p,e,r:'https://search.example/private?q=secret',...options.extra})});
  const response=await beacon({...rec,request});await Promise.all(rec.pending);assert.equal(response.status,204);
}
test('Browser collector counters require public route/action pairs and exclude QA and arbitrary payloads',async()=>{
  const pairs=[['for-agents','collector_mcp_copy'],['series/smiski-living','collector_series_export'],['series/sonny-angel-snack-series','collector_series_save'],['collection-tracker','collection_export'],['collection-tracker','collection_save']];
  for(const prefix of ['/','/de/','/zh/'])for(const [path,name]of pairs){const r=recorder();await event(r,prefix+path,name);assert.equal(r.rows.length,1);assert.equal(r.rows[0][4],'search.example');}
  for(const name of pairs.map(p=>p[1])){const r=recorder();await event(r,'/members',name);assert.equal(r.rows.length,0);}
  for(const options of exclusions){const r=recorder();await event(r,'/series/smiski-living','collector_series_export',options);assert.equal(r.rows.length,0,JSON.stringify(options));}
  for(const extra of [{collection:['PRIVATE']},{id:'PRIVATE'},{input:'PRIVATE'}]){const r=recorder();await event(r,'/collection-tracker','collection_save',{extra});assert.equal(r.rows.length,0);}
  const blocked=recorder();await event(blocked,'/for-agents','collector_mcp_copy',{headers:{origin:'https://foreign.example'}});assert.equal(blocked.rows.length,0);
  for(const p of ['/__ci/event-probe','/for-agents?ci=1','/for-agents?__qa=1']){const r=recorder();await event(r,p,'');assert.equal(r.rows.length,0,p);}
});

function database(index='idx_hits_d') {
  const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE hits(d TEXT,path TEXT,lang TEXT,country TEXT,ref TEXT,ev TEXT)');
  if(index)db.exec(`CREATE INDEX ${index} ON hits(d)`);
  return db;
}
test('Aggregate SQL uses any real date-range index, excludes old/partial dates and returns no freeform referrers',()=>{
  const db=database();const insert=db.prepare('INSERT INTO hits(d,path,ev,ref) VALUES (?,?,?,?)');
  for(const [d,p,e,r]of [
    ['2026-10-11','/collection-tracker','collection_save','PRIVATE'],
    ['2026-10-12','/collection-tracker','collection_save','PRIVATE'],
    ['2026-10-12','/mcp/secret_pull_probability','collector_mcp_call','result'],
    ['2026-10-12','/mcp/define_labubu_term','collector_mcp_call','no_result'],
    ['2026-10-12','/mcp/private','collector_mcp_call','PRIVATE'],
    ['2026-10-12','/members','collector_series_export','PRIVATE'],
    ['2026-10-13','/collection-tracker','collection_export','PRIVATE'],
  ])insert.run(d,p,e,r);
  const bounds=['2026-10-12','2026-10-13'];
  assert.equal(usesDateRangeIndex(db.prepare('EXPLAIN QUERY PLAN '+COLLECTOR_QUERY).all(...bounds)),true);
  const rows=db.prepare(COLLECTOR_QUERY).all(...bounds);assert.doesNotMatch(JSON.stringify(rows),/PRIVATE/);
  const result=aggregateCollector(rows);assert.deepEqual(result.counts,{browser_actions:1,mcp_tool_calls:2});assert.equal(result.browser[0].date,'2026-10-12');
  const noindex=database('');assert.equal(usesDateRangeIndex(noindex.prepare('EXPLAIN QUERY PLAN '+COLLECTOR_QUERY).all(...bounds)),false);
  db.close();noindex.close();
});
test('Measurement release day is excluded and shorter observed windows never pretend to cover 28 days',()=>{
  const pending=collectorWindow(new Date('2026-10-11T23:59:00Z'));assert.equal(pending.coverage,'pending_first_complete_day');assert.equal(pending.measuredWindow,null);
  assert.equal(collectorWindow(new Date('2026-10-12T23:59:00Z')).coveredDays,0);
  const first=collectorWindow(new Date('2026-10-13T00:00:00Z'));assert.equal(first.coveredDays,1);assert.equal(first.full28Days,false);assert.deepEqual(first.measuredWindow,{start:'2026-10-12',end_exclusive:'2026-10-13'});
  const full=collectorWindow(new Date('2026-11-20T00:00:00Z'));assert.equal(full.coveredDays,28);assert.equal(full.full28Days,true);assert.deepEqual(full.measuredWindow,full.expected28dWindow);
});
async function atDate(value,callback) {
  const Original=globalThis.Date;globalThis.Date=class extends Original{constructor(...args){super(...(args.length?args:[value]));}static now(){return new Original(value).getTime();}};
  try{return await callback();}finally{globalThis.Date=Original;}
}
function contextForDB(db) {
  const calls=[];
  const HITS={prepare(sql){
    calls.push(sql);
    return {bind(...args){return {async all(){return {results:db.prepare(sql).all(...args),meta:{rows_read:0}};}};}};
  }};
  return {calls,request:new Request('https://thedollscout.com/api/collector-growth',{headers:{'x-probe':'measurement-test'}}),env:{HITS}};
}
test('Endpoint distinguishes pending measurement, a successfully queried zero, unindexed data and unavailable data',async()=>{
  const db=database(),ctx=contextForDB(db);
  await atDate('2026-10-11T12:00:00Z',async()=>{const r=await growth(ctx),j=await r.json();assert.equal(r.status,200);assert.equal(j.counts,null);assert.equal(j.coverage,'pending_first_complete_day');assert.equal(ctx.calls.length,1);assert.ok(ctx.calls[0].startsWith('EXPLAIN'));});
  await atDate('2026-10-13T12:00:00Z',async()=>{const r=await growth(ctx),j=await r.json();assert.equal(r.status,200);assert.deepEqual(j.counts,{browser_actions:0,mcp_tool_calls:0});assert.equal(j.coveredDays,1);assert.equal(ctx.calls.length,3);});
  const missing=contextForDB(database(''));const r=await growth(missing);assert.equal(r.status,503);assert.equal((await r.json()).error,'missing_date_index');assert.equal(missing.calls.length,1);
  const broken=contextForDB(db);broken.env.HITS.prepare=()=>{throw Error('D1 daily quota exceeded');};const failure=await growth(broken),j=await failure.json();assert.equal(failure.status,503);assert.equal(j.counts,null);assert.equal(j.reason,'daily_limit');
  const unavailable=await growth({env:{}});assert.equal(unavailable.status,503);assert.equal((await unavailable.json()).counts,null);db.close();
});

test('Aggregate cache bounds repeat scans and failures/overflow never become an empty successful report',async()=>{
  const previous=globalThis.caches,stored=new Map();
  globalThis.caches={default:{async match(key){return stored.get(key.url)?.clone();},async put(key,response){stored.set(key.url,response);}}};
  try{await atDate('2026-10-13T12:00:00Z',async()=>{
    const db=database(),ctx=contextForDB(db);ctx.request=new Request('https://thedollscout.com/api/collector-growth');
    const first=await growth(ctx);assert.equal(first.headers.get('x-tds-aggregate-cache'),'miss');assert.equal(ctx.calls.length,2);
    ctx.request=new Request('https://thedollscout.com/api/collector-growth?untrusted_range=all-time');
    const second=await growth(ctx);assert.equal(second.headers.get('x-tds-aggregate-cache'),'hit');assert.equal(ctx.calls.length,2);assert.equal((await second.json()).coveredDays,1);
    stored.clear();
    const overflow=contextForDB(db);overflow.request=ctx.request;
    overflow.env.HITS.prepare=sql=>({bind:()=>({all:async()=>({results:sql.startsWith('EXPLAIN')?[{detail:'SEARCH hits USING INDEX idx_hits_d (d>? AND d<?)'}]:Array(10001).fill({})})})});
    const full=await growth(overflow);assert.equal(full.status,503);assert.equal((await full.json()).counts,null);assert.equal(stored.size,0);
    const noRows=contextForDB(db);noRows.request=ctx.request;
    noRows.env.HITS.prepare=sql=>({bind:()=>({all:async()=>sql.startsWith('EXPLAIN')?{results:[{detail:'SEARCH hits USING INDEX idx_hits_d (d>? AND d<?)'}]}:{}})});
    const absent=await growth(noRows);assert.equal(absent.status,503);assert.equal((await absent.json()).counts,null);assert.equal(stored.size,0);db.close();
    for(const phase of ['EXPLAIN','SELECT']){
      const explicitFailure={request:ctx.request,env:{HITS:{prepare:sql=>({bind:()=>({all:async()=>({success:!sql.startsWith(phase),error:'PRIVATE failure',results:sql.startsWith('EXPLAIN')?[{detail:'SEARCH hits USING INDEX idx_hits_d (d>? AND d<?)'}]:[]})})})}}};
      const failure=await growth(explicitFailure),body=await failure.json();assert.equal(failure.status,503,phase);assert.equal(body.counts,null);assert.doesNotMatch(JSON.stringify(body),/PRIVATE/);assert.equal(stored.size,0);
    }
  });}finally{if(previous===undefined)delete globalThis.caches;else globalThis.caches=previous;}
});

const clientSource=(await fs.readFile(new URL('../../collector-assets/collecting.mjs',import.meta.url),'utf8')).replace(/^import .+;\s*$/gm,'');
function browser(options={}) {
  const sent=[],events=[],handlers={},status={textContent:''},button={dataset:{success:'Copied',failure:'Copy failed'},addEventListener:(name,fn)=>handlers[name]=fn};
  const loc=new URL(options.url||'https://thedollscout.com/for-agents');
  const context={location:loc,URL,URLSearchParams,Set,CustomEvent:class{constructor(name,options){this.type=name;this.detail=options.detail;}},navigator:{userAgent:'Mozilla/5.0',clipboard:{writeText:options.copy||(()=>Promise.resolve())},...options.navigator},localStorage:{getItem:()=>{if(options.storageError)throw Error();return options.denied?'denied':null;}},window:{dispatchEvent:event=>events.push(event)},fetch:async(path,init)=>{sent.push(JSON.parse(init.body));return {};},document:{referrer:'',querySelector:selector=>selector==='[data-copy-mcp]'?button:selector==='[data-mcp-status]'?status:selector==='link[rel=canonical]'?{href:loc.origin+loc.pathname}:null,querySelectorAll:()=>[]},initStyleOdds(){},initDisplayFit(){},initPlanning(){},initSeries(){}};
  vm.runInNewContext(clientSource,context);return {sent,events,handlers,status};
}
test('MCP copy counts only clipboard success, with no endpoint value or other input',async()=>{
  let complete;const pending=new Promise(resolve=>complete=resolve),b=browser({copy:()=>pending});
  const click=b.handlers.click();assert.equal(b.events.length,0);complete();await click;
  assert.equal(b.status.textContent,'Copied');assert.equal(b.events.length,1);assert.deepEqual(JSON.parse(JSON.stringify(b.events[0].detail)),{name:'collector_mcp_copy'});
  assert.deepEqual(b.sent.filter(row=>row.e),[{p:'/for-agents',e:'collector_mcp_copy',r:''}]);
  await b.handlers.click();assert.equal(b.events.length,1,'per page action deduplication');
  const failed=browser({copy:async()=>{throw Error('Clipboard denied');}});await failed.handlers.click();assert.equal(failed.status.textContent,'Copy failed');assert.equal(failed.events.length,0);
});
test('Successful clipboard use in QA, preview and privacy-refusing browsers never sends growth',async()=>{
  for(const options of [{url:'https://thedollscout.com/for-agents?ci=1'},{url:'https://preview.pages.dev/for-agents'},{denied:true},{storageError:true},{navigator:{webdriver:true}},{navigator:{globalPrivacyControl:true}},{navigator:{doNotTrack:'1'}}]){const b=browser(options);await b.handlers.click();assert.equal(b.status.textContent,'Copied');assert.equal(b.sent.length,0);assert.equal(b.events.length,0);}
});
