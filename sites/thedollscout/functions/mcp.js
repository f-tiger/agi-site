/* An MCP endpoint, so this site's evidence can be CALLED rather than only
   read (rebuilt 2026-08-30 for the Labubu site; the retired site's endpoint
   established the pattern and the load-bearing decision below).

   THE LOAD-BEARING DECISION: every answer is read from the published JSON at
   request time. No rule is reimplemented here. A second copy of the odds
   table would be a third source of truth — after the page and the dataset —
   and that failure mode is the one this fleet keeps paying to remove. If
   /data/rarity-odds.json changes, this changes with it, or it stops
   answering. It never quietly disagrees.

   Every result carries the recording date and the limitations that travel
   with the data. A tool that returns a bare number strips the caveats a
   careful page spent paragraphs establishing.

   COMPLIANCE (fleet iron rule): affiliate links never appear in MCP output.
   Sources returned here are our own pages and the named public sources only.

   Runs as a Cloudflare Pages Function at /mcp. Transport is the JSON-RPC
   POST half of streamable HTTP — stateless, no session, no SSE. */

const PROTOCOL_VERSION = "2025-06-18";
const SERVER = { name: "dollscout", version: "2.1.0" };

const TOOLS = [
  {
    name: "labubu_rarity_odds",
    description:
      "Commonly reported secret/chase odds for Labubu / The Monsters blind-box series, by series format " +
      "(6-figure, 12-figure, collabs, glow variants), with per-row sources. The box-printed odds for a " +
      "specific series outrank every row returned here, and the result says so.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "labubu_fake_signals",
    description:
      "The eight authenticity checks for a Labubu figure (teeth count, face finish, box finish, " +
      "anti-counterfeit seal, figure markings, build quality, price floor, seller of record), each with " +
      "its named public sources. Compiled signals, not a guarantee; limitations are included.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "secret_pull_probability",
    description:
      "Probability of pulling at least one secret across N blind boxes at printed odds of 1-in-oddsN, " +
      "plus the box counts a 50% and 90% chance require. Independent single-box model — sealed whole-case " +
      "allocation can differ, and the result carries that caveat.",
    inputSchema: {
      type: "object",
      properties: {
        oddsN: { type: "number", description: "The N in printed odds 1:N, e.g. 72" },
        boxes: { type: "number", description: "Number of blind boxes to be opened, e.g. 12" },
      },
      required: ["oddsN", "boxes"],
    },
  },
  {
    name: "define_labubu_term",
    description:
      "Plain-language definition of a Labubu / blind-box collecting term (blind box, series, regular, " +
      "secret/chase, printed odds, case, glow variant, vinyl plush pendant, Lafufu, seller of record). " +
      "Matches the term or its aliases; an unknown term returns the list of available terms, honestly.",
    inputSchema: {
      type: "object",
      properties: {
        term: { type: "string", description: "The term to define, e.g. 'lafufu' or 'printed odds'" },
      },
      required: ["term"],
    },
  },
];

async function load(env, request, path) {
  const res = await env.ASSETS.fetch(new URL(path, request.url));
  if (!res.ok) throw new Error(`dataset ${path} unavailable (${res.status})`);
  return res.json();
}

async function callTool(name, args, ctx) {
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
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  /* GET/HEAD are people, crawlers or HEAD-probes — answer with the discovery
     document, and answer HEAD with GET's status and headers (the retired
     site's crawl log showed every AI crawler reading a 405 here as a broken
     endpoint). */
  if (request.method === "GET" || request.method === "HEAD") {
    if (request.method === "HEAD") {
      return new Response(null, { status: 200, headers: { ...CORS, "content-type": "application/json" } });
    }
    return Response.json(
      {
        server: SERVER,
        protocolVersion: PROTOCOL_VERSION,
        transport: "Streamable HTTP — POST JSON-RPC to this same URL",
        tools: TOOLS.map((t) => ({ name: t.name, description: t.description })),
        note:
          "Every answer is read from the published CC-BY datasets at request time and carries their " +
          "recording date and limitations. No rule is reimplemented in this endpoint. No affiliate " +
          "links appear in tool output.",
        datasets: ["https://thedollscout.com/data/rarity-odds.json", "https://thedollscout.com/data/labubu-fake-signals.json", "https://thedollscout.com/data/labubu-glossary.json", "https://thedollscout.com/data/pull-math.json"],
      },
      { headers: CORS }
    );
  }

  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: CORS });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json(rpcError(null, -32700, "Parse error"), { headers: CORS });
  }

  const { id = null, method, params } = body || {};
  const ctx = { load: (p) => load(env, request, p) };

  try {
    if (method === "initialize") {
      return Response.json(
        rpc(id, { protocolVersion: PROTOCOL_VERSION, capabilities: { tools: {} }, serverInfo: SERVER }),
        { headers: CORS }
      );
    }
    if (method === "notifications/initialized") return new Response(null, { status: 202, headers: CORS });

    if (method === "tools/list") return Response.json(rpc(id, { tools: TOOLS }), { headers: CORS });

    if (method === "tools/call") {
      const result = await callTool(params?.name, params?.arguments || {}, ctx);
      return Response.json(
        rpc(id, {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
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
