// 三十五后 worker — 经验卡 API + 事件白名单 + 服务端 page_view。
// 舰队铁律:每一次统计类 D1 写都 try/catch + waitUntil,统计永远不能 500 站点;
// 唯一例外是发卡/撤卡两个写接口,它们的失败要如实返回给用户。
// 隐私:不存 IP(只存当日 salt 过的 8 位哈希做限速)、不存完整 UA(48 字符前缀 + 分类)。
// 联系方式由发卡人自愿公开,列表接口不返回,点「查看联系方式」才逐张取(并计数)。

const ALLOWED = new Set(["page_view", "card_view", "contact_reveal", "post_open", "post_submit", "post_ok", "post_fail", "path_result", "checklist_click", "share_click", "filter_use", "withdraw_ok", "bridge_click", "restart_plan", "my_open", "match_click", "live_click", "ai_match", "ai_match_open", "done_ok", "share_card"]);
const KINDS = new Set(["offer", "need", "team"]);
// 组队帖(kind=team,2026-09-14 v4,owner:「志同道合人发帖,然后一起创业」):offers 列存「需要的合伙人角色」。
const ROLES = ["技术", "销售", "运营", "资金", "行业资源", "设计", "财务法务", "产品"];
const STAGES = new Set(["idea", "validated", "revenue"]);
const COMMITS = new Set(["parttime", "fulltime"]);
const AGES = new Set(["35-39", "40-44", "45-49", "50-54", "55+"]);
const OFFERS = ["咨询顾问", "带教培训", "项目接活", "兼职驻场", "合伙创业", "志愿公益", "AI 落地"];
const INDUSTRIES = ["制造与供应链", "互联网与软件", "零售与电商", "金融与财务", "教育与培训", "医疗与健康", "建筑与地产", "物流与运输", "政府与事业单位", "媒体与广告", "餐饮与服务业", "其他"];
// 命中即转人工复核(status=pending),不拒绝——误伤的真人第二天就会被放出来。
const RISK = /贷款|刷单|日结|返利|博彩|彩票|虚拟币|USDT|数字货币|带单|荐股|保本|高收益|投资回报|回报率|众筹|入股费|加盟费|加微信领|免费领取|裸聊|代孕|办证|发票|走私|洗钱|色情|约炮/i;
const URLISH = /https?:\/\/|www\.|\.com\b|\.cn\b|\.net\b/i;

let schemaReady = false;
async function ensureSchema(db) {
  if (schemaReady || !db) return;
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS cards (id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL, nick TEXT NOT NULL, age TEXT NOT NULL, city TEXT NOT NULL, years INTEGER NOT NULL, field TEXT NOT NULL, offers TEXT NOT NULL, headline TEXT NOT NULL, body TEXT NOT NULL, pay TEXT NOT NULL, contact TEXT NOT NULL, code TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'live', flag TEXT DEFAULT '', country TEXT DEFAULT '', created TEXT NOT NULL, reviewed TEXT DEFAULT '', reveals INTEGER DEFAULT 0)"),
    db.prepare("CREATE INDEX IF NOT EXISTS cards_status ON cards (status, kind, created)"),
    db.prepare("CREATE TABLE IF NOT EXISTS ratelimit (day TEXT NOT NULL, iph TEXT NOT NULL, n INTEGER DEFAULT 0, PRIMARY KEY (day, iph))"),
    db.prepare("CREATE TABLE IF NOT EXISTS ev (day TEXT, ts TEXT, name TEXT, label TEXT, value INTEGER, path TEXT, ref TEXT, ua_class TEXT, country TEXT)"),
    db.prepare("CREATE TABLE IF NOT EXISTS ua_audit (day TEXT, ua_prefix TEXT, ua_class TEXT, hits INTEGER, PRIMARY KEY (day, ua_prefix, ua_class))"),
  ]);
  // v2(2026-09-14 当日二次迭代)加列:行业标签 + 「先免费聊半小时」。ALTER 不幂等,单独 try。
  for (const ddl of ["ALTER TABLE cards ADD COLUMN industry TEXT DEFAULT ''", "ALTER TABLE cards ADD COLUMN intro INTEGER DEFAULT 0", "ALTER TABLE cards ADD COLUMN stage TEXT DEFAULT ''", "ALTER TABLE cards ADD COLUMN commitment TEXT DEFAULT ''", "ALTER TABLE cards ADD COLUMN emb TEXT DEFAULT ''"]) {
    try { await db.prepare(ddl).run(); } catch (e) { /* column exists */ }
  }
  schemaReady = true;
}

