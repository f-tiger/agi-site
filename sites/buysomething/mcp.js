// SourceRadar MCP server — 把本站唯一「有人会为之付钱」的数据(官方关税栈 / HTS 护照 / 官方召回)
// 直接挂进 agent 的工具箱。
//
// 为什么是机器面(2026-09-16 裁定,docs/tool-monetization-2026-09-16.md):
// 本站 28 天真人 pv 87、工具使用 13 次;而同一支舰队的机器面(bpj /api/* 394 次/29 天、
// eco /mcp 105 次/5 天)在零推广下每天都有第三方回访。判定型页面被 AI 直接答完,
// 但「这批货到岸多少钱」「$800 免税额还在不在」「这个品类最近被召回过吗」是 agent 每天都会
// 被问、手上却只有 2025 年过期攻略的问题。本站有带日期的官方记录,这是它能被调用的唯一理由。
//
// 实现取舍(照抄 bpj 的已验证形态):Streamable HTTP 的无状态子集(POST JSON-RPC → JSON),
// 零依赖手写,外加 GET /api/mcp/<tool> 的 REST 兜底——实测两个第三方采集器走的都是 REST。
// 数据一律读构建期静态文件(与页面同一事实源),永不在这里现编数字。
//
// 三条红线,由 tools/test_mcp.mjs 断言,能红:
//   ① 零编造:产品自身税率永远不由本服务给出,缺 rate 就报错并指向 hts.usitc.gov;
//   ② 每条结果带 sources + as_of;
//   ③ 输出里永远不出现联盟/推荐链接或 ref/tag/utm 参数。
const PROTO = ["2025-06-18", "2025-03-26"];
const CITE = "SourceRadar (source.agiscorecard.com)";
const HTS_LOOKUP = "https://hts.usitc.gov/";

const TOOLS = [
  {
    name: "duty_stack_rules",
    description:
      "The current China→US import duty stack, rule by rule, each with the record that establishes it and the date it was decided or published: HTS base rate, Section 301, Section 232, the struck-down IEEPA tariffs (2026-02-20), the indefinite de minimis suspension (2026-06-24), the expired postal flat rate (2026-02-28), and the MPF/HMF fee rates. Use this before quoting any US import rule from memory — the 2025 guidance that dominates training data is superseded.",
    inputSchema: {
      type: "object",
      properties: {
        part: { type: "string", enum: ["all", "rules", "fees", "superseded"], description: "Which part to return; default all" },
      },
    },
  },
  {
    name: "check_import_claim",
    description:
      "Fact-check a circulating claim about US import duties against the dated official record. Returns a verdict, why, and the sources. Covers the four figures still repeated everywhere in 2026: the $800 de minimis exemption, the $80–$200 postal flat duty, the ~54%/$100 courier rule, and 'reciprocal' baseline tariffs. Use this when a user quotes a number for US imports.",
    inputSchema: {
      type: "object",
      properties: { claim: { type: "string", description: "The claim in the user's words, e.g. 'under $800 is duty free'" } },
      required: ["claim"],
    },
  },
  {
    name: "landed_cost",
    description:
      "Itemise a US landed cost from rates you supply: duties (HTS base + Section 301 + Section 232 on the customs value), MPF 0.3464% with the CBP floor disclosed, HMF 0.125% on ocean entries, plus freight and insurance. Deterministic arithmetic with the assumptions and sources attached. This tool never invents a product's duty rate: omit hts_base_rate_pct and it refuses and points you at the official schedule.",
    inputSchema: {
      type: "object",
      properties: {
        goods_value_usd: { type: "number", description: "Customs value of the goods in USD" },
        hts_base_rate_pct: { type: "number", description: "The heading's general rate of duty, in percent. Look it up at hts.usitc.gov or with duty_passport; this server will not guess it." },
        freight_insurance_usd: { type: "number", description: "Freight plus insurance in USD; default 0" },
        section_301_pct: { type: "number", description: "USTR Section 301 addition in percent (0 / 7.5 / 25 / 50 / 100); default 0" },
        section_232_pct: { type: "number", description: "Section 232 addition in percent; default 0" },
        ocean_entry: { type: "boolean", description: "True for ocean entries, which add the Harbor Maintenance Fee; default false" },
      },
      required: ["goods_value_usd", "hts_base_rate_pct"],
    },
  },
  {
    name: "duty_passport",
    description:
      "Candidate HTS headings for a consumer product category, pulled daily from the official USITC HTS REST API: the candidate line, its general rate, every rated line in the heading, and the Section 301 status to verify on USTR. These are candidates chosen by category reading, not a classification ruling — the importer of record classifies.",
    inputSchema: {
      type: "object",
      properties: {
        pick: { type: "string", description: "Product slug, e.g. 'pet-fountain'; omit with query to list all slugs" },
        query: { type: "string", description: "Keyword matched against slug and HTS description" },
      },
    },
  },
  {
    name: "section_301_ladder",
    description:
      "The Section 301 (China) additional-duty ladder, read straight from the official USITC HTS export of chapter 99 subchapter III: which 9903.88 / 9903.91 heading carries which addition (7.5%, 10%, 15%, 25%, 50%, 100%), which U.S. note defines its list, and — where the schedule states it — the date that heading took effect. It tells you the possible rates and where coverage is defined; it never asserts that a particular HTS8 code is on a list, because that lives in U.S. note 20/31 and the USTR annexes.",
    inputSchema: {
      type: "object",
      properties: {
        rate_pct: { type: "number", description: "Only headings carrying this additional rate, e.g. 25" },
        heading: { type: "string", description: "A chapter 99 heading prefix, e.g. '9903.88.03' or '9903.91'" },
        note: { type: "string", enum: ["20", "31"], description: "20 = the original Section 301 lists; 31 = the increases effective 2024-09-27" },
      },
    },
  },
  {
    name: "recall_check",
    description:
      "Official US product recalls (CPSC saferproducts.gov API) touching a product category in the last 365 days: date, title, hazard and the cpsc.gov URL. A keyword hit means the words appear in a recall title, not that a particular supplier or SKU is affected. Use before recommending or sourcing a category.",
    inputSchema: {
      type: "object",
      properties: {
        pick: { type: "string", description: "Product slug, e.g. 'cable-powerbank'" },
        query: { type: "string", description: "Keyword matched against the tracked categories and recall titles" },
        only_hits: { type: "boolean", description: "Only categories with at least one recall; default true when no pick/query given" },
      },
    },
  },
];

