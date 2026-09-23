// SourceRadar MCP 单测:用真 worker + 假 D1 + 磁盘静态资源跑完整协议。
// node sites/buysomething/tools/test_mcp.mjs   (部署闸门里跑;任何断言失败即红)
//
// 断言的是三条红线的形状,不是「有响应就行」:
//   ① 零编造:缺 hts_base_rate_pct 必须报错并指向官方表,绝不给一个默认税率;
//   ② 每条结果带 sources/as_of;
//   ③ 输出里永远没有联盟或跟踪参数(这页的读者是 agent,污染它等于污染引用)。
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import worker from "../worker.js";

const SITE = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "site");
const rows = [];
const env = {
  EV: { prepare() { return { bind(...a) { this.args = a; return this; }, async run() { rows.push(this.args); return {}; }, async first() { return null; } }; } },
  ASSETS: {
    async fetch(req) {
      const p = new URL(req.url).pathname;
      try { return new Response(await readFile(path.join(SITE, p)), { headers: { "content-type": "application/json" } }); }
      catch (e) { return new Response("no", { status: 404 }); }
    },
  },
};
const ctx = { waitUntil(p) { if (p && p.catch) p.catch(() => {}); } };
const call = (p, init = {}) => worker.fetch(new Request("https://source.agiscorecard.com" + p, init), env, ctx);
const rpc = async (method, params, id = 1) =>
  (await call("/api/mcp", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id, method, params }) })).json();

let n = 0;
const ok = (c, m) => { n++; if (!c) { console.error("FAIL " + n + ": " + m); process.exit(1); } console.log("ok   " + n + "  " + m); };

// 1) descriptor
const d = await (await call("/api/mcp")).json();
ok(d.tools.length === 8 && d.protocol.streamable_http.includes("/api/mcp"), "GET /api/mcp 描述符:8 个工具 + 两种调用方式");

// 2) initialize
const init = await rpc("initialize", { protocolVersion: "2025-06-18" });
ok(init.result.protocolVersion === "2025-06-18" && /800/.test(init.result.instructions) && init.result.serverInfo.name === "sourceradar",
   "initialize:协议版本回显 + instructions 点名过期的 $800 口径");

// 3) tools/list
const list = await rpc("tools/list", {});
ok(list.result.tools.length === 8 && list.result.tools.every((t) => t.description && t.inputSchema), "tools/list:8 个工具都有描述与 schema");

// 4) landed_cost 算术逐项可核对
const lc = await rpc("tools/call", { name: "landed_cost", arguments: { goods_value_usd: 1000, freight_insurance_usd: 100, hts_base_rate_pct: 2.5, section_301_pct: 25, ocean_entry: true } });
const r = lc.result.structuredContent;
ok(r.duties_usd === 275 && r.fees_usd.mpf === 33 && r.fees_usd.hmf === 1.25 && r.landed_total_usd === 1409.25 && r.effective_rate_on_goods_pct === 30.93,
   "landed_cost:275 关税 + MPF 下限 33 + HMF 1.25 → 1409.25,逐项可核对");
ok(Array.isArray(r.sources) && r.sources.length >= 7 && r.as_of && r.assumptions.some((a) => /de minimis/i.test(a)),
   "landed_cost:带 7 条规则来源、as_of,并写明不适用 de minimis");

// 5) 零编造:没有税率就拒绝
const noRate = await rpc("tools/call", { name: "landed_cost", arguments: { goods_value_usd: 1000 } });
ok(noRate.result.isError === true && /never guesses/.test(noRate.result.structuredContent.error) &&
   noRate.result.structuredContent.how_to_get_it.join(" ").includes("hts.usitc.gov"),
   "零编造:缺 hts_base_rate_pct 直接报错并指向官方表");

// 6) 事实核查
const claim = await rpc("tools/call", { name: "check_import_claim", arguments: { claim: "anything under $800 is duty free, right?" } });
const m = claim.result.structuredContent.matched;
ok(m.length >= 1 && /false since 2026-06-24/.test(m[0].verdict) && m[0].sources[0].includes("federalregister.gov"),
   "check_import_claim:$800 口径判 false(2026-06-24)并带联邦公报来源");
