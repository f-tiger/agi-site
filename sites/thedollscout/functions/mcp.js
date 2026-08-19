/* An MCP endpoint, so this site's tools can be CALLED rather than only read.

   The previous pass made the tools' conclusions extractable — a decision
   matrix as text, worked cost examples, a published dataset. That lets a model
   quote us. This lets a model ask us, with the visitor's own numbers, and get
   the same answer the page would give.

   THE LOAD-BEARING DECISION: every answer is read from the published JSON at
   request time. No rule is reimplemented here. A second copy of the recourse
   thresholds or the cost model would be a third source of truth — after the
   page and the generator — and we spent several passes removing exactly that
   failure mode. If /data/payment-recourse.json changes, this changes with it,
   or it stops answering. It never quietly disagrees.

   Every result carries the recording date and the limitations that travel with
   the data. An MCP tool that returns a bare number strips the caveats a
   careful page spent paragraphs establishing, and the caller has no way to
   know what was dropped.

   Runs as a Cloudflare Pages Function at /mcp. Transport is the JSON-RPC POST
   half of streamable HTTP, which is what MCP clients use for a stateless
   server; there is no session or SSE stream because nothing here is
   long-running or stateful. */

const PROTOCOL_VERSION = "2025-06-18";
const SERVER = { name: "dollscout", version: "1.0.0" };

const TOOLS = [
  {
    name: "doll_weight_by_height",
    description:
      "What adult dolls of a given height actually weigh, from recorded live listings. " +
      "Listings routinely omit weight, which is why this data was collected. " +
      "Returns the measured range, median and sample size, or states that no listing at that height was recorded.",
    inputSchema: {
      type: "object",
      properties: { heightCm: { type: "number", description: "Doll height in centimetres, e.g. 150" } },
      required: ["heightCm"],
    },
  },
  {
    name: "payment_recourse",
    description:
      "What buyer recourse survives after payment for a consumer purchase: whether a UK Consumer Credit Act " +
      "section 75 claim appears to apply, and whether a card chargeback is available. Derived from the statute " +
      "and Financial Ombudsman Service guidance. Not legal advice.",
    inputSchema: {
      type: "object",
      properties: {
        country: { type: "string", description: "'uk' or 'other'. Section 75 is UK statute." },
        paymentMethod: { type: "string", description: "credit, pos, debit, charge, wallet, transfer, or crypto" },
        priceGbp: { type: "number", description: "Cash price of the single item in GBP" },
      },
      required: ["country", "paymentMethod", "priceGbp"],
    },
  },
  {
    name: "first_year_cost",
    description:
      "Realistic first-year cost of owning an adult doll beyond the sticker price: import charge, care supplies, " +
      "storage and a repair reserve. Conservative editorial estimates, not vendor quotes. The US duty RATE is " +
      "deliberately not modelled because the tariff classification is unsettled.",
    inputSchema: {
      type: "object",
      properties: {
        priceUsd: { type: "number", description: "Doll sticker price in USD" },
        material: { type: "string", description: "tpe, silicone, or torso" },
        region: { type: "string", description: "us, eu, or other" },
        addonsUsd: { type: "number", description: "Factory add-ons, default 150" },
        storageUsd: { type: "number", description: "Storage solution, default 120" },
      },
      required: ["priceUsd", "material", "region"],
    },
  },
  {
    name: "scam_check_signals",
    description:
      "The ten checks to run against an unfamiliar doll shop before entering a card number, built from documented " +
      "complaint threads, chargeback cases and counterfeit reports. Passing all ten is not a guarantee — it means " +
      "no known pattern fired.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "import_rules",
    description:
      "Legal status, duty and customs treatment for importing an adult-form doll into a given country, with the " +
      "sources for that country. A reading of published rules, not legal advice. Childlike dolls are prohibited " +
      "everywhere covered and carry serious criminal penalties.",
    inputSchema: {
      type: "object",
      properties: { country: { type: "string", description: "Country name or slug, e.g. 'australia' or 'United States'" } },
      required: ["country"],
    },
  },
  {
    name: "doll_price_bands",
    description:
      "Recorded price distribution for adult dolls: floor, median, top, and how many listings fall under $1,000. " +
      "Useful for judging whether an advertised price is plausible — prices far below the recorded floor are a " +
      "counterfeit signal rather than a bargain.",
    inputSchema: { type: "object", properties: {} },
  },
];

