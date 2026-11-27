import {seconds} from '../../lib/ad-commerce.js';
import {ACCOUNT_COOKIE} from '../../lib/free-account.js';
import {memberSite} from '../../lib/membership.js';
import {recordTradeMcpRun, resolveTradeMcpPrincipal} from '../../lib/trade-mcp-access.mjs';
import {workbenchAllowance, workbenchMember} from '../../lib/trade-workbench-access.mjs';
import {TRADE_MCP_DOCS, TRADE_MCP_PROTOCOLS, TRADE_MCP_SERVER_NAME, TRADE_MCP_TOOLS,
  TRADE_MCP_VERSION, getTradeTool, listTradeTools, runTradeTool, validateTradeMcpArgs} from '../../lib/trade-mcp-tools.mjs';
import {mcpDiscovery, mcpRequestProtocol, mcpResult} from '../../lib/mcp-protocol.mjs';

const origin = 'https://baipiaoji.com';
const serverInfo = {name:TRADE_MCP_SERVER_NAME,version:TRADE_MCP_VERSION};
const maxBodyBytes = 16 * 1024;
const secondsPerDay = 86400;
const envelopeFields = new Set(['jsonrpc','id','method','params']);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);

function reply(value, status = 200, extra = {}) {
  const headers = {'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',
    'X-Robots-Tag':'noindex','Referrer-Policy':'no-referrer',...extra};
  if (value !== null) headers['Content-Type'] = 'application/json; charset=utf-8';
  return new Response(value === null ? null : JSON.stringify(value), {status,headers});
}

function needsKey() {
  return reply({error:'trade_key_required',docs:TRADE_MCP_DOCS},401,{'WWW-Authenticate':'Bearer realm="bpj-trade-mcp"'});
}

function acceptsJson(request) {
  const accept = request.headers.get('Accept');
  if (!accept) return true;
  return accept.toLowerCase().split(',').some(entry => {
    const [type,...parameters] = entry.split(';');
    return ['application/json','application/*','*/*'].includes(type.trim()) &&
      !parameters.some(parameter=>/^\s*q\s*=\s*0(?:\.0*)?\s*$/.test(parameter));
  });
}

async function readMessage(request) {
  const reader = request.body.getReader();
  const bytes = new Uint8Array(maxBodyBytes);
  let size = 0;
  for (;;) {
    const {done,value} = await reader.read();
    if (done) break;
    if (size + value.byteLength > bytes.length) {
      await reader.cancel();
      return null;
    }
    bytes.set(value,size);
    size += value.byteLength;
  }
  return {message:JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(0,size)))};
}

function validClient(params) {
  const info = params?.clientInfo;
  return typeof params?.protocolVersion === 'string' && params.protocolVersion.length <= 32 &&
    object(params.capabilities) && object(info) && ['name','version'].every(field =>
      typeof info[field] === 'string' && info[field].length >= 1 && info[field].length <= 128);
}

function textResult(data, isError = false) {
  return {content:[{type:'text',text:JSON.stringify(data)}], structuredContent:data, ...(isError ? {isError:true} : {})};
}

