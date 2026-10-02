/* Public, read-only collecting MCP. Evidence is loaded from published site data;
   display planning imports the browser calculator's actual core. Probability
   returns its explicit independent-draw assumption. No affiliate links,
   user collections, accounts, uploads or paid actions are exposed here. */

import {SERVER,PROTOCOL_VERSION,TOOLS,RESOURCES} from '../collector-assets/mcp-contract.mjs';
import '../js/collector-core.js';

async function load(env, request, path) {
  const res = await env.ASSETS.fetch(new URL(path, request.url));
  if (!res.ok) throw new Error(`dataset ${path} unavailable (${res.status})`);
  return res.json();
}

async function callTool(name, args, ctx) {
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

const rpc = (id, result) => ({ jsonrpc: "2.0", id, result });
const rpcError = (id, code, message) => ({ jsonrpc: "2.0", id, error: { code, message } });

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type, mcp-protocol-version",
};

export async function onRequest({ request, env }) {
  const origin=request.headers.get('origin');
  if(origin&&!['https://thedollscout.com','https://chatgpt.com','https://claude.ai','https://www.perplexity.ai'].includes(origin))return new Response('Origin not allowed',{status:403,headers:CORS});
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  /* GET/HEAD are people, crawlers or HEAD-probes — answer with the discovery
     document, and answer HEAD with GET's status and headers (the retired
     site's crawl log showed every AI crawler reading a 405 here as a broken
     endpoint). */
  if(request.method==='GET'&&request.headers.get('accept')==='text/event-stream')return new Response(null,{status:405,headers:{...CORS,Allow:'POST, OPTIONS'}});
  if (request.method === "GET" || request.method === "HEAD") {
    if (request.method === "HEAD") {
      return new Response(null, { status: 200, headers: { ...CORS, "content-type": "application/json" } });
    }
    return Response.json(
      {
        server: SERVER,
        protocolVersion: PROTOCOL_VERSION,
        transport: "Streamable HTTP — POST JSON-RPC to this same URL",
        tools: TOOLS, resources: RESOURCES, documentation: "https://thedollscout.com/for-agents",
        note:
          "Published evidence carries dates and limitations. Display math uses the same core as the browser tool. No affiliate links or private collection access.",
        datasets: ["https://thedollscout.com/data/rarity-odds.json", "https://thedollscout.com/data/labubu-fake-signals.json", "https://thedollscout.com/data/labubu-glossary.json", "https://thedollscout.com/data/pull-math.json"],
      },
      { headers: CORS }
    );
  }

  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: CORS });
  }

  if(Number(request.headers.get('content-length')||0)>16384)return new Response('Request too large',{status:413,headers:CORS});
  let body;
  try {
    const text=await request.text();if(text.length>16384)return new Response('Request too large',{status:413,headers:CORS});body=JSON.parse(text);
  } catch {
    return Response.json(rpcError(null, -32700, "Parse error"), { headers: CORS });
  }

  if(!body||Array.isArray(body)||body.jsonrpc!=='2.0'||typeof body.method!=='string')return Response.json(rpcError(null,-32600,'Invalid Request'),{headers:CORS});
  const { id = null, method, params } = body;
  const ctx = { load: (p) => load(env, request, p) };

  try {
    if (method === "initialize") {
      return Response.json(
        rpc(id, { protocolVersion: PROTOCOL_VERSION, capabilities: { tools: {}, resources: {} }, serverInfo: SERVER }),
        { headers: CORS }
      );
    }
    if (method === "ping")return Response.json(rpc(id,{}),{headers:CORS});
    if (id===null && method.startsWith("notifications/")) return new Response(null, { status: 202, headers: CORS });

    if (method === "tools/list") return Response.json(rpc(id, { tools: TOOLS }), { headers: CORS });

    if(method==='resources/list')return Response.json(rpc(id,{resources:RESOURCES}),{headers:CORS});
    if(method==='resources/read'){
      const resource=RESOURCES.find(r=>r.uri===params?.uri);
      if(!resource)return Response.json(rpcError(id,-32602,'Unknown public resource'),{headers:CORS});
      const value=await ctx.load(new URL(resource.uri).pathname);
      return Response.json(rpc(id,{contents:[{uri:resource.uri,mimeType:resource.mimeType,text:JSON.stringify(value)}]}),{headers:CORS});
    }
    if (method === "tools/call") {
      const tool=TOOLS.find(t=>t.name===params?.name);
      if(!tool)return Response.json(rpcError(id,-32602,'Unknown tool'),{headers:CORS});
      const args=params?.arguments??{}; const schema=tool.inputSchema;
      let invalid=!args||typeof args!=='object'||Array.isArray(args);
      if(!invalid){
        invalid=(schema.required||[]).some(k=>!(k in args))||Object.keys(args).some(k=>!(k in schema.properties));
        for(const [k,v]of Object.entries(args)){
          const spec=schema.properties[k];if(!spec)continue;
          if(spec.type==='integer'&&!Number.isInteger(v)||spec.type!=='integer'&&typeof v!==spec.type)invalid=true;
          if(spec.enum&&!spec.enum.includes(v)||spec.maxLength&&v.length>spec.maxLength)invalid=true;
          if(typeof v==='number'&&(!Number.isFinite(v)||spec.minimum!==undefined&&v<spec.minimum||spec.exclusiveMinimum!==undefined&&v<=spec.exclusiveMinimum||spec.maximum!==undefined&&v>spec.maximum))invalid=true;
        }
      }
      if(invalid)return Response.json(rpc(id,{isError:true,content:[{type:'text',text:'Invalid arguments. Use the types, required fields and bounds published by tools/list.'}]}),{headers:CORS});
      const result = await callTool(tool.name,args,ctx);
      return Response.json(
        rpc(id, {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          structuredContent: result,
          /* isError only for genuine failure — a correct "unknown tool"
             answer succeeded. */
          isError: false,
        }),
        { headers: CORS }
      );
    }

    return Response.json(rpcError(id, -32601, `Method not found: ${method}`), { headers: CORS });
  } catch (e) {
    return Response.json(rpcError(id, -32603, `Internal error: ${e.message}`), { headers: CORS });
  }
}
