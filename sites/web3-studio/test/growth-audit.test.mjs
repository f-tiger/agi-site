import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import path from 'node:path';
import {assets} from '../public/research-core.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import {audit,markdown,persistReport} from '../scripts/growth-audit.mjs';import {newPaths} from '../scripts/market-pages.mjs';
function good(url){const u=new URL(url),now=new Date().toISOString();let text='';
 if(u.pathname==='/api/market')text=JSON.stringify({status:'fresh',retrievedAt:now,quotes:[{},{},{},{}]});
 else if(u.pathname==='/api/research')text=JSON.stringify({status:'fresh',historyStatus:'fresh',retrievedAt:now,quotes:assets.map(a=>({symbol:a.symbol,status:'fresh',day:{percent:1},week:{percent:1}}))});
 else if(u.pathname==='/api/briefs')text=JSON.stringify({status:'fresh',retrievedAt:now,sources:[],items:[]});
 else if(u.pathname==='/api/growth')text=JSON.stringify({qa:false,groups:[],asOf:now,windowDays:28});
 else if(u.pathname==='/api/stats')text=JSON.stringify({groups:[{qa:1,submissions:400}]});
 else if(u.pathname==='/sitemap.xml')text=['/','/guide.html','/for-agents.html',...newPaths.map(x=>'/'+x)].map(p=>'<loc>'+u.origin+p+'</loc>').join('');
 else text='<link rel="canonical" href="'+u.origin+u.pathname+'"><input id="measurement-optin"><script src="/measure.mjs"></script><section id="market-live"></section>';
 return {status:200,text,headers:{}};
}
test('daily audit separates healthy pipes, QA submissions and unknown revenue',async()=>{const r=await audit(async url=>good(url));assert.equal(r.ok,true);assert.equal(r.feedback.groups.length,0);assert.equal(r.summary.ownTaskEvents,0);assert.equal(r.outcomes.aiCitations,null);assert.equal(r.outcomes.revenue,null);assert.match(r.nextAction,/consent bias/);});
test('daily audit fails on a stale price or missing canonical rather than reporting success',async()=>{const r=await audit(async url=>{const r=good(url);if(url.endsWith('/api/market'))r.text=JSON.stringify({status:'stale',retrievedAt:'2020-01-01',quotes:[]});if(url.includes('compute.agiscorecard.com/guide.html'))r.text='Wrong deployed page';return r;});assert.equal(r.ok,false);assert.ok(r.checks.some(x=>x.name==='source snapshots'&&!x.ok));assert.ok(r.checks.some(x=>x.name==='compute.agiscorecard.com'&&!x.ok));});

test('source or measurement failure still produces diagnostics with unknown usage, never zero',async()=>{
 const r=await audit(async url=>{
  if(['/api/market','/api/growth'].some(p=>url.endsWith(p)))throw Error('unavailable');
  return good(url);
 });
 assert.equal(r.ok,false);assert.equal(r.summary.ownTaskEvents,null);
 assert.ok(r.sources.research);assert.match(markdown(r),/行情状态：未知/);
 assert.match(markdown(r),/unavailable/);
});

test('partial source failure persists latest, Markdown and history without erasing previous evidence',async()=>{
 const out=await mkdtemp(path.join(tmpdir(),'web3-audit-'));
 try {
  const prior={asOf:'2026-09-19T00:00:00.000Z',ok:true,marketStatus:'fresh'};
  await writeFile(path.join(out,'history.json'),JSON.stringify([prior]));
  const r=await audit(async url=>url.endsWith('/api/market')?{status:503,text:'unavailable'}:good(url));
  r.asOf='2026-09-27T00:00:00.000Z';
  await persistReport(r,out);
  const latest=JSON.parse(await readFile(path.join(out,'latest.json'),'utf8'));
  const history=JSON.parse(await readFile(path.join(out,'history.json'),'utf8'));
  assert.equal(latest.ok,false);assert.ok(latest.sources.research);
  assert.match(await readFile(path.join(out,'latest.md'),'utf8'),/Source endpoint unavailable/);
  assert.deepEqual(history[0],prior);assert.equal(history.length,2);
  assert.equal(history[1].marketStatus,'unknown');assert.equal(history[1].ok,false);
 } finally {await rm(out,{recursive:true,force:true});}
});