function uaClass(ua) {
  if (!ua) return "none";
  if (/bot|crawler|spider|slurp|scrap|crawl|fetch|monitor|uptime|lighthouse|pagespeed|preview|headless|phantom|selenium|puppeteer|playwright|curl|wget|python|java|go-http|okhttp|libwww|httpclient|http-client|axios|node-fetch|undici|^node$|^node\/|feed|rss|validator|archive|semrush|ahrefs|dataforseo|mj12|dotbot|bytespider|petalbot|applebot|amazonbot|facebookexternalhit|embedly|gptbot|chatgpt|oai-search|claude|perplexity|ccbot|google-extended|panscient|censys|inspect|shodan|expanse|masscan|zgrab|scan|probe/i.test(ua)) return "bot";
  if (/mozilla/i.test(ua)) return "human";
  return "other";
}

function auditUa(env, ctx, ua, cls) {
  if (!env.EV) return;
  const p = env.EV.prepare("INSERT INTO ua_audit (day, ua_prefix, ua_class, hits) VALUES (date('now'), ?, ?, 1) ON CONFLICT(day, ua_prefix, ua_class) DO UPDATE SET hits = hits + 1")
    .bind((ua || "").slice(0, 48) || "(none)", cls).run().catch(() => {});
  ctx.waitUntil(p);
}

function logRow(env, ctx, row) {
  if (row && row.ci) return;
  if (!env.EV) return;
  ctx.waitUntil((async () => {
    try {
      await ensureSchema(env.EV);
      await env.EV.prepare("INSERT INTO ev (day, ts, name, label, value, path, ref, ua_class, country) VALUES (date('now'), datetime('now'), ?, ?, ?, ?, ?, ?, ?)")
        .bind(row.name, row.label || "", row.value | 0, row.path || "", row.ref || "", row.ua_class || "", row.country || "").run();
    } catch (e) { /* analytics must never break the site */ }
  })());
}

const JSONH = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "access-control-allow-origin": "*" };
const json = (o, status = 200, extra = {}) => new Response(JSON.stringify(o), { status, headers: { ...JSONH, ...extra } });

// 只保留文字:去控制字符与尖括号、压缩空白。中文原样保留(舰队 09-12 的教训:别把 CJK 洗掉)。
function clean(s, max) {
  return String(s == null ? "" : s).replace(/[\x00-\x1f\x7f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}
// 联系方式允许 @ . _ - + 与数字字母中文(微信号/邮箱/手机/Telegram 都装得下)
function cleanContact(s) { return clean(s, 60).replace(/[^\w@.+\-一-鿿\s:：（）()]/g, ""); }

async function sha8(s) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].slice(0, 4).map(b => b.toString(16).padStart(2, "0")).join("");
}
function newCode() {
  const a = new Uint8Array(6); crypto.getRandomValues(a);
  const alpha = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return [...a].map(b => alpha[b % alpha.length]).join("");
}
function publicCard(r) {
  return { id: r.id, kind: r.kind, nick: r.nick, age: r.age, city: r.city, years: r.years, field: r.field, industry: r.industry || "", intro: (r.intro | 0) === 1, stage: r.stage || "", commit: r.commitment || "", offers: r.offers.split("|").filter(Boolean), headline: r.headline, body: r.body, pay: r.pay, created: r.created, reveals: r.reveals | 0 };
}

