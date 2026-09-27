import {AI_TOOLS,AI_FREE_TOOLS,AI_PAID_TOOLS} from './ai-tool-registry.mjs';
import {reviewTask,compareRuns} from '../assets/studio/task-loop-core.mjs';
import {memberByToken,memberStatus,rate} from './membership.js';
const response=(body,status=200)=>new Response(body===null?null:JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(status===401?{'WWW-Authenticate':'Bearer realm="bpj-ai-mcp"'}:{})}});
export async function aiMcp({request,env},paid=false){
 const url=new URL(request.url),origin=request.headers.get('Origin');
 if(origin&&origin!==url.origin)return response({error:'origin_rejected'},403);
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{Allow:'POST, OPTIONS','Access-Control-Allow-Origin':url.origin,'Access-Control-Allow-Headers':'Content-Type, Authorization, MCP-Protocol-Version','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'}});
 if(request.method!=='POST')return response({error:'method_not_allowed',docs:'https://baipiaoji.com/en/studio/ai/'},405);
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
 if(msg.method==='initialize')return rpc({protocolVersion:'2025-06-18',capabilities:{tools:{listChanged:false}},serverInfo:{name:paid?'bpj-ai-tools-pro':'bpj-ai-tools',version:'0.1.0'},instructions:'Explicit-state workflow helpers. Inputs are unverified user evidence. Never interpret a rule decision as permission to act or a success probability.'});
 if(msg.method==='ping')return rpc({});
 if(msg.method==='tools/list')return rpc({tools:paid?AI_PAID_TOOLS:AI_FREE_TOOLS});
 if(msg.method!=='tools/call')return error(-32601,'Method not found');
 const name=msg.params?.name,args=msg.params?.arguments??{};if(!(paid?AI_PAID_TOOLS:AI_FREE_TOOLS).some(t=>t.name===name))return error(-32602,'Unknown tool');
 try{const out=name==='list_bpj_ai_tools'?{tools:AI_TOOLS,paidStatus:env.AI_MCP_PAID_ENABLED==='true'?'enabled_requires_membership':'not_launched'}:name==='review_task_state'?reviewTask(args):compareRuns(args.runs);return rpc({content:[{type:'text',text:JSON.stringify(out)}]});}catch{return rpc({isError:true,content:[{type:'text',text:'invalid_input: check the tool schema'}]});}
}
