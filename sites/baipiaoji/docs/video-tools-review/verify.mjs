// Node.js 22+. Public synthetic fixtures only; no account, API key or dependencies.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

const origin='https://baipiaoji.com';
const headers={'User-Agent':'bpj-ci-selfcheck'};
async function get(path){
  const response=await fetch(origin+path+'?__probe=1',{headers,signal:AbortSignal.timeout(25000)});
  assert.equal(response.status,200,path);
  return response.text();
}
let id=0;
async function rpc(method,params){
  const response=await fetch(origin+'/api/video-mcp?__probe=1',{
    method:'POST',headers:{...headers,'Content-Type':'application/json',Accept:'application/json, text/event-stream','MCP-Protocol-Version':'2025-11-25'},
    body:JSON.stringify({jsonrpc:'2.0',id:++id,method,params}),signal:AbortSignal.timeout(25000)
  });
  assert.equal(response.status,200,method);
  const body=await response.json();
  assert.equal(body.id,id);assert(!body.error,JSON.stringify(body.error));
  return body.result;
}
const text=await get('/manju/video-fit.json');
const data=JSON.parse(text);
assert.equal(data.examples.length,3);
const server=await rpc('initialize',{protocolVersion:'2025-11-25',capabilities:{},clientInfo:{name:'bpj-public-example-reproduction',version:'1.0.0'}});
const results=[];
for(const example of data.examples){
  assert.equal(example.synthetic,true);
  const result=await rpc('tools/call',{name:'evaluate_video_publish',arguments:example.input});
  assert(!result.isError);
  const actual=result.structuredContent;
  assert.equal(actual.status,example.output.status,example.id);
  assert.equal(actual.version,example.output.version,example.id);
  assert.deepEqual(actual.priority,example.output.priority,example.id);
  assert.deepEqual(actual.blockers,example.output.blockers,example.id);
  assert.deepEqual(actual.unknown,example.output.unknown,example.id);
  results.push({id:example.id,url:example.url,synthetic:true,input:example.input,status:actual.status,priority:actual.priority,blockers:actual.blockers});
}
const incomplete=await rpc('tools/call',{name:'evaluate_video_publish',arguments:{}});
assert.equal(incomplete.structuredContent.status,'needs-info');
assert.deepEqual(incomplete.structuredContent.priority,[]);
const changed=await rpc('tools/call',{name:'evaluate_video_publish',arguments:{...data.examples.find(x=>x.id==='app30').input,rights:'uncertain'}});
assert(!changed.isError);
assert.equal(changed.structuredContent.status,'revise');
assert.deepEqual(changed.structuredContent.priority,[]);
console.log(JSON.stringify({verifiedAt:new Date().toISOString(),kind:'operator_synthetic_check',independentReview:false,productionCalls:true,sourceCheckedAt:data.checkedAt,ruleVersion:data.version,publicJsonSha256:createHash('sha256').update(text).digest('hex'),server:server.serverInfo,results,emptyInput:{status:'needs-info',priority:[]},changedRights:{fromExample:'app30',rights:'uncertain',status:changed.structuredContent.status,priority:changed.structuredContent.priority,blockers:changed.structuredContent.blockers},limit:'Checks public fixture consistency, not real video quality, platform acceptance, traffic or independent adoption.'},null,2));
