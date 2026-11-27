import {AI_FREE_TOOLS,AI_PAID_TOOLS} from './ai-tool-registry.mjs';
import {SUITE_TOOLS,runSuiteTool} from './ai-suite/registry.mjs';
import {reviewTask,compareRuns} from '../assets/studio/task-loop-core.mjs';
import {memberByToken,memberStatus,rate} from './membership.js';
import {CATALOG_URL,FREE_MCP_VERSION,discoverSuite,listDefinitions} from './ai-tool-discovery.mjs';
import {AI_TRADE_QUOTE,isTradeQuoteExample,recordAiTradeQuote} from './ai-trade-quote-observations.mjs';
import {TRADE_QUOTE_ENTRY_URL} from './ai-suite/trade-quote.mjs';
import {MCP_REQUEST_HEADERS,mcpDiscovery,mcpRequestProtocol,mcpResult} from './mcp-protocol.mjs';
const DOCS='https://baipiaoji.com/en/studio/ai/';
const LEGACY_VERSIONS=['2025-06-18'];
const suiteNames=new Set(SUITE_TOOLS.map(tool=>tool.name));
const tradeQuoteExample=SUITE_TOOLS.find(tool=>tool.name===AI_TRADE_QUOTE)?.example;
const response=(body,status=200)=>new Response(body===null?null:JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(status===401?{'WWW-Authenticate':'Bearer realm="bpj-ai-mcp"'}:{}),...(status===405?{Allow:'POST, OPTIONS'}:{})}});
async function measureTradeQuote(ctx,form,outcome,inputs){
 try{
  const sample=isTradeQuoteExample(inputs,tradeQuoteExample);
  const write=recordAiTradeQuote(ctx.env.HITS,ctx.request,{form,outcome,sample});
  if(ctx.waitUntil)ctx.waitUntil(write);
  else await write;
 }catch{/* Measurement cannot change the MCP response. */}
}

