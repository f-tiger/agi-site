import {assets} from '../public/research-core.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import {audit} from '../scripts/growth-audit.mjs';import {newPaths} from '../scripts/market-pages.mjs';
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
