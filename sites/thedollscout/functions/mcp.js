import {matchesInputSchema} from '../lib/mcp-input-schema.mjs';
import {prepareEventCard} from '../collector-assets/event-kit-core.mjs';
import {searchCollectionSeries,prepareCollectionChecklist} from '../collector-assets/collection-task-core.mjs';
import {compareBlindBoxBudget,estimateCollectionProgress} from '../collector-assets/planning-core.mjs';
/* Public, read-only collecting MCP. Evidence is loaded from published site data;
   display planning imports the browser calculator's actual core. Probability
   returns its explicit independent-draw assumption. No affiliate links,
   automatic local-collection access, accounts, uploads or paid actions are exposed here.
   Explicitly supplied figure lists are processed statelessly; never persisted in telemetry. */

import {SERVER,PROTOCOL_VERSION,TOOLS,RESOURCES} from '../collector-assets/mcp-contract.mjs';
import '../js/collector-core.js';
import {styleProbability} from '../collector-assets/style-odds-core.mjs';
import {recordMcpSuccess} from '../lib/collector-measurement.js';
import {legacyProtocolVersion,mcpError,mcpHeaders,mcpJson,mcpRequestProtocol,TDS_MCP_PROTOCOLS} from '../lib/mcp-transport.mjs';

// Both 100-name lists can contain 120 characters per name, including escaped
// Unicode in JSON. Bound the transport in bytes without narrowing that contract.
export const MAX_MCP_REQUEST_BYTES = 256 * 1024;

async function load(env, request, path) {
  const res = await env.ASSETS.fetch(new URL(path, request.url));
  if (!res.ok) throw new Error(`dataset ${path} unavailable (${res.status})`);
  return res.json();
}

