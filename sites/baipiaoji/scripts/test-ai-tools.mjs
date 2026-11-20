import assert from 'node:assert/strict';
import {publicReturnPath} from '../../../tools/fleet-account/config.mjs';
import {appendEvent,restoreLedger,reviewTask,summarize,compareRuns} from '../assets/studio/task-loop-core.mjs';
import {aiMcp} from '../lib/ai-mcp.mjs';
import {executeSuiteTool} from '../lib/ai-suite/runtime.mjs';
import {SUITE_CATEGORIES,SUITE_TOOLS,runSuiteTool,toolInputSchema} from '../lib/ai-suite/registry.mjs';
let n=0;const test=(name,fn)=>{fn();n++;console.log('PASS '+name);};
let e=appendEvent([],'state',{goal:'Ship signup',acceptance:'Live signup passes',blockers:['Service unavailable']});
test('blocker before artifact',()=>assert.equal(reviewTask({...e[0].data,artifactCreated:true}).action,'resolve_blocker'));
test('artifact is not acceptance',()=>assert.equal(reviewTask({goal:'x',acceptance:'y',artifactCreated:true}).action,'verify_acceptance'));
test('typed inputs',()=>assert.throws(()=>reviewTask({goal:'x',acceptance:'y',cancelled:'false'})));
test('goal change needs reason',()=>assert.throws(()=>appendEvent(e,'state',{goal:'Another task',acceptance:'Test'})));
e=appendEvent(e,'prediction',{action:'Inspect service',expected:'Reproduce error',checkWhen:'After inspection',ifWrong:'Gather logs'});
test('unknown forecast',()=>assert.throws(()=>appendEvent(e,'outcome',{predictionId:90,status:'pass',evidence:'x'})));
const s=appendEvent(e,'state',{goal:'Ship signup',acceptance:'Live signup passes',blockers:[]});
test('snapshot stays historical',()=>assert.deepEqual(s[1].data.snapshot.blockers,['Service unavailable']));
e=appendEvent(s,'outcome',{predictionId:2,status:'inconclusive',evidence:'Environment changed'});
test('state change marked',()=>assert.equal(e.at(-1).data.stateChanged,true));
test('duplicate result rejected',()=>assert.throws(()=>appendEvent(e,'outcome',{predictionId:2,status:'pass',evidence:'rewrite'})));
test('import reconstructs snapshots',()=>{const copy=structuredClone(e);copy[1].data.snapshot={goal:'injected'};assert.deepEqual(restoreLedger({version:1,events:copy})[1].data.snapshot,e[0].data);});
test('no probability hallucination',()=>assert.equal(summarize(e).brierMean,null));
test('batch comparison uses failures in denominator',()=>assert.deepEqual(compareRuns([{taskId:'a',group:'B',passed:false,cost:2,interventions:1}]).groups.B,{runs:1,passed:0,cost:2,interventions:1}));
test('invalid run rejected',()=>assert.throws(()=>compareRuns([{taskId:'a',group:'B',passed:true,cost:-1,interventions:0}])));
const req=(body,headers={},paid=false,env={})=>aiMcp({request:new Request('https://baipiaoji.com/api/ai-mcp'+(paid?'-pro':''),{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)}),env},paid);
const msg={jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'review_task_state',arguments:{goal:'Ship',acceptance:'Tests pass',blockers:['Missing config']}}};
assert.equal(JSON.parse((await (await req(msg)).json()).result.content[0].text).action,'resolve_blocker');n++;
assert.equal((await req(msg,{Origin:'https://evil.example'})).status,403);n++;
assert.equal((await req(msg,{},true)).status,503);n++;
assert.equal((await req(msg,{},true,{AI_MCP_PAID_ENABLED:'true'})).status,401);n++;
assert.equal((await req(msg,{'Authorization':'Bearer '+'a'.repeat(64)},true,{AI_MCP_PAID_ENABLED:'true'})).status,503);n++;
assert.equal((await req({jsonrpc:'2.0',method:'notifications/initialized'})).status,202);n++;
assert.equal((await req({...msg,params:{name:'compare_task_runs',arguments:{runs:[]}}})).status,200);
assert.equal((await (await req({...msg,params:{name:'compare_task_runs'}})).json()).error.code,-32602);n++;
assert.equal((await req({...msg,params:{name:'review_task_state',arguments:{goal:'a'.repeat(70000)}}})).status,413);n++;
console.log(`PASS ${n} AI tools checks; no paid service activated.`);
const fakeDb=member=>({prepare:sql=>({bind(){return this;},async first(){return sql.includes('wb_members')?member:{n:1};},async run(){return {success:true};}})});
for(const [member,status] of [[null,401],[{id:'expired',ends_at:1,suspended:0},403],[{id:'suspended',ends_at:Math.floor(Date.now()/1000)+1000,suspended:1},403],[{id:'active',ends_at:Math.floor(Date.now()/1000)+1000,suspended:0},200]]){
 const r=await req({jsonrpc:'2.0',id:1,method:'tools/list'},{Authorization:'Bearer '+'a'.repeat(64)},true,{AI_MCP_PAID_ENABLED:'true',HITS:fakeDb(member)});assert.equal(r.status,status);
}
assert.equal(compareRuns([{taskId:'x',group:'__proto__',passed:false,cost:0,interventions:0}]).groups.__proto__.runs,1);
console.log('PASS 5 additional checks: absent, expired, suspended, active paid membership (mock DB), hostile group key.');

