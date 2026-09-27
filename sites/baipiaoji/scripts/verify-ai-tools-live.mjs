import assert from 'node:assert/strict';
const origin='https://baipiaoji.com';
for(const p of ['/studio/ai/','/en/studio/ai/','/studio/task-loop','/en/studio/task-loop']){const r=await fetch(origin+p+'?__ci=1',{signal:AbortSignal.timeout(20000)});assert.equal(r.status,200,p);assert.match(await r.text(),/Task Loop|任务回溯与预测/);console.log('PASS '+p);}
const rpc=async(method,params)=>{const r=await fetch(origin+'/api/ai-mcp?__ci=1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(20000)});assert.equal(r.status,200);return r.json();};
assert.equal((await rpc('initialize',{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'bpj-ci',version:'1'}})).result.protocolVersion,'2025-06-18');
assert((await rpc('tools/list',{})).result.tools.some(x=>x.name==='review_task_state'));
const checked=await rpc('tools/call',{name:'review_task_state',arguments:{goal:'CI fixture',acceptance:'Returns blocker',blockers:['Synthetic missing configuration']}});assert.equal(JSON.parse(checked.result.content[0].text).action,'resolve_blocker');console.log('PASS live free MCP initialize/list/call; synthetic data only.');