async function callTool(name, args, ctx) {
  if(name==='prepare_swap_event_card')return prepareEventCard(await ctx.load('/collector-assets/series-catalog.json'),args,{today:new Date().toISOString().slice(0,10)});
  if(name==='search_collection_series')return searchCollectionSeries(await ctx.load('/collector-assets/series-catalog.json'),args);
  if(name==='prepare_collection_checklist')return prepareCollectionChecklist(await ctx.load('/collector-assets/series-catalog.json'),args);
  if(name==='compare_blind_box_budget')return {...compareBlindBoxBudget(args),source:'https://thedollscout.com/collecting/budget'};
  if(name==='estimate_collection_progress')return {...estimateCollectionProgress(args),source:'https://thedollscout.com/collecting/duplicates'};
  if(name==='calculate_style_probability')return {...styleProbability(args),source:'https://thedollscout.com/brands/labubu#style-probability'};
  if(name==='find_collector_tools'){
    const data=await ctx.load('/collector-assets/tool-capabilities.json');
    const lang=args.language||'en';
    return {tools:data.tools.filter(t=>!args.task||args.task==='all'||t.task===args.task).map(t=>({...t,selectedUrl:t.urls[lang]||t.urls.en,requestedLanguage:lang,languageFallback:!t.urls[lang]})),otherCatalog:data.digitalTools,limitations:data.limitations};
  }
  if(name==='get_collecting_guide'){
    const data=await ctx.load('/collector-assets/brand-guides.json');
    const guide=data.guides.find(g=>g.brand===args.brand&&g.language===(args.language||'en'));
    if(!guide)throw new Error('Published guide is unavailable');
    return guide;
  }
  if(name==='plan_display_fit'){
    const result=globalThis.DSCollector.fit({...args,rotate:args.rotate??true});
    return {found:true,input:{...args,rotate:args.rotate??true},...result,method:'Uniform rectangular footprint grid in one layer, comparing an optional 90-degree rotation.',limitations:['Use internal case dimensions and the largest actual footprint, including base and accessories.','No stacking, mixed orientations, material tolerances, weight limits or stability check.','Check physical measurements before buying.'],source:'https://thedollscout.com/display-calculator'};
  }
  if (name === "labubu_rarity_odds") {
    const data = await ctx.load("/data/rarity-odds.json");
    return {
      formats: data.formats,
      derived: data.derived,
      recorded: data.recorded,
      limitations: data.limitations,
      authoritative: "The odds printed on a specific series' own box and listing outrank every row here.",
      source: "https://thedollscout.com/rarity",
    };
  }

  if (name === "labubu_fake_signals") {
    const data = await ctx.load("/data/labubu-fake-signals.json");
    return {
      signals: data.signals,
      signalCount: data.signalCount,
      recorded: data.recorded,
      /* A checklist handed over without this reads as a guarantee, and it
         is not one. */
      limitations: data.limitations,
      source: "https://thedollscout.com/fake-check",
    };
  }

  if (name === "secret_pull_probability") {
    const N = Number(args.oddsN), b = Number(args.boxes);
    if (!Number.isFinite(N) || N < 2 || N > 100000) {
      return { found: false, message: "oddsN must be a number between 2 and 100000 (the N in printed odds 1:N)." };
    }
    if (!Number.isFinite(b) || b < 1 || b > 100000) {
      return { found: false, message: "boxes must be a number between 1 and 100000." };
    }
    const p = 1 / N;
    const atLeastOne = 1 - Math.pow(1 - p, b);
    return {
      found: true,
      oddsN: N,
      boxes: b,
      probabilityAtLeastOneSecret: Number(atLeastOne.toFixed(4)),
      probabilityPercent: `${(atLeastOne * 100).toFixed(1)}%`,
      boxesFor50pct: Math.ceil(Math.log(0.5) / Math.log(1 - p)),
      boxesFor90pct: Math.ceil(Math.log(0.1) / Math.log(1 - p)),
      model:
        "Independent single-box draws at the printed rate. Sealed whole-case allocation can differ; " +
        "this is the loose-box model. Check the printed odds on the series' own box.",
      source: "https://thedollscout.com/rarity",
    };
  }

  if (name === "define_labubu_term") {
    const data = await ctx.load("/data/labubu-glossary.json");
    const q = String(args.term || "").trim().toLowerCase();
    if (!q) return { found: false, message: "Pass a term to define, e.g. { term: 'lafufu' }." };
    const hit = data.terms.find(
      (t) => t.term.toLowerCase() === q || (t.aliases || []).some((a) => a.toLowerCase() === q)
    ) || data.terms.find(
      (t) => t.term.toLowerCase().includes(q) || (t.aliases || []).some((a) => a.toLowerCase().includes(q))
    );
    if (!hit) {
      return {
        found: false,
        message: `"${args.term}" is not in this glossary — which does not mean it doesn't exist.`,
        availableTerms: data.terms.map((t) => t.term),
        source: "https://thedollscout.com/glossary",
      };
    }
    return {
      found: true,
      term: hit.term,
      aliases: hit.aliases,
      definition: hit.definition,
      recorded: data.recorded,
      limitations: data.limitations,
      source: hit.url,
    };
  }

  return { found: false, message: `Unknown tool "${name}". Available: ${TOOLS.map((t) => t.name).join(", ")}.` };
}

const CAPABILITIES = { tools: {}, resources: {} };