export async function aiMcp(ctx,paid=false){
 const {request,env}=ctx;
 const url=new URL(request.url),origin=request.headers.get('Origin');
 if(origin!==null&&origin!==url.origin)return response({error:'origin_rejected'},403);
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{Allow:'POST, OPTIONS','Access-Control-Allow-Origin':url.origin,'Access-Control-Allow-Headers':MCP_REQUEST_HEADERS,'Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'}});
 if(request.method!=='POST')return response({error:'method_not_allowed',docs:DOCS,...(paid?{}:{catalog:CATALOG_URL})},405);
 if(paid){
  if(env.AI_MCP_PAID_ENABLED!=='true')return response({error:'paid_mcp_not_launched'},503);
  const token=request.headers.get('Authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
  if(!token)return response({error:'authentication_required'},401);
  try{if(!env.HITS)return response({error:'temporarily_unavailable'},503);const m=await memberByToken(env.HITS,token);if(!m)return response({error:'authentication_required'},401);if(!memberStatus(m).active)return response({error:'active_membership_required'},403);await rate(env.HITS,'ai-mcp:'+m.id,60,60);}catch(e){return response({error:e.message==='rate_limited'?'rate_limited':'temporarily_unavailable'},e.message==='rate_limited'?429:503);}
 }
 if(!/^application\/json(?:;|$)/i.test(request.headers.get('Content-Type')||''))return response({error:'json_required'},415);
 let msg;try{const reader=request.body?.getReader();if(!reader)return response({error:'invalid_request'},400);let size=0,chunks=[];for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>65536){await reader.cancel();return response({error:'too_large'},413);}chunks.push(value);}const bytes=new Uint8Array(size);let n=0;for(const c of chunks){bytes.set(c,n);n+=c.length;}msg=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{return response({jsonrpc:'2.0',id:null,error:{code:-32700,message:'Parse error'}},400);}
 const error=(code,message,status=200,data)=>response({jsonrpc:'2.0',id:msg?.id??null,error:{code,message,...(data?{data}:{})}},status);
 if(!msg||Array.isArray(msg)||msg.jsonrpc!=='2.0'||typeof msg.method!=='string')return error(-32600,'Invalid request');
 const {modern,error:protocolError}=mcpRequestProtocol(request.headers,msg,LEGACY_VERSIONS);
 if(protocolError)return error(protocolError.code,protocolError.message,400,protocolError.data);
 const serverInfo={name:paid?'bpj-ai-tools-pro':'bpj-ai-tools',version:paid?'0.1.0':FREE_MCP_VERSION};
 const rpc=value=>response({jsonrpc:'2.0',id:msg.id,result:mcpResult(value,modern,msg.method,serverInfo,paid?'private':'public')});
 if(!Object.hasOwn(msg,'id'))return msg.method.startsWith('notifications/')?response(null,202):error(-32600,'Missing id',modern?400:200);
 if(typeof msg.id!=='string'&&!(modern?Number.isSafeInteger(msg.id):typeof msg.id==='number'))return error(-32600,'Invalid id',modern?400:200);
 if(msg.method==='server/discover'||(!modern&&msg.method==='initialize')){
  const metadata={
   capabilities:{tools:{listChanged:false}},
   serverInfo,
   instructions:paid
    ?'Explicit-state workflow helpers. Inputs are unverified user evidence. Never interpret a rule decision as permission to act or a success probability.'
    :'Find a tool by calling list_bpj_ai_tools with a query or category and includeSchema:true. Call its freeMcp tool directly or pass its name and arguments to run_bpj_ai_tool. Use tools/list with each returned nextCursor to enumerate exact schemas. Tools run deterministic operations on the supplied inputs.',
  };
  return rpc(modern?mcpDiscovery(LEGACY_VERSIONS,metadata):{protocolVersion:LEGACY_VERSIONS[0],...metadata});
 }
 if(msg.method==='ping')return rpc({});
 if(msg.method==='tools/list'){
  try{return rpc(listDefinitions(msg.params,paid));}catch{return error(-32602,'Invalid list parameters or cursor',modern?400:200);}
 }
 if(msg.method!=='tools/call')return error(-32601,'Method not found',modern?404:200);
 const name=msg.params?.name,args=msg.params?.arguments??{};
 const isSuiteTool=!paid&&suiteNames.has(name);
 if(!isSuiteTool&&!(paid?AI_PAID_TOOLS:AI_FREE_TOOLS).some(t=>t.name===name))return error(-32602,'Unknown tool',modern?400:200);
 const quoteForm=!paid?(name===AI_TRADE_QUOTE?'direct':name==='run_bpj_ai_tool'&&args?.name===AI_TRADE_QUOTE?'wrapper':null):null;
 const quoteInputs=quoteForm==='wrapper'?args.arguments:args;
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
   if(quoteForm&&output.costCompleteness?.status==='costs_entered')output.entry_url=TRADE_QUOTE_ENTRY_URL;
   const reply=rpc({structuredContent:output,content:[{type:'text',text:JSON.stringify(output)}]});
   if(quoteForm)await measureTradeQuote(ctx,quoteForm,output.costCompleteness?.status,quoteInputs);
   return reply;
  }
  if(name==='list_bpj_ai_tools'){
   const out=discoverSuite(args,env.AI_MCP_PAID_ENABLED==='true');
   const reply=rpc({structuredContent:out,content:[{type:'text',text:JSON.stringify(out)}]});
   if(!paid&&out.suite.some(tool=>tool.freeMcp===AI_TRADE_QUOTE))await measureTradeQuote(ctx,'discovery','listed');
   return reply;
  }
  const out=paid?compareRuns(args.runs):reviewTask(args);
  return rpc({content:[{type:'text',text:JSON.stringify(out)}]});
 }catch{
  if(quoteForm)await measureTradeQuote(ctx,quoteForm,'invalid',quoteInputs);
  return rpc({isError:true,content:[{type:'text',text:'invalid_input: check the tool schema'}]});
 }
}