/* Reading, never reimplementing. */
async function load(env, request, path) {
  const url = new URL(path, request.url);
  const res = await env.ASSETS.fetch(new Request(url, { headers: { accept: "application/json" } }));
  if (!res.ok) throw new Error(`could not load ${path} (HTTP ${res.status})`);
  return res.json();
}

const median = (a) => {
  const s = [...a].sort((x, y) => x - y);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

export async function callTool(name, args, ctx) {
  if (name === "doll_weight_by_height") {
    const data = await ctx.load("/data/doll-specs.json");
    const rows = data.rows.filter((r) => !r.isPartialBody && r.heightCm === Number(args.heightCm) && r.weightLb);
    if (!rows.length) {
      const heights = [...new Set(data.rows.filter((r) => !r.isPartialBody && r.weightLb).map((r) => r.heightCm))].sort((a, b) => a - b);
      return {
        found: false,
        message: `No ${args.heightCm}cm listing was recorded. Heights present in this dataset: ${heights.join(", ")}.`,
        recorded: data.recorded,
      };
    }
    const w = rows.map((r) => r.weightLb).sort((a, b) => a - b);
    return {
      found: true,
      heightCm: Number(args.heightCm),
      sampleSize: rows.length,
      weightLb: { min: w[0], max: w[w.length - 1], median: median(w) },
      weightKg: { min: Math.round(w[0] / 2.20462), max: Math.round(w[w.length - 1] / 2.20462) },
      recorded: data.recorded,
      /* The caveats travel with the number or the number is misleading. */
      limitations: data.limitations,
      source: "https://thedollscout.com/data/",
    };
  }

  if (name === "payment_recourse") {
    const data = await ctx.load("/data/payment-recourse.json");
    const price = Number(args.priceGbp);
    const band = price <= data.thresholds.section75MinGbp ? "under"
      : price > data.thresholds.section75MaxGbp ? "over" : "within";
    const cell = data.cells.find(
      (c) => c.country === (args.country === "uk" ? "uk" : "other") &&
             c.paymentMethod === args.paymentMethod &&
             c.priceBand === band
    );
    if (!cell) {
      return {
        found: false,
        message: `No rule for paymentMethod "${args.paymentMethod}". Known methods: ${[...new Set(data.cells.map((c) => c.paymentMethod))].join(", ")}.`,
      };
    }
    return {
      found: true,
      section75: cell.section75,
      section75Verdict: cell.section75Verdict,
      chargeback: cell.chargeback,
      chargebackVerdict: cell.chargebackVerdict,
      priceBand: cell.priceBandLabel,
      appliesTo: data.appliesTo,
      limitations: data.limitations,
      openQuestions: data.openQuestions,
      source: "https://thedollscout.com/payment-protection.html",
    };
  }

  if (name === "first_year_cost") {
    const data = await ctx.load("/data/first-year-cost.json");
    const m = data.model.materials.find((x) => x.id === args.material);
    const r = data.model.regions.find((x) => x.id === args.region);
    if (!m || !r) {
      return {
        found: false,
        message: `Unknown ${!m ? "material" : "region"}. Materials: ${data.model.materials.map((x) => x.id).join(", ")}. Regions: ${data.model.regions.map((x) => x.id).join(", ")}.`,
      };
    }
    const price = Number(args.priceUsd);
    const addons = args.addonsUsd === undefined ? 150 : Number(args.addonsUsd);
    const storage = args.storageUsd === undefined ? 120 : Number(args.storageUsd);
    const importCharge = r.flatFeeUsd + Math.round(price * r.rateOfPrice);
    const lineItems = [
      { label: "Doll + factory add-ons", amountUsd: price + addons },
      { label: r.chargeLabel, amountUsd: importCharge },
      { label: "First-year care supplies", amountUsd: m.firstYearCareUsd },
      { label: "Storage solution", amountUsd: storage },
      { label: "Repair reserve", amountUsd: m.repairReserveUsd },
    ];
    const total = lineItems.reduce((s, x) => s + x.amountUsd, 0);
    return {
      found: true,
      lineItems,
      firstYearTotalUsd: total,
      beyondStickerUsd: total - price,
      beyondStickerPct: price ? Math.round(((total - price) / price) * 100) : 0,
      regionNote: r.note,
      caveats: data.caveats,
      source: "https://thedollscout.com/cost-calculator.html",
    };
  }

  if (name === "scam_check_signals") {
    const data = await ctx.load("/data/scam-signals.json");
    return {
      signals: data.signals,
      signalCount: data.signalCount,
      /* A checklist handed over without this reads as a safety guarantee, and
         it is not one. */
      limitations: data.limitations,
      source: "https://thedollscout.com/scam-check.html",
    };
  }

  if (name === "import_rules") {
    const data = await ctx.load("/data/import-costs.json");
    const q = String(args.country || "").trim().toLowerCase();
    const hit = data.countries.find((c) => c.slug === q || c.country.toLowerCase() === q);
    if (!hit) {
      return {
        found: false,
        message: `No rules recorded for "${args.country}". Countries covered: ${data.countries.map((c) => c.country).join(", ")}.`,
        /* An absent country must not read as "no restrictions" — that is the
           one way this tool could contribute to a criminal import. */
        important: data.universalProhibition,
        notLegalAdvice: data.notLegalAdvice,
      };
    }
    return {
      found: true,
      ...hit,
      notLegalAdvice: data.notLegalAdvice,
      universalProhibition: data.universalProhibition,
    };
  }

  if (name === "doll_price_bands") {
    const data = await ctx.load("/data/doll-specs.json");
    const p = data.rows.filter((r) => !r.isPartialBody && typeof r.priceUsd === "number").map((r) => r.priceUsd).sort((a, b) => a - b);
    return {
      sampleSize: p.length,
      floorUsd: p[0],
      medianUsd: median(p),
      topUsd: p[p.length - 1],
      underOneThousand: p.filter((x) => x < 1000).length,
      recorded: data.recorded,
      limitations: data.limitations,
      note:
        "Prices far below the recorded floor are a counterfeit signal rather than a bargain. " +
        "This is one vendor's catalogue on one date, not a market survey.",
      source: "https://thedollscout.com/guides/what-a-doll-costs.html",
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

  /* A GET here is almost always a person or a crawler, not a client. Returning
     a JSON-RPC error to them would be technically correct and useless. */
  /* HEAD is answered exactly like GET, minus the body. It fell through to the
     405 below, and the Cloudflare crawl log shows every AI crawler collecting
     405s here: a probe that HEAD-checks a URL before fetching it reads that as
     a broken endpoint. The status and headers have to match what a GET would
     return, or the check is worse than useless. */
  if (request.method === "GET" || request.method === "HEAD") {
    const headOnly = request.method === "HEAD";
    /* Serve the documentation PAGE to anything that asked for HTML.
       Cloudflare Pages serves a file at its extensionless path, so /mcp.html
       resolves to /mcp — where this Function wins. The written page was
       therefore unreachable at any URL, and a crawler following the sitemap
       entry for /mcp.html got a JSON blob with no <title>, no <h1> and no
       <main>. It looked like a published page and indexed like nothing.
       Content negotiation fixes it without a second URL to remember: people
       and crawlers get the page, MCP clients get the discovery document. */
    const wantsHtml = (request.headers.get("accept") || "").includes("text/html");
    if (wantsHtml) {
      const page = await env.ASSETS.fetch(new URL("/mcp.html", request.url));
      if (page.ok) {
        return new Response(headOnly ? null : page.body, {
          status: 200,
          headers: { ...Object.fromEntries(page.headers), ...CORS, "content-type": "text/html; charset=utf-8" },
        });
      }
      /* Falling through to JSON is the honest failure: better a machine-
         readable answer than a blank page pretending to be documentation. */
    }
    if (headOnly) {
      return new Response(null, { status: 200, headers: { ...CORS, "content-type": "application/json" } });
    }
    return Response.json(
      {
        server: SERVER,
        protocolVersion: PROTOCOL_VERSION,
        transport: "Streamable HTTP — POST JSON-RPC to this same URL",
        tools: TOOLS.map((t) => ({ name: t.name, description: t.description })),
        documentation: "https://thedollscout.com/mcp",
        note:
          "Every answer is read from the published datasets at request time and carries their recording date " +
          "and limitations. No rule is reimplemented in this endpoint.",
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
    /* Notifications carry no id and expect no response body. */
    if (method === "notifications/initialized") return new Response(null, { status: 202, headers: CORS });

    if (method === "tools/list") return Response.json(rpc(id, { tools: TOOLS }), { headers: CORS });

    if (method === "tools/call") {
      const name = params?.name;
      const result = await callTool(name, params?.arguments || {}, ctx);
      return Response.json(
        rpc(id, {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          /* isError only for a genuine failure. A tool that correctly reports
             "no listing at that height" succeeded; flagging it as an error
             would teach a model to stop asking. */
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