export async function onRequest(context) {
  const {request, env} = context;
  const {allowed,headers}=mcpHeaders(request);
  if (!allowed) return new Response('Origin not allowed', {status:403,headers});
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });

  /* GET/HEAD are people, crawlers or HEAD-probes — answer with the discovery
     document, and answer HEAD with GET's status and headers (the retired
     site's crawl log showed every AI crawler reading a 405 here as a broken
     endpoint). */
  if(request.method==='GET'&&request.headers.get('accept')==='text/event-stream')return new Response(null,{status:405,headers:{...headers,allow:'POST, OPTIONS'}});
  if (request.method === "GET" || request.method === "HEAD") {
    if (request.method === "HEAD") {
      return new Response(null, { status: 200, headers: { ...headers, "content-type": "application/json" } });
    }
    return Response.json(
      {
        server: SERVER,
        protocolVersion: PROTOCOL_VERSION,
        supportedProtocolVersions: TDS_MCP_PROTOCOLS,
        transport: "Streamable HTTP — POST JSON-RPC to this same URL",
        tools: TOOLS, resources: RESOURCES, documentation: "https://thedollscout.com/for-agents",
        note:
          "Published evidence carries dates and limitations. Display math uses the same core as the browser tool. No affiliate links or private collection access.",
        datasets: ["https://thedollscout.com/data/rarity-odds.json", "https://thedollscout.com/data/labubu-fake-signals.json", "https://thedollscout.com/data/labubu-glossary.json", "https://thedollscout.com/data/pull-math.json"],
      },
      { headers }
    );
  }

  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers });
  }

  if(Number(request.headers.get('content-length')||0)>MAX_MCP_REQUEST_BYTES)return new Response('Request too large',{status:413,headers});
  let body;
  try {
    const text=await request.text();if(new TextEncoder().encode(text).byteLength>MAX_MCP_REQUEST_BYTES)return new Response('Request too large',{status:413,headers});body=JSON.parse(text);
  } catch {
    return mcpError(headers,null,{code:-32700,message:'Parse error'});
  }

  if(!body||Array.isArray(body)||body.jsonrpc!=='2.0'||typeof body.method!=='string')return mcpError(headers,null,{code:-32600,message:'Invalid Request'});
  const { id = null, method, params } = body;
  const protocol=mcpRequestProtocol(request.headers,method,params);
  if (protocol.error) return mcpError(headers,id,protocol.error,400);
  const reply = value => mcpJson(headers,id,value,{method,modern:protocol.modern,server:SERVER});
  const invalid = (code,message) => mcpError(headers,id,{code,message},protocol.modern ? 400 : 200);
  if (protocol.modern && typeof id !== 'string' && !Number.isSafeInteger(id)) return invalid(-32600,'Missing or invalid request id');
  const ctx = { load: (p) => load(env, request, p) };

  try {
    if (method === 'server/discover') return reply({supportedVersions:TDS_MCP_PROTOCOLS,capabilities:CAPABILITIES});
    if (!protocol.modern && method === "initialize") {
      return reply({protocolVersion:legacyProtocolVersion(params?.protocolVersion,PROTOCOL_VERSION),capabilities:CAPABILITIES,serverInfo:SERVER});
    }
    if (method === "ping")return reply({});
    if (!protocol.modern && id===null && method.startsWith("notifications/")) return new Response(null, { status: 202, headers });

    if (method === "tools/list") return reply({tools:TOOLS});

    if(method==='resources/list')return reply({resources:RESOURCES});
    if(method==='resources/templates/list'&&protocol.modern)return reply({resourceTemplates:[]});
    if(method==='resources/read'){
      const resource=RESOURCES.find(r=>r.uri===params?.uri);
      if(!resource)return invalid(-32602,'Unknown public resource');
      const value=await ctx.load(new URL(resource.uri).pathname);
      return reply({contents:[{uri:resource.uri,mimeType:resource.mimeType,text:JSON.stringify(value)}]});
    }
    if (method === "tools/call") {
      const tool=TOOLS.find(t=>t.name===params?.name);
      if(!tool)return invalid(-32602,'Unknown tool');
      const args=params?.arguments??{};
      if(!matchesInputSchema(args,tool.inputSchema))return reply({isError:true,content:[{type:'text',text:'Invalid arguments. Use the types, required fields and bounds published by tools/list.'}]});
      const result = await callTool(tool.name,args,ctx);
      const response = reply({
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          structuredContent: result,
          /* isError only for genuine failure — a correct "unknown tool"
             answer succeeded. */
          isError: false,
      });
      recordMcpSuccess(context, tool.name, result.found === false ? 'no_result' : 'result',protocol.clientInfo);
      return response;
    }

    return invalid(-32601, `Method not found: ${method}`);
  } catch (e) {
    if(e instanceof RangeError)return reply({isError:true,content:[{type:"text",text:e.message}]});
    return mcpError(headers,id,{code:-32603,message:`Internal error: ${e.message}`},protocol.modern ? 500 : 200);
  }
}