// ---------- v5 AI 撮合 ----------
// 语义向量:Workers AI bge-m3(多语,1024 维)。失败即 null——撮合退化为标签/行业/双字重叠,永不影响发卡。
const EMB_MODEL = "@cf/baai/bge-m3";
function cardText(c) { return [c.headline, c.body, c.field, c.industry, String(c.offers || "").replace(/\|/g, " ")].filter(Boolean).join("。"); }
async function embed(env, text) {
  if (!env.AI || !text) return null;
  try {
    const out = await env.AI.run(EMB_MODEL, { text: [String(text).slice(0, 1500)] });
    const v = out && out.data && out.data[0];
    if (!Array.isArray(v) || v.length < 8) return null;
    return v.map(x => Math.round(x * 10000) / 10000);
  } catch (e) { return null; }
}
function cosine(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let d = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return na && nb ? d / Math.sqrt(na * nb) : 0;
}
function parseEmb(s) { try { const v = JSON.parse(s); return Array.isArray(v) ? v : null; } catch (e) { return null; } }
// 无 AI 时的兜底:中文双字重叠(Jaccard)。粗,但零依赖、可解释。
function bigrams(s) { const t = String(s || "").replace(/[\s,。;:、!?()()「」\-]/g, ""); const out = new Set(); for (let i = 0; i < t.length - 1; i++) out.add(t.slice(i, i + 2)); return out; }
function lexical(a, b) { const A = bigrams(a), B = bigrams(b); if (!A.size || !B.size) return 0; let n = 0; for (const g of A) if (B.has(g)) n++; return n / Math.sqrt(A.size * B.size); }
const ROLE_RX = { "技术": /技术|程序|软件|开发|工程|架构|IT|系统|AI 落地/i, "产品": /产品/, "销售": /销售|BD|客户|渠道|大客户/i, "运营": /运营|市场|增长|内容/, "设计": /设计|视觉|UI|品牌/i, "资金": /投资|资金|出资/, "行业资源": /资源|人脉|渠道|供应商|客户/, "财务法务": /财务|会计|法务|律师|税/ };
function complementary(a, b) {
  if (a.id === b.id) return false;
  if (a.kind === "offer") return b.kind === "need" || b.kind === "team";
  if (a.kind === "need") return b.kind === "offer";
  if (a.kind === "team") return b.kind === "offer";
  return false;
}
// 分数 = 0.55 语义(或双字兜底) + 0.25 行业相同 + 0.20 角色/方式对上 + 0.05 先免费聊。每一项都给出可读理由。
function scorePair(a, b, ea, eb, aiOn) {
  const reasons = [];
  let sem = 0;
  if (aiOn && ea && eb) { sem = Math.max(0, cosine(ea, eb)); if (sem >= 0.55) reasons.push("描述语义相近 " + Math.round(sem * 100) + "%"); }
  else { sem = lexical(cardText(a), cardText(b)); if (sem >= 0.12) reasons.push("用词重叠"); }
  let ind = 0; if (a.industry && a.industry === b.industry) { ind = 1; reasons.push("同行业:" + a.industry); }
  let role = 0;
  const need = a.kind === "offer" ? b : a, offer = a.kind === "offer" ? a : b;
  const needTags = String(need.offers || "").split("|").filter(Boolean), offerTags = String(offer.offers || "").split("|").filter(Boolean);
  if (need.kind === "need") {
    const hit = needTags.filter(t => offerTags.includes(t));
    if (hit.length) { role = hit.length / needTags.length; reasons.push("方式对上:" + hit.join("、")); }
  } else if (need.kind === "team") {
    const txt = cardText(offer);
    const hit = needTags.filter(t => ROLE_RX[t] && ROLE_RX[t].test(txt));
    if (hit.length) { role = hit.length / needTags.length; reasons.push("缺的角色对上:" + hit.join("、")); }
  }
  let intro = 0; if ((offer.intro | 0) === 1) { intro = 1; reasons.push("先免费聊半小时"); }
  const score = 0.55 * sem + 0.25 * ind + 0.2 * role + 0.05 * intro;
  return { score: Math.round(score * 1000) / 1000, reasons };
}
async function liveRows(db, kinds) {
  const q = "SELECT * FROM cards WHERE status='live'" + (kinds && kinds.length ? " AND kind IN (" + kinds.map(() => "?").join(",") + ")" : "") + " ORDER BY id DESC LIMIT 500";
  return (await db.prepare(q).bind(...(kinds || [])).all()).results || [];
}
async function ensureEmb(env, ctx, row) {
  let e = parseEmb(row.emb);
  if (e) return e;
  e = await embed(env, cardText(row));
  if (e && ctx) ctx.waitUntil(env.EV.prepare("UPDATE cards SET emb=? WHERE id=?").bind(JSON.stringify(e), row.id).run().catch(() => {}));
  return e;
}