export async function onRequest({request,env}) {
  const url = new URL(request.url);
  const source = request.headers.get('Origin');
  if (url.origin !== origin || (source !== null && source !== origin) || request.headers.get('Sec-Fetch-Site') === 'cross-site') {
    return reply({error:'origin_rejected'},403);
  }
  if (request.method !== 'POST') return reply({error:'method_not_allowed',docs:TRADE_MCP_DOCS},405,{Allow:'POST'});
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('Content-Type') || '')) return reply({error:'json_required'},415);
  if (!acceptsJson(request)) return reply({error:'accept_json_required'},406);
  const authorization = request.headers.get('Authorization');
  const hasAccountCookie = (request.headers.get('Cookie') || '').split(';').some(value=>value.trimStart().startsWith(ACCOUNT_COOKIE+'='));
  if (authorization !== null && hasAccountCookie) return reply({error:'mixed_authentication'},400);
  const length = request.headers.get('Content-Length');
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > maxBodyBytes)) return reply({error:'request_too_large'},413);
  if (!request.body) return reply({jsonrpc:'2.0',id:null,error:{code:-32600,message:'Invalid request'}},400);

  let message;
  try {
    const parsed = await readMessage(request);
    if (parsed === null) return reply({error:'request_too_large'},413);
    message = parsed.message;
  } catch {
    return reply({jsonrpc:'2.0',id:null,error:{code:-32700,message:'Parse error'}},400);
  }
  const validId = (typeof message?.id === 'string' && message.id.length <= 128) || Number.isSafeInteger(message?.id);
  const fail = (code, description, status = 200, headers, data) => reply({jsonrpc:'2.0',id:validId ? message.id : null,
    error:{code,message:description,...(data?{data}:{})}},status,headers);
  if (!object(message) || message.jsonrpc !== '2.0' || typeof message.method !== 'string' || message.method.length > 100 ||
      Object.keys(message).some(key=>!envelopeFields.has(key)) || (Object.hasOwn(message,'params') && !object(message.params))) {
    return fail(-32600,'Invalid request',400);
  }
  const {method,params = {}} = message;
  const {modern,error:protocolError} = mcpRequestProtocol(request.headers,message,TRADE_MCP_PROTOCOLS);
  if (protocolError) return fail(protocolError.code,protocolError.message,400,undefined,protocolError.data);
  const version = request.headers.get('MCP-Protocol-Version');
  if (!modern && version !== null && !TRADE_MCP_PROTOCOLS.includes(version)) return reply({error:'unsupported_protocol'},400);
  const result = value => reply({jsonrpc:'2.0',id:message.id,result:mcpResult(value,modern,method,serverInfo)});
  if (!Object.hasOwn(message,'id')) {
    return message.method.startsWith('notifications/') ? reply(null,202) : fail(-32600,'Request ID required',400);
  }
  if (!validId) return fail(-32600,'Invalid request ID',400);
  if (method === 'server/discover' || (!modern && method === 'initialize')) {
    if (!modern && !validClient(params)) return fail(-32602,'Invalid initialize parameters');
    const metadata = {
      serverInfo,capabilities:{tools:{listChanged:false}},
      instructions:'Discover 100 BPJ foreign-trade calculations and evidence checklists. For tools/call, register at BPJ and pass your dedicated key in the Authorization Bearer header. Read tool details first, send only necessary fields, and review source documents and legal or policy outputs before acting. '+TRADE_MCP_DOCS};
    const requested = params.protocolVersion;
    return result(modern ? mcpDiscovery(TRADE_MCP_PROTOCOLS,metadata) :
      {protocolVersion:TRADE_MCP_PROTOCOLS.includes(requested) ? requested : TRADE_MCP_PROTOCOLS[0],...metadata});
  }
  if (method === 'ping') return result({});
  if (method === 'tools/list') {
    return Object.keys(params).some(key=>key !== '_meta') ? fail(-32602,'This server lists all MCP methods without pagination',modern?400:200) : result({tools:TRADE_MCP_TOOLS});
  }
  if (method !== 'tools/call') return fail(-32601,'Method not found',modern?404:200);
  const bearer = authorization?.match(/^Bearer +(bpj_trade_[A-Za-z0-9_-]{43})$/i)?.[1];
  if (!bearer) return needsKey();

  try {
    if (!env.HITS || memberSite(env) !== 'bpj') return fail(-32603,'Service temporarily unavailable',503);
    const db = env.HITS;
    const principal = await resolveTradeMcpPrincipal(db,bearer,seconds());
    if (!principal) return needsKey();
    if (Object.keys(params).some(key=>!['name','arguments','_meta'].includes(key))) return fail(-32602,'Invalid tool parameters',modern?400:200);
    let output;
    try {
      const args = validateTradeMcpArgs(params.name,Object.hasOwn(params,'arguments') ? params.arguments : {});
      if (params.name === 'list_trade_tools') return result(textResult(listTradeTools(args)));
      if (params.name === 'get_trade_tool') return result(textResult(getTradeTool(args)));
      output = runTradeTool(args);
    } catch (error) {
      if (!(error instanceof RangeError)) throw error;
      return result(textResult({error:'invalid_tool_or_input',message:'Use the exact input schema from get_trade_tool.'},true));
    }

    const activeMember = await workbenchMember(db,principal.accountId,seconds());
    const now = seconds(), reset = (Math.floor(now / secondsPerDay) + 1) * secondsPerDay;
    const usage = await recordTradeMcpRun(db,principal,activeMember,now);
    if (!usage) {
      const checkedAt = seconds();
      if (!await resolveTradeMcpPrincipal(db,bearer,checkedAt)) return needsKey();
      if (activeMember && !await workbenchMember(db,principal.accountId,checkedAt)) return fail(-32003,'Access changed. Retry the request.',409);
      return fail(-32029,'Shared daily trade tool quota reached.',429,{'Retry-After':String(Math.max(1,reset-checkedAt))});
    }
    const quota = {...workbenchAllowance(activeMember,usage.runs),resets_at:new Date(reset*1000).toISOString()};
    return result(textResult({...output,quota}));
  } catch {
    return fail(-32603,'Service temporarily unavailable',503);
  }
}