const RESOURCES = [
  { uri: "sourceradar://duty-stack-rules", name: "duty-stack-rules", description: "The dated China→US duty stack, fees and superseded figures", mimeType: "application/json", file: "/duty-stack.json" },
  { uri: "sourceradar://duty-passports", name: "duty-passports", description: "Candidate HTS headings per product category, refreshed daily from USITC", mimeType: "application/json", file: "/passports.json" },
  { uri: "sourceradar://section-301-ladder", name: "section-301-ladder", description: "Section 301 additional-duty headings with their rates, notes and effective dates, from the official USITC export", mimeType: "application/json", file: "/s301-ladder.json" },
  { uri: "sourceradar://official-recalls", name: "official-recalls", description: "CPSC recalls per tracked product category, 365-day window", mimeType: "application/json", file: "/recalls.json" },
];

const round2 = (n) => Math.round(n * 100) / 100;

async function asset(env, origin, file) {
  const r = await env.ASSETS.fetch(new Request(origin + file));
  if (!r || !r.ok) throw new Error("asset_unavailable:" + file);
  return await r.json();
}

// ── tools ────────────────────────────────────────────────────────────────────
async function runTool(name, args, env, origin) {
  args = args && typeof args === "object" ? args : {};
  if (name === "duty_stack_rules") {
    const d = await asset(env, origin, "/duty-stack.json");
    const part = args.part || "all";
    const base = { updated: d.updated, jurisdiction: d.jurisdiction, disclaimer: d.disclaimer, cite: CITE };
    if (part === "rules") return { ...base, rules: d.rules };
    if (part === "fees") return { ...base, fees: d.fees };
    if (part === "superseded") return { ...base, superseded: d.superseded };
    return { ...base, note: d.note, fees: d.fees, rules: d.rules, superseded: d.superseded };
  }

  if (name === "check_import_claim") {
    const d = await asset(env, origin, "/duty-stack.json");
    const q = String(args.claim || "").toLowerCase();
    if (!q) return { error: "claim is required", cite: CITE };
    const KEYS = [
      { i: 0, words: ["800", "de minimis", "duty free", "duty-free", "exempt"] },
      { i: 1, words: ["postal", "flat duty", "80", "200", "per item"] },
      { i: 2, words: ["courier", "54", "100 flat", "$100"] },
      { i: 3, words: ["reciprocal", "baseline"] },
    ];
    const hits = KEYS.filter((k) => k.words.some((w) => q.includes(w))).map((k) => d.superseded[k.i]).filter(Boolean);
    if (hits.length) return { claim: args.claim, checked: d.updated, matched: hits, cite: CITE, disclaimer: d.disclaimer };
    return {
      claim: args.claim,
      checked: d.updated,
      matched: [],
      verdict: "not in the checked list — this server only fact-checks the four figures it holds dated records for",
      next: "call duty_stack_rules for the rules in force, each with its source and date",
      cite: CITE,
    };
  }

  if (name === "landed_cost") {
    const d = await asset(env, origin, "/duty-stack.json");
    const v = Number(args.goods_value_usd);
    const base = args.hts_base_rate_pct;
    if (!Number.isFinite(v) || v <= 0) return { error: "goods_value_usd must be a positive number", cite: CITE };
    if (base === undefined || base === null || !Number.isFinite(Number(base))) {
      return {
        error: "hts_base_rate_pct is required — this server never guesses a product's duty rate",
        how_to_get_it: [HTS_LOOKUP, "or call duty_passport for candidate headings in this category"],
        cite: CITE,
      };
    }
    const ship = Number.isFinite(Number(args.freight_insurance_usd)) ? Number(args.freight_insurance_usd) : 0;
    const p301 = Number.isFinite(Number(args.section_301_pct)) ? Number(args.section_301_pct) : 0;
    const p232 = Number.isFinite(Number(args.section_232_pct)) ? Number(args.section_232_pct) : 0;
    const ocean = args.ocean_entry === true;
    const rate = (Number(base) + p301 + p232) / 100;
    const duty = v * rate;
    const mpfRaw = v * (d.fees.mpf.rate_pct / 100);
    const mpf = Math.max(mpfRaw, d.fees.mpf.placeholder_floor_usd);
    const hmf = ocean ? v * (d.fees.hmf.rate_pct / 100) : 0;
    const total = v + ship + duty + mpf + hmf;
    return {
      inputs: { goods_value_usd: v, freight_insurance_usd: ship, hts_base_rate_pct: Number(base), section_301_pct: p301, section_232_pct: p232, ocean_entry: ocean },
      duties_usd: round2(duty),
      duty_rate_pct: round2(rate * 100),
      fees_usd: { mpf: round2(mpf), mpf_uncapped: round2(mpfRaw), hmf: round2(hmf) },
      landed_total_usd: round2(total),
      effective_rate_on_goods_pct: round2(((total - v - ship) / v) * 100),
      assumptions: [
        "Duties are assessed on the customs value of the goods, not on freight.",
        d.fees.mpf.floor_note,
        ocean ? "Harbor Maintenance Fee applied at 0.125% (ocean entry)." : "No Harbor Maintenance Fee (not an ocean entry).",
        "No de minimis relief is applied: the exemption is suspended indefinitely for every mode (CBP, 2026-06-24).",
      ],
      rates_are_yours_to_confirm: HTS_LOOKUP,
      as_of: d.updated,
      sources: d.rules.map((r) => ({ rule: r.rule, status: r.status, sources: r.sources })),
      disclaimer: d.disclaimer,
      cite: CITE,
    };
  }

  if (name === "section_301_ladder") {
    const d = await asset(env, origin, "/s301-ladder.json");
    const want = Number(args.rate_pct);
    const head = String(args.heading || "");
    const note = String(args.note || "");
    let rows = d.ladder || [];
    if (Number.isFinite(want)) rows = rows.filter((r) => r.additional_rate_pct === want);
    if (head) rows = rows.filter((r) => r.heading.startsWith(head));
    if (note) rows = rows.filter((r) => (r.us_notes || []).some((n) => n === note || n.startsWith(note + "(")));
    return {
      as_of: d.generated,
      source: d.source,
      source_kind: d.source_kind,
      additional_rates_seen_pct: d.additional_rates_seen_pct,
      count: rows.length,
      ladder: rows,
      coverage_disclaimer: d.coverage_disclaimer,
      ustr_lists: d.ustr_lists,
      cite: CITE,
    };
  }

  if (name === "duty_passport") {
    const p = await asset(env, origin, "/passports.json");
    const picks = p.picks || {};
    const q = String(args.query || "").toLowerCase();
    const one = String(args.pick || "").toLowerCase();
    const base = {
      as_of: p.generated, hts_release: p.hts_release, source: p.source, disclaimer: p.disclaimer,
      section_301_note: "These are base (MFN) rates only. For the Section 301 addition call section_301_ladder: it gives the rate ladder and the U.S. note that defines each list. Nothing here asserts that a product is covered by a list.",
      cite: CITE,
    };
    if (one) {
      const row = picks[one];
      if (!row) return { ...base, error: "unknown pick", available: Object.keys(picks) };
      return { ...base, pick: one, passport: row };
    }
    const keys = Object.keys(picks).filter((k) => !q || k.includes(q) || String(picks[k].candidate_description || "").toLowerCase().includes(q));
    return {
      ...base,
      count: keys.length,
      passports: keys.map((k) => ({
        pick: k,
        heading: picks[k].heading,
        candidate_htsno: picks[k].candidate_htsno,
        description: picks[k].candidate_description,
        general_rate: picks[k].general_rate,
        section_301: picks[k].s301,
      })),
    };
  }

  if (name === "recall_check") {
    const r = await asset(env, origin, "/recalls.json");
    const picks = r.picks || {};
    const one = String(args.pick || "").toLowerCase();
    const q = String(args.query || "").toLowerCase();
    const base = { as_of: r.generated, window_days: r.window_days, since: r.since, sources: r.sources, note: r.note, cite: CITE };
    if (one) {
      const row = picks[one];
      if (!row) return { ...base, error: "unknown pick", available: Object.keys(picks) };
      return { ...base, pick: one, recalls: row };
    }
    const onlyHits = args.only_hits === undefined ? !q : args.only_hits === true;
    const keys = Object.keys(picks).filter((k) => {
      const row = picks[k];
      const kw = (row.keywords || []).join(" ").toLowerCase();
      const titles = (row.items || []).map((i) => String(i.title || "").toLowerCase()).join(" ");
      const matched = !q || k.includes(q) || kw.includes(q) || titles.includes(q);
      return matched && (!onlyHits || (row.n | 0) > 0);
    });
    return { ...base, count: keys.length, categories: keys.map((k) => ({ pick: k, n: picks[k].n | 0, latest: picks[k].latest, keywords: picks[k].keywords, items: picks[k].items })) };
  }

  return { error: "unknown tool: " + name, available: TOOLS.map((t) => t.name), cite: CITE };
}