async function handlePost(request, env, ctx) {
  const db = env.EV;
  if (!db) return json({ ok: false, code: "no_db" }, 503);
  await ensureSchema(db);
  const b = await request.json().catch(() => ({}));
  // 蜜罐:真人看不见 website 字段。静默「成功」,不给机器人调参的反馈。
  if (String(b.website || "").trim()) return json({ ok: true, code: "ok", id: 0, status: "live", secret: "XXXXXX" });

  const kind = KINDS.has(b.kind) ? b.kind : "";
  const nick = clean(b.nick, 20);
  const age = AGES.has(b.age) ? b.age : "";
  const city = clean(b.city, 20);
  const years = Math.max(0, Math.min(45, parseInt(b.years, 10) || 0));
  const field = clean(b.field, 40);
  const industry = INDUSTRIES.includes(b.industry) ? b.industry : "";
  const intro = b.intro === true ? 1 : 0;
  const pool = kind === "team" ? ROLES : OFFERS;
  const offers = (Array.isArray(b.offers) ? b.offers : []).filter(o => pool.includes(o)).slice(0, 8);
  const stage = kind === "team" && STAGES.has(b.stage) ? b.stage : "";
  const commit = kind === "team" && COMMITS.has(b.commit) ? b.commit : "";
  const headline = clean(b.headline, 60);
  const body = clean(b.body, 600);
  const pay = clean(b.pay, 30);
  const contact = cleanContact(b.contact);
  const consent = b.consent === true;

  if (!kind) return json({ ok: false, code: "kind" }, 400);
  if (!nick) return json({ ok: false, code: "nick" }, 400);
  if (!age) return json({ ok: false, code: "age" }, 400);
  if (!city) return json({ ok: false, code: "city" }, 400);
  if (!field) return json({ ok: false, code: "field" }, 400);
  if (!industry) return json({ ok: false, code: "industry" }, 400);
  if (kind === "offer" && years < 1) return json({ ok: false, code: "years" }, 400);
  if (!offers.length) return json({ ok: false, code: "offers" }, 400);
  if (kind === "team" && !stage) return json({ ok: false, code: "stage" }, 400);
  if (kind === "team" && !commit) return json({ ok: false, code: "commit" }, 400);
  if (headline.length < 8) return json({ ok: false, code: "headline" }, 400);
  if (body.length < 30) return json({ ok: false, code: "body" }, 400);
  if (contact.length < 4) return json({ ok: false, code: "contact" }, 400);
  if (!consent) return json({ ok: false, code: "consent" }, 400);

  // 部署冒烟(?dry=1):走完全部校验但不入库、不计限速——线上永远不留测试卡。
  if (new URL(request.url).searchParams.get("dry") === "1") return json({ ok: true, code: "dry", dry: true, kind, offers, stage, commit });

  // 限速:同一来源当日最多 3 张。只存当日 salt 的 8 位哈希,不存 IP。
  const ip = request.headers.get("cf-connecting-ip") || "0";
  const day = new Date().toISOString().slice(0, 10);
  const iph = await sha8(day + "|" + ip + "|after35");
  const rl = await db.prepare("INSERT INTO ratelimit (day, iph, n) VALUES (?, ?, 1) ON CONFLICT(day, iph) DO UPDATE SET n = n + 1 RETURNING n").bind(day, iph).first();
  if (rl && rl.n > 3) return json({ ok: false, code: "ratelimit" }, 429);

  // 风险词与网址:不拒绝,转人工复核。舰队每日 run 读 status='pending' 放行或拒绝。
  const text = [headline, body, field, pay].join(" ");
  let status = "live", flag = "";
  if (RISK.test(text)) { status = "pending"; flag = "risk"; }
  else if (URLISH.test(text)) { status = "pending"; flag = "url"; }

  const code = newCode();
  const country = (request.cf && request.cf.country) || "";
  const created = new Date().toISOString().replace("T", " ").slice(0, 16);
  const r = await db.prepare("INSERT INTO cards (kind, nick, age, city, years, field, offers, headline, body, pay, contact, code, status, flag, country, created, industry, intro, stage, commitment) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id")
    .bind(kind, nick, age, city, years, field, offers.join("|"), headline, body, pay || "面议", contact, code, status, flag, country, created, industry, intro, stage, commit).first();
  logRow(env, ctx, { name: "post_ok", label: kind + ":" + status, path: "/api/card", ua_class: "api", country });
  // 语义向量后台算,失败静默;下一次 /api/match 会补算。
  ctx.waitUntil((async () => { try { const e = await embed(env, cardText({ headline, body, field, industry, offers: offers.join("|") })); if (e) await db.prepare("UPDATE cards SET emb=? WHERE id=?").bind(JSON.stringify(e), r.id).run(); } catch (x) { /* never */ } })());
  return json({ ok: true, code: "ok", id: r.id, status, secret: code });
}

