import {AI_FREE_TOOLS,AI_PAID_TOOLS} from './ai-tool-registry.mjs';
import {SUITE_TOOLS,runSuiteTool} from './ai-suite/registry.mjs';
import {reviewTask,compareRuns} from '../assets/studio/task-loop-core.mjs';
import {memberByToken,memberStatus,rate} from './membership.js';
import {CATALOG_URL,FREE_MCP_VERSION,discoverSuite,listDefinitions} from './ai-tool-discovery.mjs';
const DOCS='https://baipiaoji.com/en/studio/ai/';
const suiteNames=new Set(SUITE_TOOLS.map(tool=>tool.name));
const response=(body,status=200)=>new Response(body===null?null:JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(status===401?{'WWW-Authenticate':'Bearer realm="bpj-ai-mcp"'}:{}),...(status===405?{Allow:'POST, OPTIONS'}:{})}});
export async function aiMcp({request,env},paid=false){
 const url=new URL(request.url),origin=request.headers.get('Origin');
 if(origin&&origin!==url.origin)return response({error:'origin_rejected'},403);
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{Allow:'POST, OPTIONS','Access-Control-Allow-Origin':url.origin,'Access-Control-Allow-Headers':'Content-Type, Authorization, MCP-Protocol-Version','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'}});
 if(request.method!=='POST')return response({error:'method_not_allowed',docs:DOCS,...(paid?{}:{catalog:CATALOG_URL})},405);
 if(paid){
  if(env.AI_MCP_PAID_ENABLED!=='true')return response({error:'paid_mcp_not_launched'},503);
  const token=request.headers.get('Authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
  if(!token)return response({error:'authentication_required'},401);
  try{if(!env.HITS)return response({error:'temporarily_unavailable'},503);const m=await memberByToken(env.HITS,token);if(!m)return response({error:'authentication_required'},401);if(!memberStatus(m).active)return response({error:'active_membership_required'},403);await rate(env.HITS,'ai-mcp:'+m.id,60,60);}catch(e){return response({error:e.message==='rate_limited'?'rate_limited':'temporarily_unavailable'},e.message==='rate_limited'?429:503);}
 }
 if(!/^application\/json(?:;|$)/i.test(request.headers.get('Content-Type')||''))return response({error:'json_required'},415);
 let msg;try{const reader=request.body?.getReader();if(!reader)return response({error:'invalid_request'},400);let size=0,chunks=[];for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>65536){await reader.cancel();return response({error:'too_large'},413);}chunks.push(value);}const bytes=new Uint8Array(size);let n=0;for(const c of chunks){bytes.set(c,n);n+=c.length;}msg=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{return response({jsonrpc:'2.0',id:null,error:{code:-32700,message:'Parse error'}},400);}
 const rpc=(result)=>response({jsonrpc:'2.0',id:msg.id,result}),error=(code,message)=>response({jsonrpc:'2.0',id:msg?.id??null,error:{code,message}});
 if(!msg||Array.isArray(msg)||msg.jsonrpc!=='2.0'||typeof msg.method!=='string')return error(-32600,'Invalid request');
 if(!Object.hasOwn(msg,'id'))return msg.method.startsWith('notifications/')?response(null,202):error(-32600,'Missing id');
 if(typeof msg.id!=='string'&&typeof msg.id!=='number')return error(-32600,'Invalid id');
 if(msg.method==='initialize')return rpc({
  protocolVersion:'2025-06-18',
  capabilities:{tools:{listChanged:false}},
  serverInfo:{name:paid?'bpj-ai-tools-pro':'bpj-ai-tools',version:paid?'0.1.0':FREE_MCP_VERSION},
  instructions:paid
   ?'Explicit-state workflow helpers. Inputs are unverified user evidence. Never interpret a rule decision as permission to act or a success probability.'
   :'Find a tool by calling list_bpj_ai_tools with a query or category and includeSchema:true. Call its freeMcp tool directly or pass its name and arguments to run_bpj_ai_tool. Use tools/list with each returned nextCursor to enumerate exact schemas. Tools run deterministic operations on the supplied inputs.'
 });
 if(msg.method==='ping')return rpc({});
 if(msg.method==='tools/list'){
  try{return rpc(listDefinitions(msg.params,paid));}catch{return error(-32602,'Invalid list parameters or cursor');}
 }
 if(msg.method!=='tools/call')return error(-32601,'Method not found');
 const name=msg.params?.name,args=msg.params?.arguments??{};
 const isSuiteTool=!paid&&suiteNames.has(name);
 if(!isSuiteTool&&!(paid?AI_PAID_TOOLS:AI_FREE_TOOLS).some(t=>t.name===name))return error(-32602,'Unknown tool');
 try{
  if(isSuiteTool||name==='run_bpj_ai_tool'){
   let target=name, inputs=args;
   if(!isSuiteTool){
    if(!args||typeof args!=='object'||Array.isArray(args)||Object.keys(args).length!==2||
       !Object.hasOwn(args,'name')||!Object.hasOwn(args,'arguments')||!suiteNames.has(args.name))throw Error('Invalid suite call.');
    target=args.name;
    inputs=args.arguments;
   }
   const output=runSuiteTool(target,inputs);
   return rpc({structuredContent:output,content:[{type:'text',text:JSON.stringify(output)}]});
  }
  if(name==='list_bpj_ai_tools'){
   const out=discoverSuite(args,env.AI_MCP_PAID_ENABLED==='true');
   return rpc({content:[{type:'text',text:JSON.stringify(out)}]});
  }
  const out=paid?compareRuns(args.runs):reviewTask(args);
  return rpc({content:[{type:'text',text:JSON.stringify(out)}]});
 }catch{return rpc({isError:true,content:[{type:'text',text:'invalid_input: check the tool schema'}]});}
}