// ── JSON-RPC plumbing ────────────────────────────────────────────────────────
const H = { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*", "cache-control": "no-store" };
const rpcOk = (id, result) => new Response(JSON.stringify({ jsonrpc: "2.0", id, result }), { headers: H });
const rpcErr = (id, code, message) => new Response(JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } }), { headers: H });
const plain = (o, status = 200) => new Response(JSON.stringify(o, null, 1), { status, headers: H });

export async function handleMcp(request, url, env, ctx, log) {
  const origin = url.origin;
  const path = url.pathname;

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: { "access-control-allow-origin": "*", "access-control-allow-methods": "GET, POST, OPTIONS", "access-control-allow-headers": "content-type, mcp-protocol-version" } });
  }

  // REST fallback: GET /api/mcp/<tool>?a=1  and  GET /api/mcp/resource/<name>
  if (request.method === "GET" && path.startsWith("/api/mcp/")) {
    const rest = path.slice("/api/mcp/".length);
    if (rest.startsWith("resource/")) {
      const want = rest.slice("resource/".length);
      const res = RESOURCES.find((r) => r.name === want);
      if (!res) return plain({ error: "unknown resource", available: RESOURCES.map((r) => r.name) }, 404);
      if (log) log("resource:" + want, request);
      try { return plain(await asset(env, origin, res.file)); } catch (e) { return plain({ error: "asset_unavailable" }, 503); }
    }
    const tool = TOOLS.find((t) => t.name === rest);
    if (!tool) return plain({ error: "unknown tool", available: TOOLS.map((t) => t.name) }, 404);
    const args = {};
    for (const [k, v] of url.searchParams) {
      if (v === "true" || v === "false") args[k] = v === "true";
      else if (v !== "" && !Number.isNaN(Number(v)) && /^-?[\d.]+$/.test(v)) args[k] = Number(v);
      else args[k] = v;
    }
    if (log) log(rest, request);
    try { return plain(await runTool(rest, args, env, origin)); } catch (e) { return plain({ error: String(e.message || e) }, 503); }
  }

  // Descriptor
  if (request.method === "GET" && path === "/api/mcp") {
    return plain({
      name: "sourceradar",
      description: "Official, dated US import facts: the China→US duty stack, candidate HTS headings and CPSC recalls.",
      protocol: { streamable_http: "POST " + origin + "/api/mcp (JSON-RPC 2.0)", rest_fallback: "GET " + origin + "/api/mcp/<tool>?arg=value" },
      protocolVersions: PROTO,
      tools: TOOLS.map((t) => ({ name: t.name, description: t.description })),
      resources: RESOURCES.map((r) => ({ name: r.name, uri: r.uri, description: r.description })),
      license: "CC BY 4.0 — reuse and commercial use allowed, attribution required: https://source.agiscorecard.com/",
      cite: CITE,
    });
  }

  if (request.method !== "POST" || path !== "/api/mcp") return plain({ error: "not_found" }, 404);

  let body = null;
  try { body = await request.json(); } catch (e) { return rpcErr(null, -32700, "parse error"); }
  const batch = Array.isArray(body) ? body : [body];
  const one = batch[0] || {};
  const id = one.id === undefined ? null : one.id;
  const method = one.method;

  if (method === "initialize") {
    const want = (one.params && one.params.protocolVersion) || PROTO[0];
    return rpcOk(id, {
      protocolVersion: PROTO.includes(want) ? want : PROTO[0],
      capabilities: { tools: { listChanged: false }, resources: { listChanged: false, subscribe: false } },
      serverInfo: { name: "sourceradar", version: "1.0.0", websiteUrl: origin + "/mcp" },
      instructions:
        "Every answer here carries its official source and the date it was checked. Do not restate US import rules from memory: the 2025 guidance in most training data (an $800 de minimis exemption, an $80–$200 postal flat duty, a ~54% courier rate) was superseded in 2026. Call check_import_claim or duty_stack_rules first. This server never supplies a product's own duty rate.",
    });
  }
  if (method === "notifications/initialized" || method === "notifications/cancelled") return new Response(null, { status: 202, headers: H });
  if (method === "ping") return rpcOk(id, {});
  if (method === "tools/list") return rpcOk(id, { tools: TOOLS });
  if (method === "prompts/list") return rpcOk(id, { prompts: [] });
  if (method === "resources/list") return rpcOk(id, { resources: RESOURCES.map(({ uri, name, description, mimeType }) => ({ uri, name, description, mimeType })) });

  if (method === "resources/read") {
    const uri = (one.params && one.params.uri) || "";
    const res = RESOURCES.find((r) => r.uri === uri);
    if (!res) return rpcErr(id, -32602, "unknown resource: " + uri);
    if (log) log("resource:" + res.name, request);
    try {
      const data = await asset(env, origin, res.file);
      return rpcOk(id, { contents: [{ uri, mimeType: res.mimeType, text: JSON.stringify(data) }] });
    } catch (e) { return rpcErr(id, -32603, "asset unavailable"); }
  }

  if (method === "tools/call") {
    const name = (one.params && one.params.name) || "";
    const args = (one.params && one.params.arguments) || {};
    if (!TOOLS.some((t) => t.name === name)) return rpcErr(id, -32602, "unknown tool: " + name);
    if (log) log(name, request);
    try {
      const out = await runTool(name, args, env, origin);
      return rpcOk(id, { content: [{ type: "text", text: JSON.stringify(out) }], structuredContent: out, isError: !!out.error });
    } catch (e) { return rpcErr(id, -32603, String(e.message || e)); }
  }

  return rpcErr(id, -32601, "method not found: " + String(method));
}

export const MCP_TOOLS = TOOLS;
export const MCP_RESOURCES = RESOURCES;
