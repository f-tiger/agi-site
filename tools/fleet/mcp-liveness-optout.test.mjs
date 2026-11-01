import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MONITOR_UA,TARGETS,monitorOptOut,withMonitorOptOut} from './mcp-liveness-optout.mjs';
import {onRequest} from '../../sites/baipiaoji/functions/_middleware.js';

test('only exact observed liveness probes receive the documented uncached opt-out',async()=>{
 for(const[host,paths]of Object.entries(TARGETS))for(const path of paths)for(const method of ['GET','POST']){
  const request=new Request('https://'+host+path,{method,headers:{'User-Agent':MONITOR_UA},...(method==='POST'?{body:'not parsed'}:{})});
  const response=monitorOptOut(request);assert.equal(response.status,403);assert.equal(response.headers.get('X-Sentinel-OptOut'),'1');assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(response.headers.get('vary'),'User-Agent');assert.equal(request.bodyUsed,false);
 }
});
test('ordinary clients, other agents, discovery, unknown hosts and other methods remain untouched',()=>{
 for(const ua of ['', 'node','Claude-User','mcpbeat/0.1 (+https://mcpbeat.com/bot/; liveness check)',MONITOR_UA+' extra'])assert.equal(monitorOptOut(new Request('https://agiscorecard.com/mcp',{headers:{'User-Agent':ua}})),null);
 for(const url of ['https://agiscorecard.com/','https://agiscorecard.com/.well-known/mcp.json','https://agiscorecard.com/auth/account','https://agiscorecard.com/mcp-foo','https://unknown.test/mcp','https://web3.agiscorecard.com/market.html'])assert.equal(monitorOptOut(new Request(url,{headers:{'User-Agent':MONITOR_UA}})),null);
 for(const method of ['HEAD','OPTIONS','DELETE'])assert.equal(monitorOptOut(new Request('https://agiscorecard.com/mcp',{method,headers:{'User-Agent':MONITOR_UA}})),null);
});
test('wrapper preserves context, arguments and non-fetch handlers; probe reads no body or data',async()=>{
 const env={sentinel:'fixture'},ctx={},original=new Response('client result');let calls=0;
 const worker={scheduled(){return 'scheduled'},fetch(request,e,c){assert.equal(this,worker);assert.equal(e,env);assert.equal(c,ctx);calls++;return original}};
 const wrapped=withMonitorOptOut(worker);assert.equal(wrapped.scheduled(), 'scheduled');assert.equal(await wrapped.fetch(new Request('https://agiscorecard.com/mcp'),env,ctx),original);assert.equal(calls,1);
 const response=await wrapped.fetch(new Request('https://agiscorecard.com/mcp',{headers:{'User-Agent':MONITOR_UA}}),env,ctx);assert.equal(response.status,403);assert.equal(calls,1);
});
test('BPJ middleware stops the probe before routing/DB but retains its delivery marker',async()=>{
 const response=await onRequest({request:new Request('https://baipiaoji.com/api/mcp',{method:'POST',body:'not JSON',headers:{'User-Agent':MONITOR_UA}}),get env(){throw Error('Unexpected DB')},next(){throw Error('Unexpected handler')}});
 assert.equal(response.status,403);assert.equal(response.headers.get('X-Sentinel-OptOut'),'1');assert.equal(response.headers.get('X-Fleet-Delivery'),'pages-function');
});
test('all four Worker entrypoints apply the guard outside account/MCP execution',()=>{
 for(const path of ['sites/agiscorecard/tools/analytics-worker/index.js','sites/buysomething/worker.js','sites/getecoback/src/cached-worker.mjs','sites/web3-studio/worker.mjs'])assert.match(readFileSync(new URL('../../'+path,import.meta.url),'utf8'),/export default withMonitorOptOut\(withFleetAccount\(/);
});