const unknown = await rpc("tools/call", { name: "check_import_claim", arguments: { claim: "does Mars charge VAT" } });
ok(unknown.result.structuredContent.matched.length === 0 && /only fact-checks/.test(unknown.result.structuredContent.verdict),
   "check_import_claim:没有记录的说法如实说没有,不硬答");

// 7) 召回只给官方 URL
const rc = await rpc("tools/call", { name: "recall_check", arguments: {} });
const items = rc.result.structuredContent.categories.flatMap((c) => c.items);
ok(rc.result.structuredContent.categories.length >= 1 && items.length >= 1 && items.every((i) => { try { const u = new URL(i.url); return u.protocol === "https:" && ["www.cpsc.gov", "cpsc.gov"].includes(u.hostname); } catch { return false; } }),
   "recall_check:只回官方 cpsc.gov 记录(" + items.length + " 条)");

// 8) HTS 护照
const dp = await rpc("tools/call", { name: "duty_passport", arguments: { pick: "pet-fountain" } });
ok(dp.result.structuredContent.passport.candidate_htsno && /classification ruling/.test(dp.result.structuredContent.disclaimer),
   "duty_passport:给候选税号,同时声明这不是归类裁定");

// 9) REST 兜底(实测第三方采集器走的是这条)
const rest = await (await call("/api/mcp/duty_stack_rules?part=fees")).json();
ok(rest.fees.mpf.rate_pct === 0.3464 && !rest.rules, "REST 兜底:/api/mcp/duty_stack_rules?part=fees 只回费率");
const restUnknown = await call("/api/mcp/nope");
ok(restUnknown.status === 404, "REST 兜底:未知工具 404");

// 10) 资源
const res = await rpc("resources/read", { uri: "sourceradar://official-recalls" });
ok(JSON.parse(res.result.contents[0].text).sources.cpsc.includes("saferproducts.gov"), "resources/read:召回资源可读且指明官方 API");

// 11) 未知方法与未知工具
const bad = await rpc("tools/call", { name: "sell_me_something", arguments: {} });
ok(bad.error && bad.error.code === -32602, "未知工具 → JSON-RPC -32602");
const badm = await rpc("tools/frobnicate", {});
ok(badm.error && badm.error.code === -32601, "未知方法 → JSON-RPC -32601");

// 11b) Section 301 阶梯:只给阶梯与定义清单的 note,绝不断言某个税号被覆盖
const lad = await rpc("tools/call", { name: "section_301_ladder", arguments: { rate_pct: 100 } });
const L = lad.result.structuredContent;
ok(L.count >= 1 && L.ladder.every((x) => x.additional_rate_pct === 100) && /does not assert membership/.test(L.coverage_disclaimer) && L.ustr_lists.includes("ustr.gov"),
   "section_301_ladder:按税率过滤得到 " + L.count + " 条,且明说不判定清单归属");
const lad31 = await rpc("tools/call", { name: "section_301_ladder", arguments: { note: "31" } });
ok(lad31.result.structuredContent.ladder.every((x) => /2024/.test(x.programme)) && lad31.result.structuredContent.ladder.some((x) => x.effective_from === "September 27, 2024"),
   "section_301_ladder:note=31 只回 2024-09-27 那批加征");
const dpNote = await rpc("tools/call", { name: "duty_passport", arguments: { pick: "pet-fountain" } });
ok(/section_301_ladder/.test(dpNote.result.structuredContent.section_301_note), "duty_passport:基础税率旁边指向 301 阶梯,不再是死胡同");

// 11c) 规则变更雷达:since 过滤 + 范围声明必须随结果一起给出
const rc1 = await rpc("tools/call", { name: "import_rule_changes", arguments: { matched_in: "title_or_abstract", limit: 5 } });
const RC = rc1.result.structuredContent;
ok(RC.count >= 1 && RC.changes.every((c) => c.matched_in === "title_or_abstract" && c.url.includes("federalregister.gov")) &&
   /antidumping/i.test(RC.out_of_scope),
   "import_rule_changes:标题/摘要命中 " + RC.count + " 条,全部官方链接,且随结果带「什么不在范围内」");