const fixtureResult=run=>executeSuiteTool({inputs:[],run},{});
const envelope=JSON.stringify({text:''}).length;
assert.equal(fixtureResult(()=>({text:'x'.repeat(180000-envelope)})).text.length,180000-envelope);
assert.throws(()=>fixtureResult(()=>({text:'é'.repeat(95000)})),/180 KB/);
assert.equal(fixtureResult(()=>Array(65000).fill(0)).length,65000);
const repeated={note:'x'.repeat(5000)};
let reachedTail=false;
assert.throws(()=>fixtureResult(()=>({rows:Array(400).fill(repeated),get tail(){reachedTail=true;return null;}})),/180 KB/);
assert.equal(reachedTail,false,'Stop serializing amplified output as soon as the lower bound exceeds the cap.');

const get=await aiMcp({request:new Request('https://baipiaoji.com/api/ai-mcp'),env:{}});
assert.equal(get.status,405);
assert.equal(get.headers.get('Allow'),'POST, OPTIONS');
assert.equal((await get.json()).catalog,'https://baipiaoji.com/ai-tools.json');
const rpc=async(method,params,paid=false,env={})=>{
 const headers=paid?{Authorization:'Bearer '+'a'.repeat(64)}:{};
 const reply=await req({jsonrpc:'2.0',id:42,method,params},headers,paid,env);
 assert.equal(reply.status,200);
 assert.equal(reply.headers.get('Cache-Control'),'no-store');
 const body=await reply.json();
 assert.equal(body.id,42);
 assert.equal(body.jsonrpc,'2.0');
 return body.result;
};
const metadata=await rpc('initialize');
assert.equal(metadata.protocolVersion,'2025-06-18');
assert.equal(metadata.serverInfo.name,'bpj-ai-tools');
assert.equal(metadata.serverInfo.version,'0.3.0');
const listing=[];
const cursors=new Set();
let cursor;
do {
 const page=await rpc('tools/list',cursor?{cursor}:{});
 assert(page.tools.length>0&&page.tools.length<=40);
 listing.push(...page.tools);
 cursor=page.nextCursor;
 if(cursor){
  assert.equal(typeof cursor,'string');
  assert(!cursors.has(cursor));
  cursors.add(cursor);
 }
} while(cursor);
// Only these two pre-existing published URLs intentionally use names reserved by the account router.
const legacyGuardedIds=new Set(['invoice-due-date','redirect-map-check']);
for(const tool of SUITE_TOOLS){
 if(!legacyGuardedIds.has(tool.id))for(const locale of ['','/en']){
  const path=locale+'/studio/ai/'+tool.id;
  assert(publicReturnPath(path)&&publicReturnPath(path+'.html'),'Public tool uses a reserved route: '+path);
 }
}
assert.equal(SUITE_TOOLS.length,1000);
assert.equal(listing.length,1003);
assert.equal(cursors.size,25);
assert.equal(new Set(listing.map(tool=>tool.name)).size,listing.length);
for(const cursor of [false,null,'','!!!','x'.repeat(128),btoa('bpj/0.2.0/free/40'),btoa('bpj/0.3.0/free/1'),btoa('bpj/0.3.0/free/10000')]){
 const response=await req({jsonrpc:'2.0',id:42,method:'tools/list',params:{cursor}});
 assert.equal((await response.json()).error.code,-32602);
}
assert.deepEqual(listing.slice(0,3).map(tool=>tool.name),['list_bpj_ai_tools','review_task_state','run_bpj_ai_tool']);
assert.deepEqual(new Set(listing.slice(3).map(tool=>tool.name)),new Set(SUITE_TOOLS.map(tool=>tool.name)));
const discovery=JSON.parse((await rpc('tools/call',{name:'list_bpj_ai_tools'})).content[0].text);
assert.equal(discovery.tools[0].id,'task-loop');
assert.equal(discovery.suite.length,100);
assert.equal(discovery.suite[0].path,'/studio/ai/'+SUITE_TOOLS[0].id);
assert.equal(discovery.suite[0].freeMcp,SUITE_TOOLS[0].name);
assert.equal(discovery.paidStatus,'not_launched');
assert.equal(discovery.total,1000);
assert.equal(discovery.matched,1000);
assert.equal(discovery.nextOffset,100);
assert.deepEqual(discovery.categories.map(x=>x.id),SUITE_CATEGORIES.map(x=>x.id));
assert.equal(discovery.categories.reduce((sum,group)=>sum+group.count,0),1000);
const searchCall=async(args)=>rpc('tools/call',{name:'list_bpj_ai_tools',arguments:args});
const search=async(args)=>JSON.parse((await searchCall(args)).content[0].text);
const lastLegacy=await search({offset:99,limit:2});
assert.deepEqual(lastLegacy.suite.map(x=>x.freeMcp),SUITE_TOOLS.slice(99,101).map(x=>x.name));
const lastPage=await search({offset:999,limit:10});
assert.equal(lastPage.suite.length,1);
assert.equal(lastPage.nextOffset,null);
for(const group of SUITE_CATEGORIES){
 const groupTools=SUITE_TOOLS.filter(x=>x.category===group.id);
 const narrow=await search({category:group.id,limit:1,includeSchema:true});
 assert.equal(narrow.matched,groupTools.length);
 assert.equal(narrow.suite[0].id,groupTools[0].id);
 const tool=groupTools.at(-1);
 for(const query of [tool.id,tool.name,tool.title.zh]){
  const found=await search({query,limit:10,includeSchema:true});
  const hit=found.suite.find(x=>x.freeMcp===tool.name);
  assert(hit,query);
  assert.deepEqual(hit.inputSchema,toolInputSchema(tool));
  assert.deepEqual(hit.example,tool.example);
 }
}
assert.deepEqual((await search({query:'unlikely nonexistent term 9028351'})).suite,[]);
for(const args of [{category:'unknown!'},{query:2},{query:'a'.repeat(121)},{offset:-1},{limit:0},{limit:101},{includeSchema:true,limit:11},{includeSchema:1},{extra:'no'}]){
 assert.equal((await searchCall(args)).isError,true,JSON.stringify(args));
}
const dispatch=async args=>rpc('tools/call',{name:'run_bpj_ai_tool',arguments:args});
for(const tool of [SUITE_TOOLS[0],SUITE_TOOLS.at(-1)]){
 const direct=await rpc('tools/call',{name:tool.name,arguments:tool.example});
 assert.deepEqual(await dispatch({name:tool.name,arguments:tool.example}),direct);
}
for(const name of ['compare_task_runs','review_task_state','run_bpj_ai_tool','list_bpj_ai_tools','bpj_guess']){
 assert.equal((await dispatch({name,arguments:{}})).isError,true);
}
for(const args of [{},{name:SUITE_TOOLS[0].name,arguments:[]},{name:SUITE_TOOLS[0].name,arguments:SUITE_TOOLS[0].example,extra:2}]){
 assert.equal((await dispatch(args)).isError,true);
}
const paidListing=await rpc('tools/list',{},true,{AI_MCP_PAID_ENABLED:'true',HITS:fakeDb({id:'active',ends_at:Math.floor(Date.now()/1000)+600,suspended:0})});
assert.deepEqual(paidListing.tools.map(tool=>tool.name),['compare_task_runs']);
for(const tool of SUITE_TOOLS){
 const definition=listing.find(item=>item.name===tool.name);
 assert.match(tool.name,/^[a-zA-Z0-9_.-]{1,128}$/,tool.id);
 assert.equal(typeof tool.title.zh,'string',tool.id);
 assert.equal(typeof tool.description.en,'string',tool.id);
 assert.equal(definition.inputSchema.type,'object',tool.name);
 assert.deepEqual([...definition.inputSchema.required].sort(),Object.keys(tool.example).sort(),tool.name);
 assert.equal(definition.annotations?.readOnlyHint,true,tool.name);
 const checked=await rpc('tools/call',{name:tool.name,arguments:tool.example});
 assert.equal(checked.isError,undefined,tool.name);
 const expected=JSON.parse(JSON.stringify(runSuiteTool(tool.name,tool.example)));
 assert(expected!==null&&typeof expected==='object'&&!Array.isArray(expected),'MCP structuredContent must be a JSON object: '+tool.name);
 assert.deepEqual(checked.structuredContent,expected,tool.name);
 assert.deepEqual(JSON.parse(checked.content[0].text),expected,tool.name);
 const invalid=await rpc('tools/call',{name:tool.name,arguments:{...tool.example,bpj_unknown_fixture_property:'private fixture'}});
 assert.equal(invalid.isError,true,tool.name);
 assert.doesNotMatch(invalid.content[0].text,/private fixture/);
}
console.log('PASS '+SUITE_TOOLS.length+' free MCP fixtures and invalid arguments, paginated schemas, multilingual discovery and paid isolation.');
