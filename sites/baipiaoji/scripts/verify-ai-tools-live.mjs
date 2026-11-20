import assert from 'node:assert/strict';
import {SUITE_TOOLS,runSuiteTool,suiteToolDefinitions} from '../lib/ai-suite/registry.mjs';

const origin='https://baipiaoji.com';
const protocolVersion='2025-06-18';
const metadataOnly=process.argv.includes('--metadata-only');
const all=process.argv.includes('--all');
for(const path of ['/studio/ai/','/en/studio/ai/','/studio/task-loop','/en/studio/task-loop']){
 const r=await fetch(origin+path+'?__ci=1',{signal:AbortSignal.timeout(20000)});
 assert.equal(r.status,200,path);
 assert.match(await r.text(),/Task Loop|任务回溯与预测/);
 console.log('PASS '+path);
}
const headers={'Content-Type':'application/json','Accept':'application/json, text/event-stream','MCP-Protocol-Version':protocolVersion};
let id=0;
const rpc=async(method,params)=>{
 const requestId=++id;
 const r=await fetch(origin+'/api/ai-mcp?__ci=1',{
  method:'POST',headers,
  body:JSON.stringify({jsonrpc:'2.0',id:requestId,method,params}),
  signal:AbortSignal.timeout(20000)
 });
 assert.equal(r.status,200,method);
 const body=await r.json();
 assert.equal(body.id,requestId);
 assert.equal(body.jsonrpc,'2.0');
 assert.equal(body.error,undefined,method);
 return body.result;
};
const meta=await rpc('initialize',{protocolVersion,capabilities:{},clientInfo:{name:'bpj-ci',version:'1'}});
assert.equal(meta.protocolVersion,protocolVersion);
assert.deepEqual(meta.serverInfo,{name:'bpj-ai-tools',version:'0.2.0'});
const listing=await rpc('tools/list',{});
assert.equal(listing.tools.length,102);
assert.deepEqual(listing.tools.slice(0,2).map(x=>x.name),['list_bpj_ai_tools','review_task_state']);
assert.deepEqual(listing.tools.slice(2),suiteToolDefinitions());
console.log('PASS live free MCP initialize and all 102 definitions.');

for(const locale of ['', '/en']){
 const response=await fetch(origin+locale+'/ai-tools.json?__ci=1',{signal:AbortSignal.timeout(20000)});
 assert.equal(response.status,200);
 const catalog=await response.json();
 assert.equal(catalog.version,2);
 assert.equal(catalog.freeMcp,origin+'/api/ai-mcp');
 assert.deepEqual(catalog.suite.map(tool=>tool.mcpTool),SUITE_TOOLS.map(tool=>tool.name));
}
console.log('PASS live bilingual JSON catalogues match the free MCP.');

if(!metadataOnly){
 const checked=await rpc('tools/call',{name:'review_task_state',arguments:{goal:'CI fixture',acceptance:'Returns blocker',blockers:['Synthetic missing configuration']}});
 assert.equal(JSON.parse(checked.content[0].text).action,'resolve_blocker');
 const samples=all?SUITE_TOOLS:[...new Map(SUITE_TOOLS.map(tool=>[tool.category,tool])).values()];
 for(const tool of samples){
  const result=await rpc('tools/call',{name:tool.name,arguments:tool.example});
  assert.equal(result.isError,undefined,tool.name);
  const expected=JSON.parse(JSON.stringify(runSuiteTool(tool.name,tool.example)));
  assert.deepEqual(result.structuredContent,expected,tool.name);
  assert.deepEqual(JSON.parse(result.content[0].text),expected,tool.name);
 }
 console.log('PASS live old Task Loop call and '+samples.length+' new free MCP calls with synthetic inputs.');
}