const rc2 = await rpc("tools/call", { name: "import_rule_changes", arguments: { since: "2099-01-01" } });
ok(rc2.result.structuredContent.count === 0, "import_rule_changes:since 在未来 → 0 条,不回退成「给你看点别的」");
ok(RC.stable.incremental.includes("since=YYYY-MM-DD") && RC.stable.snapshot.endsWith("/import-rule-changes.json") && /CC BY 4.0/.test(RC.license),
   "import_rule_changes:带稳定路径承诺与许可(被写死进别人代码的前提)");

// 11d) CBP 裁定检索:用桩 fetch 跑,断言合成逻辑与失败路径(单测永不打网络)
const realFetch = globalThis.fetch;
globalThis.fetch = async () => new Response(JSON.stringify({ totalHits: 2, rulings: [
  { rulingNumber: "N313929", rulingDate: "2020-09-10T00:00:00", subject: "The tariff classification of an LED face mask cover from China",
    categories: "Classification", tariffs: "8543.70.9960, 9903.88.02", operationallyRevoked: false, revokedBy: [], modifiedBy: [] },
  { rulingNumber: "OLD123", rulingDate: "1999-01-01T00:00:00", subject: "revoked example", categories: "Classification",
    tariffs: "6307.90.9870", operationallyRevoked: true, revokedBy: ["X1"], modifiedBy: [] },
] }), { headers: { "content-type": "application/json" } });
const cr = await rpc("tools/call", { name: "classification_rulings", arguments: { query: "LED face mask", limit: 2 } });
const CR = cr.result.structuredContent;
const first = CR.rulings[0];
ok(first.ruling === "N313929" && first.url === "https://rulings.cbp.gov/ruling/N313929" &&
   first.hts_codes_assigned.length === 2 && first.chapter_99_headings[0].heading === "9903.88.02" &&
   first.chapter_99_headings[0].additional_rate_pct === 25,
   "classification_rulings:裁定里的 9903 号自动接上 301 阶梯(" + first.chapter_99_headings[0].rate_text + ")");
ok(CR.rulings[1].revoked === true && /not a ruling on your product/i.test(CR.disclaimer),
   "classification_rulings:被撤销的裁定标出来,并声明这不是对你货物的裁定");
globalThis.fetch = async () => { throw new Error("network down"); };
const crFail = await rpc("tools/call", { name: "classification_rulings", arguments: { query: "plush toy" } });
ok(/not answering/.test(crFail.result.structuredContent.error) && crFail.result.structuredContent.upstream.includes("rulings.cbp.gov"),
   "classification_rulings:上游挂了就说挂了,并给官方检索入口,绝不编裁定");
globalThis.fetch = realFetch;

// 12) 输出里永远没有联盟/跟踪参数
const all = JSON.stringify([d, init, list, lc, claim, rc, dp, rest, res, lad, lad31, rc1, cr]);
const dirty = [/[?&]tag=/, /[?&]ref=/, /[?&]utm_/, /amzn\.to/, /amazon\.[a-z.]+\/(dp|s\?)/].filter((re) => re.test(all));
ok(dirty.length === 0, "输出零联盟/跟踪参数(命中:" + dirty.length + ")");

// 13) 每次调用都落一行 mcp_call
ok(rows.length >= 8, "每次工具/资源调用都写了一行 mcp_call(" + rows.length + " 行)");
const labels = rows.map((r) => String(r[1] || ""));
ok(labels.includes("landed_cost:goods_value_usd") || labels.some((l) => l.startsWith("landed_cost:goods_value_usd")),
   "调用形状只记参数名:" + labels.filter((l) => l.startsWith("landed_cost")).join(" | "));
ok(labels.some((l) => l.endsWith(":∅")), "空参数调用记成 ∅(采集器的形状)");
// 上面那次 landed_cost 传的是 1000 / 100 / 2.5 / 25;这些值一个都不许出现在标签里
ok(!labels.some((l) => /1000|2\.5|\btrue\b/.test(l)), "参数值永不落库(标签里没有 1000 / 2.5 / true)");

console.log("\nall " + n + " assertions pass");