// 引荐来源分类(2026-09-15「舰队相互学习」):tools/fleet/ref_sources.txt 是唯一权威,
// 每个 worker 里的字面量必须与它逐字相同——check_ref_sources.py 挂在 fleet-heartbeat 上断言,
// 漂了就走 GitHub 失败邮件。教训与 bot_ua.txt 同源:各自演化的分类器 = 各站台账不可比。
// 读的是已入库的来源域名,出的仍是聚合计数:无路径、无国家、无 UA、无行级数据。
const REF_SRC = "ai:chatgpt|chat.openai|perplexity|claude.ai|copilot.microsoft|copilot.cloud.microsoft|copilot|gemini.google|you.com|kagi|poe.com|mistral|deepseek|kimi|doubao|yiyan.baidu|yiyan|metaso|phind|felo.ai|genspark|monica.im|tiangong|chatglm|moonshot;;search:google.|bing.|duckduckgo|search.yahoo|yahoo.co|ecosia|yandex|baidu.|sogou|so.com|startpage|brave.com|qwant|naver|seznam|petalsearch|mojeek|lycos|ask.com;;fleet:agiscorecard.com|getecoback.com|baipiaoji.com|thedollscout.com;;social:t.co|twitter.com|x.com|reddit.com|facebook|instagram|linkedin|lnkd.in|news.ycombinator|producthunt|weibo|zhihu|douban|xiaohongshu|telegram|t.me|pinterest|youtube|tiktok|douyin|discord|substack|medium.com|tumblr|vk.com|line.me|whatsapp|quora|mastodon|bsky";
const srcHost = (r) => {
  let h = String(r == null ? "" : r).trim().toLowerCase();
  if (!h) return "";
  h = h.replace(/^[a-z][a-z0-9+.-]*:\/\//, "");
  h = h.split("/")[0].split("?")[0].split("#")[0].split("@").pop().split(":")[0];
  return h.replace(/^www\./, "");
};
// self 只认完全相同的主机名:play.agiscorecard.com 对主域是兄弟站(fleet),不是自己。
const srcBucket = (host, self) => {
  if (!host) return "direct";
  if (self && host === self) return "self";
  // 标签对齐 + 尾部只许 TLD 段。两个方向的错都真发生过:裸 includes 会把 netflix.com
  // 判成 x.com(social);只做前缀对齐又会把 agiscorecard.com.spam.example 判成 fleet
  // ——那正是引荐垃圾的常见形状。
  const tld = (rest) => rest === "" || rest.split(".").every((l) => l.length > 0 && l.length <= 4 && /^[a-z]+$/.test(l));
  const dotted = "." + host;
  for (const grp of REF_SRC.split(";;")) {
    const i = grp.indexOf(":");
    for (const t of grp.slice(i + 1).split("|")) {
      if (!t) continue;
      const at = dotted.indexOf("." + t);
      if (at < 0) continue;
      let rest = dotted.slice(at + t.length + 1);
      if (rest.startsWith(".")) rest = rest.slice(1);
      if (tld(rest)) return grp.slice(0, i);
    }
  }
  return "other";
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const p = url.pathname;
    const ci = url.searchParams.get("ci") === "1";

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: { "access-control-allow-origin": "*", "access-control-allow-methods": "GET,POST", "access-control-allow-headers": "content-type" } });
    }

    if (p === "/e" && request.method === "POST") {
      try {
        const b = await request.json();
        if (ALLOWED.has(b.n)) {
          logRow(env, ctx, { name: b.n, label: String(b.l || "").slice(0, 80), path: String(b.p || "").slice(0, 80), ref: (request.headers.get("referer") || "").slice(0, 120), ua_class: "js", country: (request.cf && request.cf.country) || "" });
        }
      } catch (e) { /* ignore malformed */ }
      return new Response("ok", { headers: { "access-control-allow-origin": "*" } });
    }

    if (p.startsWith("/api/")) {
      try {
        if (p === "/api/card" && request.method === "POST") return await handlePost(request, env, ctx);
        if (!env.EV) return json({ ok: false, code: "no_db" }, 503);
        await ensureSchema(env.EV);

        if (p === "/api/cards" && request.method === "GET") {
          const kind = KINDS.has(url.searchParams.get("kind")) ? url.searchParams.get("kind") : "";
          const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get("limit"), 10) || 60));
          const q = kind
            ? env.EV.prepare("SELECT * FROM cards WHERE status='live' AND kind=? ORDER BY id DESC LIMIT ?").bind(kind, limit)
            : env.EV.prepare("SELECT * FROM cards WHERE status='live' ORDER BY id DESC LIMIT ?").bind(limit);
          const rows = (await q.all()).results || [];
          return json({ ok: true, cards: rows.map(publicCard), generated: new Date().toISOString() }, 200, { "cache-control": "public, max-age=60" });
        }
        if (p === "/api/stats" && request.method === "GET") {
          const rows = (await env.EV.prepare("SELECT kind, status, COUNT(*) n FROM cards GROUP BY kind, status").all()).results || [];
          const s = { offer: 0, need: 0, team: 0, pending: 0, done: 0, reveals28: 0 };
          for (const r of rows) { if (r.status === "live") s[r.kind] = r.n; else if (r.status === "pending") s.pending += r.n; else if (r.status === "done") s.done += r.n; }
          const rv = await env.EV.prepare("SELECT COUNT(*) n FROM ev WHERE name='contact_reveal' AND day >= date('now','-28 days')").first();
          s.reveals28 = (rv && rv.n) | 0;
          return json({ ok: true, ...s, generated: new Date().toISOString() }, 200, { "cache-control": "public, max-age=60" });
        }
        const m = p.match(/^\/api\/card\/(\d+)\/contact$/);
        if (m && request.method === "GET") {
          const r = await env.EV.prepare("SELECT id, contact, kind FROM cards WHERE id=? AND status='live'").bind(m[1]).first();
          if (!r) return json({ ok: false, code: "notfound" }, 404);
          ctx.waitUntil(env.EV.prepare("UPDATE cards SET reveals = reveals + 1 WHERE id=?").bind(r.id).run().catch(() => {}));
          logRow(env, ctx, { ci, name: "contact_reveal", label: r.kind + ":" + r.id, path: "/api/card/contact", ua_class: "api", country: (request.cf && request.cf.country) || "" });
          return json({ ok: true, contact: r.contact });
        }
        if (p === "/api/match" && request.method === "GET") {
          // 给一张卡找互补的卡:offer ↔ need/team,need → offer,team → offer。只回公开字段 + 分数 + 理由。
          const id = parseInt(url.searchParams.get("id"), 10) || 0;
          if (!id) return json({ ok: false, code: "bad" }, 400);
          const me = await env.EV.prepare("SELECT * FROM cards WHERE id=? AND status='live'").bind(id).first();
          if (!me) return json({ ok: false, code: "notfound" }, 404);
          const kinds = me.kind === "offer" ? ["need", "team"] : ["offer"];
          const rows = await liveRows(env.EV, kinds);
          const aiOn = !!env.AI;
          const ea = aiOn ? await ensureEmb(env, ctx, me) : null;
          const out = [];
          for (const r of rows) {
            if (!complementary(me, r)) continue;
            const eb = aiOn && ea ? await ensureEmb(env, ctx, r) : null;
            const s = scorePair(me, r, ea, eb, aiOn && !!ea);
            if (s.score > 0.08) out.push({ ...publicCard(r), score: s.score, reasons: s.reasons });
          }
          out.sort((x, y) => y.score - x.score);
          logRow(env, ctx, { ci, name: "ai_match", label: "card:" + me.kind + ":" + out.length, path: "/api/match", ua_class: "api" });
          return json({ ok: true, ai: aiOn && !!ea, for: { id: me.id, kind: me.kind }, matches: out.slice(0, 6), pool: rows.length }, 200, { "cache-control": "no-store" });
        }
        if (p === "/api/match/text" && request.method === "GET") {
          // 一句话找人:访客不必先发卡。限速 40 次/来源/天(与发卡限速同一张表,前缀区分)。
          const q = clean(url.searchParams.get("q"), 200);
          if (q.length < 4) return json({ ok: false, code: "short" }, 400);
          const ip = request.headers.get("cf-connecting-ip") || "0";
          const day = new Date().toISOString().slice(0, 10);
          const iph = "q|" + await sha8(day + "|" + ip + "|after35q");
          const rl = await env.EV.prepare("INSERT INTO ratelimit (day, iph, n) VALUES (?, ?, 1) ON CONFLICT(day, iph) DO UPDATE SET n = n + 1 RETURNING n").bind(day, iph).first();
          if (rl && rl.n > 40) return json({ ok: false, code: "ratelimit" }, 429);
          const want = url.searchParams.get("kind");
          const kinds = want === "team" ? ["team"] : want === "need" ? ["need"] : want === "offer" ? ["offer"] : ["offer", "team", "need"];
          const rows = await liveRows(env.EV, kinds);
          const aiOn = !!env.AI;
          const eq = aiOn ? await embed(env, q) : null;
          const out = [];
          for (const r of rows) {
            let sem;
            if (eq) { const er = await ensureEmb(env, ctx, r); sem = er ? Math.max(0, cosine(eq, er)) : 0; }
            else sem = lexical(q, cardText(r));
            const ind = INDUSTRIES.find(i => q.includes(i.replace(/与.*$/, "")) && r.industry === i) ? 0.15 : 0;
            const score = Math.round((sem + ind) * 1000) / 1000;
            const reasons = [];
            if (eq && sem >= 0.5) reasons.push("语义相近 " + Math.round(sem * 100) + "%"); else if (!eq && sem >= 0.12) reasons.push("用词重叠");
            if (ind) reasons.push("行业对上");
            if ((r.intro | 0) === 1) reasons.push("先免费聊半小时");
            if (score > (eq ? 0.3 : 0.08)) out.push({ ...publicCard(r), score, reasons });
          }
          out.sort((x, y) => y.score - x.score);
          logRow(env, ctx, { ci, name: "ai_match", label: ("text:" + q).slice(0, 80), path: "/api/match/text", ua_class: "api" });
          return json({ ok: true, ai: !!eq, q, matches: out.slice(0, 8), pool: rows.length }, 200, { "cache-control": "no-store" });
        }
        if (p === "/api/my" && request.method === "GET") {
          // 「我的卡」:卡号 + 撤卡码 = 唯一身份。回状态与被查看次数,不回联系方式以外的任何他人数据。
          const id = parseInt(url.searchParams.get("id"), 10) || 0; const code = clean(url.searchParams.get("code"), 12).toUpperCase();
          if (!id || code.length !== 6) return json({ ok: false, code: "bad" }, 400);
          const r = await env.EV.prepare("SELECT id, kind, status, flag, headline, created, reveals, reviewed FROM cards WHERE id=? AND code=?").bind(id, code).first();
          if (!r) return json({ ok: false, code: "notfound" }, 404);
          return json({ ok: true, card: { id: r.id, kind: r.kind, status: r.status, flag: r.flag || "", headline: r.headline, created: r.created, reveals: r.reveals | 0, reviewed: r.reviewed || "" } });
        }
        if (p === "/api/withdraw" && request.method === "POST") {
          const b = await request.json().catch(() => ({}));
          const id = parseInt(b.id, 10) || 0; const code = clean(b.code, 12).toUpperCase();
          if (!id || code.length !== 6) return json({ ok: false, code: "bad" }, 400);
          // reason=done:「找到了」——下线并计入站点的真实结果数(首页「已标记找到了」)。这是本站唯一的成功数字,只能由发卡人自己按。
          const done = b.reason === "done";
          const r = await env.EV.prepare("UPDATE cards SET status=?, reviewed=date('now') WHERE id=? AND code=? AND status IN ('live','pending') RETURNING id, kind").bind(done ? "done" : "withdrawn", id, code).first();
          if (!r) return json({ ok: false, code: "notfound" }, 404);
          logRow(env, ctx, { name: done ? "done_ok" : "withdraw_ok", label: r.kind + ":" + id, path: "/api/withdraw", ua_class: "api" });
          return json({ ok: true, status: done ? "done" : "withdrawn" });
        }
        if (p === "/api/pulse" && request.method === "GET") {
          // 舰队 heartbeat 读侧(同 goldrush):28 天真人 pv + AI 助手引荐,只给聚合数。
          const q = await env.EV.prepare("SELECT '_total' AS host, COUNT(*) AS n FROM ev WHERE name='page_view' AND ua_class='human' AND day >= date('now','-28 days') UNION ALL SELECT ref AS host, COUNT(*) AS n FROM ev WHERE name='page_view' AND ua_class='human' AND day >= date('now','-28 days') AND (ref LIKE '%chatgpt%' OR ref LIKE '%chat.openai%' OR ref LIKE '%perplexity%' OR ref LIKE '%claude.ai%' OR ref LIKE '%copilot%' OR ref LIKE '%gemini.google%' OR ref LIKE '%you.com%' OR ref LIKE '%kagi%' OR ref LIKE '%poe.com%' OR ref LIKE '%mistral%' OR ref LIKE '%deepseek%' OR ref LIKE '%kimi%' OR ref LIKE '%doubao%' OR ref LIKE '%yiyan%' OR ref LIKE '%metaso%') GROUP BY ref ORDER BY n DESC").all();
          let human_pv = 0; const by_host = {};
          for (const r of (q.results || [])) { if (r.host === "_total") human_pv = r.n | 0; else if (r.host) by_host[r.host] = r.n | 0; }
          const ai_ref = Object.values(by_host).reduce((a, b) => a + b, 0);
          // 渠道构成(2026-09-15):同一个 human 谓词再 group 一次 ref,在 worker 里按
          // tools/fleet/ref_sources.txt 分桶。sum(by_source) 应等于 human_pv —— 对不上就是
          // 有站把 ref 存成了整条 URL 或分类器漂了,读侧 traffic_sources.py 会把差额打出来。
          const q2 = await env.EV.prepare(
            "SELECT ref AS host, COUNT(*) AS n FROM ev WHERE name='page_view' AND ua_class='human' AND day >= date('now','-28 days') GROUP BY ref ORDER BY n DESC LIMIT 1000"
          ).all();
          const self_host = srcHost(url.hostname);
          const by_source = { search: 0, ai: 0, fleet: 0, social: 0, self: 0, direct: 0, other: 0 };
          const by_search = {}; const by_fleet = {}; const by_other = {};
          for (const r of (q2.results || [])) {
            const h = srcHost(r.host); const n = r.n | 0; const b = srcBucket(h, self_host);
            by_source[b] += n;
            if (b === "search") by_search[h] = (by_search[h] || 0) + n;
            else if (b === "fleet") by_fleet[h] = (by_fleet[h] || 0) + n;
            // by_other = 既不是搜索/AI/社交/兄弟站/本站的来源域 —— 真的有人从别处链过来。
            // 这是舰队第一方的外链监测:嵌入件、目录页、awesome-list 里的链接,送来过真人就出现在这里。
            else if (b === "other") by_other[h] = (by_other[h] || 0) + n;
          }
          return json({ ok: true, days: 28, human_pv, ai_ref, by_host, by_source, by_search, by_fleet, by_other, generated: new Date().toISOString() }, 200, { "cache-control": "public, max-age=3600" });
        }
        return json({ ok: false, code: "notfound" }, 404);
      } catch (e) {
        return json({ ok: false, code: "error" }, 500);
      }
    }

    // /c/<id>:一张卡的永久链接,服务端渲染(微信/微博分享时有标题与摘要)。noindex——用户内容不进索引,
    // 避免薄页与垃圾 SEO;联系方式不在页面上,仍要点按钮取。
    const cm = p.match(/^\/c\/(\d+)$/);
    if (cm && request.method === "GET") {
      let card = null;
      try { if (env.EV) { await ensureSchema(env.EV); card = await env.EV.prepare("SELECT * FROM cards WHERE id=? AND status='live'").bind(cm[1]).first(); } } catch (e) { card = null; }
      const h = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
      const ua = request.headers.get("user-agent") || ""; const cls = uaClass(ua);
      if (!ci) auditUa(env, ctx, ua, cls);
      logRow(env, ctx, { ci, name: "page_view", path: ("/c/" + cm[1]).slice(0, 80), ref: (request.headers.get("referer") || "").slice(0, 120), ua_class: cls, country: (request.cf && request.cf.country) || "" });
      const nav = '<header class="top"><div class="wrap"><a class="brand" href="/">三十五<b>后</b></a><nav class="main"><a href="/cards">经验卡</a><a href="/post">发一张</a><a href="/team">组队</a><a href="/paths">变现路径</a><a href="/ai-leverage">经验×AI</a><a href="/restart">二次启动</a><a href="/checklist">失业第一周</a><a href="/about">关于</a></nav></div></header>';
      const foot = '<footer><div class="wrap"><div class="links"><a href="/">首页</a><a href="/cards">经验卡</a><a href="/post">发一张</a><a href="/about">关于与撤卡</a></div><div>三十五后 · <a href="https://agiscorecard.com/">AGI Scorecard</a> 网络的中文子站 · 不做中介、不抽成</div></div></footer>';
      if (!card) {
        return new Response('<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>这张卡不在线了 — 三十五后</title><meta name="robots" content="noindex"><link rel="stylesheet" href="/style.css"></head><body>' + nav + '<main class="wrap"><h1>这张卡不在线了</h1><p class="lead muted">可能已被发卡人下线,或标记为「找到了」。</p><p class="cta-row"><a class="cta primary" href="/cards">看在线的卡</a><a class="cta" href="/post">发一张我的</a></p></main>' + foot + '</body></html>', { status: 404, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
      }
      const c = publicCard(card);
      const kindLabel = c.kind === "need" ? "找有经验的人" : c.kind === "team" ? "找合伙人" : "我有经验";
      const desc = (c.body || "").slice(0, 120);
      const html = '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + h(c.headline) + ' — 三十五后</title><meta name="description" content="' + h(desc) + '"><meta name="robots" content="noindex,follow"><link rel="canonical" href="https://35.agiscorecard.com/c/' + c.id + '"><meta property="og:title" content="' + h(kindLabel + ":" + c.headline) + '"><meta property="og:description" content="' + h(desc) + '"><meta property="og:url" content="https://35.agiscorecard.com/c/' + c.id + '"><meta property="og:type" content="article"><link rel="stylesheet" href="/style.css"></head><body>' + nav +
        '<main class="wrap"><p class="small muted"><a href="/">三十五后</a> › <a href="/cards">经验卡</a> › 卡 #' + c.id + '</p><div id="one" class="cards" style="grid-template-columns:1fr;max-width:720px"></div>' +
        '<p class="cta-row" style="margin-top:18px"><button class="cta" type="button" onclick="a35share(document.title)">分享这张卡</button><a class="cta primary" href="/post?kind=' + (c.kind === "offer" ? "need" : "offer") + '" data-ev="post_open" data-l="permalink">我也发一张</a></p>' +
        '<p class="small muted">联系方式只在点「查看联系方式」时显示;本站不做中介、不抽成。发卡人可用撤卡码随时下线。</p></main>' + foot +
        '<script src="/app.js"></script><script>a35mountOne(document.getElementById("one"), ' + JSON.stringify(c).replace(/</g, "\\u003c") + ');</script></body></html>';
      return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=60" } });
    }

    const res = await env.ASSETS.fetch(request);
    if (request.method === "GET" && res.status === 200) {
      const type = res.headers.get("content-type") || "";
      if (type.includes("text/html") || ["/llms.txt", "/sitemap.xml"].includes(p)) {
        const ua = request.headers.get("user-agent") || "";
        const cls = uaClass(ua);
        if (!ci) auditUa(env, ctx, ua, cls);
        logRow(env, ctx, { ci, name: "page_view", path: p.slice(0, 80), ref: (request.headers.get("referer") || "").slice(0, 120), ua_class: cls, country: (request.cf && request.cf.country) || "" });
      }
    }
    return res;
  },
};
