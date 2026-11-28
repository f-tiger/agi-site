import assert from 'node:assert/strict';
import {setTimeout as wait} from 'node:timers/promises';
import {SUITE_TOOLS,runSuiteTool,suiteToolDefinitions} from '../lib/ai-suite/registry.mjs';
import {FREE_MCP_VERSION} from '../lib/ai-tool-discovery.mjs';
import {AI_FREE_TOOLS} from '../lib/ai-tool-registry.mjs';

const expectedDefinitions=AI_FREE_TOOLS.length+SUITE_TOOLS.length;

const origin='https://baipiaoji.com';
const quoteToolName='bpj_trade_export_quote';
const quoteEntryUrl=origin+'/studio/ai/trade-export-quote?mcp_entry=trade-export-quote';
const protocolVersion='2025-06-18';
const metadataOnly=process.argv.includes('--metadata-only');
const all=process.argv.includes('--all');
async function fetchChecked(path, options = {}) {
 const headers = {'User-Agent':'bpj-ci-selfcheck/1.0','X-Probe':'1',...options.headers};
 for(let attempt=0;;attempt++){
  let response;
  try{
   response=await fetch(origin+path,{...options,headers,signal:AbortSignal.timeout(20000)});
  }catch(error){
   if(attempt>=2||!['TimeoutError','TypeError'].includes(error.name))throw error;
   await wait(1000*2**attempt);
   continue;
  }
  if(attempt>=2||![429,502,503,504].includes(response.status))return response;
  await response.body?.cancel();
  const requested=response.headers.get('Retry-After');
  let delay=2**attempt;
  if(requested){
   const seconds=/^\d+$/.test(requested)?Number(requested):(Date.parse(requested)-Date.now())/1000;
   if(seconds>30)throw Error('Server requested a longer retry delay; rerun the read-only check later.');
   if(Number.isFinite(seconds))delay=Math.max(delay,seconds);
  }
  await wait(delay*1000);
 }
}
for(const path of ['/studio/ai/','/en/studio/ai/','/studio/task-loop','/en/studio/task-loop']){
 const r=await fetchChecked(path+'?__ci=1');
 assert.equal(r.status,200,path);
 assert.match(await r.text(),/Task Loop|任务回溯与预测/);
 console.log('PASS '+path);
}
const headers={'Content-Type':'application/json','Accept':'application/json, text/event-stream','MCP-Protocol-Version':protocolVersion};
let id=0;
const rpc=async(method,params)=>{
 const requestId=++id;
 const r=await fetchChecked('/api/ai-mcp?__ci=1',{
  method:'POST',headers,
  body:JSON.stringify({jsonrpc:'2.0',id:requestId,method,params})
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
assert.deepEqual(meta.serverInfo,{name:'bpj-ai-tools',version:FREE_MCP_VERSION});
const listed=[];
const cursors=new Set();
let cursor;
do{
 const page=await rpc('tools/list',cursor?{cursor}:{});
 assert(page.tools.length>0&&page.tools.length<=40);
 listed.push(...page.tools);
 cursor=page.nextCursor;
 if(cursor){
  assert.equal(typeof cursor,'string');
  assert(!cursors.has(cursor),'MCP list cursor repeated');
  cursors.add(cursor);
 }
 assert(listed.length<=expectedDefinitions,'More MCP tools than advertised');
} while(cursor);
assert.equal(listed.length,expectedDefinitions);
assert.deepEqual(listed.slice(0,3).map(x=>x.name),['list_bpj_ai_tools','review_task_state','run_bpj_ai_tool']);
assert.deepEqual(listed.slice(3),suiteToolDefinitions());
console.log('PASS live free MCP initialize and '+listed.length+' definitions across '+(cursors.size+1)+' pages.');

for(const locale of ['', '/en']){
 const response=await fetchChecked(locale+'/ai-tools.json?__ci=1');
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
 const sampleSearch=await rpc('tools/call',{name:'list_bpj_ai_tools',arguments:{query:'bpj_csv_to_json',limit:1,includeSchema:true}});
 const search=JSON.parse(sampleSearch.content[0].text);
 assert.equal(search.total,SUITE_TOOLS.length);
 assert.equal(search.suite[0].freeMcp,'bpj_csv_to_json');
 assert.deepEqual(search.suite[0].inputSchema,listed.find(x=>x.name==='bpj_csv_to_json').inputSchema);
 const checkTool=async(tool,args=tool.example,dispatch=false)=>{
  const target=dispatch?{name:'run_bpj_ai_tool',arguments:{name:tool.name,arguments:args}}:{name:tool.name,arguments:args};
  const result=await rpc('tools/call',target);
  const label=dispatch?tool.name+' via dispatcher':tool.name;
  assert.equal(result.isError,undefined,label);
  const expected=JSON.parse(JSON.stringify(runSuiteTool(tool.name,args)));
  // The MCP transport, not the calculator, adds a fixed link only to completed quotes.
  if(tool.name===quoteToolName&&expected.costCompleteness.status==='costs_entered')expected.entry_url=quoteEntryUrl;
  assert.deepEqual(result.structuredContent,expected,label);
  assert.deepEqual(JSON.parse(result.content[0].text),expected,label);
  return result.structuredContent;
 };
 const quote=SUITE_TOOLS.find(tool=>tool.name===quoteToolName);
 assert(quote,'Missing export quote tool');
 for(const dispatch of [false,true]){
  const complete=await checkTool(quote,quote.example,dispatch);
  assert.equal(complete.entry_url,quoteEntryUrl);
  const provisional=await checkTool(quote,{...quote.example,sellerFees:'[]'},dispatch);
  assert.equal(provisional.costCompleteness.status,'provisional');
  assert.equal(provisional.quotedOrder.meetsTarget,null);
  assert(!Object.hasOwn(provisional,'entry_url'));
 }
 const last=SUITE_TOOLS.at(-1);
 if(last.name!==quoteToolName)await checkTool(last,last.example,true);
 const samples=(all?SUITE_TOOLS:[...new Map(SUITE_TOOLS.map(tool=>[tool.category,tool])).values()]).filter(tool=>tool.name!==quoteToolName);
 // Cap the synthetic production probe at two concurrent calls.
 for(let i=0;i<samples.length;i+=2){
  await Promise.all(samples.slice(i,i+2).map(tool=>checkTool(tool)));
  if((i+2)%100===0)console.log('Verified '+(i+2)+' synthetic tool calls.');
 }
 console.log('PASS live Task Loop, keyword discovery, completed/provisional export quote handoff in both call modes, and '+samples.length+' additional free MCP tool examples.');
}
