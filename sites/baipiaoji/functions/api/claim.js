// 厂商认领层（2026-09-26，owner 当日「创业者…自主扩张」指令下建的第一个楔子 v0；
// 决策文档 docs/ai-era-founder-2026-09-25.md §五）。
//
// 它解决的是同一个测量缺陷的下一层：submissions 表里 8 条厂商投稿全部停在 new，而站上
// 219 条记录**没有一条能证明「说话的是厂商本人」**——投稿框里谁都能填任何名字。
// 这里把「我是这个工具的团队」变成一件可机器核验的事：控制官方域名的人，才能认领这条记录。
//
//   GET  /api/claim?slug=x                    → 这条记录的认领状态（未认领 / 已由域名验证认领）+ 验证说明
//   GET  /api/claim?export=1                  → 全部已验证认领 + 排队中的厂商更正（零 PII，CI 每日落 data/claims.json）
//   POST /api/claim {slug, action:'verify'}   → 现场核验官方域名上的 /.well-known/baipiaoji-claim.txt 或 DNS TXT
//   POST /api/claim {slug, action:'attest', field, value, official_url, note}
//                                             → 已认领厂商提交一条**带官方出处**的更正，进 limits-edit 队列
//
// 三条硬规矩（与本站既有纪律逐字一致）：
//   ① 认领不改变页面上任何数字。厂商更正只进队列（status=queued），**永不自动上站**——
//      「新数字永远只走 limits-edit 两步」，厂商本人说的也一样：他的话是线索，官方页面才是出处。
//   ② 零 PII：没有邮箱、没有姓名、没有 IP。身份 = 域名控制权，这正是它比投稿框强的地方。
//      note 里出现的邮箱在入库前被抹成 [email]。
//   ③ 不卖任何东西：认领免费、徽章免费；付费只在「加急核实」那一条老轨上，与本文件无关。
//
// 令牌是公开且确定的：`baipiaoji-claim=<slug>`。它不是秘密——证明的是「谁控制这个域名」，
// 不是「谁知道令牌」（与 Google 站点验证同一原理，只是我们没有账号体系，令牌绑记录不绑人）。
//
// D1 读预算（09-25 事故后的规矩）：claims / attestations 两张表按主键或 slug 查，每次调用只读几行；
// export 是全表但表极小且每日只由 CI 取一次。所以这里不上 Cache API，但一律 no-store——状态会变。

export const TOKEN_PREFIX = 'baipiaoji-claim=';
export const COOLDOWN_MS = 10 * 60 * 1000;          // 同一 slug 十分钟内只出网核验一次
export const MAX_QUEUED_PER_SLUG = 20;              // 一个厂商最多排 20 条未处理更正，处理完再来
export const FIELDS = new Set(['quota', 'wall', 'paid', 'free', 'how', 'source', 'correction']);
const FETCH_BYTES = 8192;

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' },
  });

export const tokenFor = (slug) => `${TOKEN_PREFIX}${slug}`;

// 顶级域近似（不带公共后缀表）：`a.b.example.com` → `example.com`；`x.example.com.cn` → `example.com.cn`。
// 只用于「验证文件可以放在主域」与「更正出处必须在同一主域」两处；宁可判窄（少放行）也不判宽。
export function apexOf(host) {
  const parts = String(host || '').toLowerCase().split('.').filter(Boolean);
  if (parts.length <= 2) return parts.join('.');
  const tld = parts[parts.length - 1], sld = parts[parts.length - 2];
  const twoLevel = tld.length === 2 && ['com', 'net', 'org', 'co', 'gov', 'edu', 'ac', 'or', 'ne', 'go'].includes(sld);
  return parts.slice(twoLevel ? -3 : -2).join('.');
}

export const sameSite = (host, claimedHost) => {
  const h = String(host || '').toLowerCase(), c = String(claimedHost || '').toLowerCase();
  if (!h || !c) return false;
  const apex = apexOf(c);
  return h === c || h === apex || h.endsWith('.' + apex);
};

export const redactEmails = (s) => String(s || '').replace(/[^\s@<>()"',;:]+@[^\s@<>()"',;:]+\.[a-z]{2,}/gi, '[email]');

// 文本里任一行 trim 后逐字等于令牌即通过；允许一个域名同时挂多条（一个厂商多个工具）。
export const textHasToken = (text, token) =>
  String(text || '').split(/\r?\n/).some((l) => l.trim() === token);

async function readBounded(res) {
  const len = Number(res.headers.get('content-length') || 0);
  if (len > FETCH_BYTES) return '';
  const t = await res.text();
  return t.length > FETCH_BYTES ? '' : t;
}

// 出网核验。fetchImpl 可注入（零网络单测）。
// 顺序：官方主机的 well-known → 主域的 well-known → 主域 DNS TXT（_baipiaoji.<apex>）。
export async function probeClaim(officialHost, token, fetchImpl = fetch) {
  const apex = apexOf(officialHost);
  const hosts = [...new Set([officialHost.toLowerCase(), apex])];
  const tried = [];
  for (const h of hosts) {
    const url = `https://${h}/.well-known/baipiaoji-claim.txt`;
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 8000);
      const res = await fetchImpl(url, { signal: ctl.signal, redirect: 'follow', headers: { 'User-Agent': 'baipiaoji-claim/1.0 (+https://baipiaoji.com/claim)' }, cf: { cacheTtl: 0 } });
      clearTimeout(timer);
      let finalHost = h;
      try { finalHost = new URL(res.url || url).hostname; } catch {}
      // 跟着跳转跑到别的站点去了：不算（那不再是这个域名的控制权证明）
      if (res.ok && sameSite(finalHost, officialHost) && textHasToken(await readBounded(res), token)) {
        return { ok: true, method: 'well-known', where: url };
      }
      tried.push(`${url}:${res.status}`);
    } catch (e) {
      tried.push(`${url}:err`);
    }
  }
  // DNS TXT：走 Cloudflare DoH（Worker 里没有原生 DNS）。TXT 值可能带引号，逐条剥掉再比对。
  const name = `_baipiaoji.${apex}`;
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 8000);
    const res = await fetchImpl(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=TXT`, {
      signal: ctl.signal, headers: { accept: 'application/dns-json' }, cf: { cacheTtl: 0 },
    });
    clearTimeout(timer);
    if (res.ok) {
      const d = await res.json().catch(() => ({}));
      const answers = Array.isArray(d.Answer) ? d.Answer : [];
      for (const a of answers) {
        const v = String(a.data || '').replace(/^"|"$/g, '').replace(/"\s*"/g, '');
        if (v.trim() === token) return { ok: true, method: 'dns-txt', where: name };
      }
    }
    tried.push(`${name}:${res.status}`);
  } catch (e) {
    tried.push(`${name}:err`);
  }
  return { ok: false, method: '', tried };
}

// 记录目录（构建期静态 /directory.json，与 /api/tools 同一事实源）里找 slug → 官方主机。
async function officialHostOf(env, origin, slug) {
  const res = await env.ASSETS.fetch(new URL('/directory.json', origin));
  if (!res.ok) throw new Error('directory');
  const d = await res.json();
  const t = (d.tools || []).find((x) => x.slug === slug);
  if (!t || !t.official_url) return null;
  try { return { host: new URL(t.official_url).hostname.toLowerCase(), name: t.name || slug }; } catch { return null; }
}

async function ensureTables(env) {
  await env.HITS.prepare(
    "CREATE TABLE IF NOT EXISTS claims (slug TEXT PRIMARY KEY, host TEXT NOT NULL, method TEXT DEFAULT '', verified_at TEXT DEFAULT '', last_seen TEXT DEFAULT '', last_attempt TEXT DEFAULT '', last_result TEXT DEFAULT '', attempts INTEGER DEFAULT 0)"
  ).run();
  await env.HITS.prepare(
    "CREATE TABLE IF NOT EXISTS attestations (id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT NOT NULL, field TEXT NOT NULL, value TEXT NOT NULL, official_url TEXT NOT NULL, note TEXT DEFAULT '', created TEXT DEFAULT '', status TEXT DEFAULT 'queued')"
  ).run();
}

const cleanSlug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 60);

const publicClaim = (row) => row && row.last_result === 'ok'
  ? { status: 'verified', method: row.method, verified_at: row.verified_at, last_seen: row.last_seen, host: row.host }
  : { status: 'unclaimed' };

const instructions = (slug, host) => ({
  token: tokenFor(slug),
  well_known: `https://${host}/.well-known/baipiaoji-claim.txt`,
  well_known_apex: `https://${apexOf(host)}/.well-known/baipiaoji-claim.txt`,
  dns_txt: `_baipiaoji.${apexOf(host)}`,
  note: 'Put the token on its own line in the well-known file (either host), or as a TXT record; then POST {slug, action:"verify"}. Claims change no figure on the page; corrections go to the review queue with your official URL as the source.',
});

export async function onRequestGet({ request, env }) {
  if (!env.HITS) return json({ ok: false, code: 'no_db' }, 503);
  const u = new URL(request.url);
  try {
    await ensureTables(env);
    if (u.searchParams.get('export') === '1') {
      const claims = await env.HITS.prepare("SELECT slug, host, method, verified_at, last_seen FROM claims WHERE last_result = 'ok' ORDER BY verified_at").all().then((r) => (r && r.results) || []);
      const att = await env.HITS.prepare('SELECT id, slug, field, value, official_url, note, created, status FROM attestations ORDER BY id').all().then((r) => (r && r.results) || []);
      return json({
        ok: true, generated: new Date().toISOString(),
        definition: 'claims = records whose official domain proved control of the token (well-known file or DNS TXT); attestations = vendor corrections awaiting the limits-edit review, never auto-published; no personal data is stored',
        counts: { claims_verified: claims.length, attestations_queued: att.filter((a) => a.status === 'queued').length },
        claims, attestations: att,
      });
    }
    const slug = cleanSlug(u.searchParams.get('slug'));
    if (!slug) return json({ ok: false, code: 'noslug' }, 400);
    const rec = await officialHostOf(env, u.origin, slug);
    if (!rec) return json({ ok: false, code: 'unknown_slug' }, 404);
    const row = await env.HITS.prepare('SELECT slug, host, method, verified_at, last_seen, last_result FROM claims WHERE slug = ?').bind(slug).first();
    return json({ ok: true, slug, name: rec.name, host: rec.host, claim: publicClaim(row), how: instructions(slug, rec.host) });
  } catch (e) {
    return json({ ok: false, code: 'error' }, 500);
  }
}

export async function onRequestPost({ request, env, fetchImpl }) {
  if (!env.HITS) return json({ ok: false, code: 'no_db' }, 503);
  const u = new URL(request.url);
  try {
    const b = await request.json().catch(() => ({}));
    // 蜜罐：真人看不见 website 字段。静默返回成功，不给机器人调参的反馈。
    if (String(b.website || '').trim()) return json({ ok: true, code: 'ok' });
    const slug = cleanSlug(b.slug);
    const action = b.action === 'attest' ? 'attest' : 'verify';
    if (!slug) return json({ ok: false, code: 'noslug' }, 400);
    await ensureTables(env);
    const rec = await officialHostOf(env, u.origin, slug);
    if (!rec) return json({ ok: false, code: 'unknown_slug' }, 404);
    const now = new Date();
    const iso = now.toISOString();
    const row = await env.HITS.prepare('SELECT slug, host, method, verified_at, last_seen, last_attempt, last_result, attempts FROM claims WHERE slug = ?').bind(slug).first();

    if (action === 'verify') {
      if (row && row.last_attempt && now.getTime() - Date.parse(row.last_attempt) < COOLDOWN_MS) {
        return json({ ok: false, code: 'cooldown', retry_after_s: Math.ceil((COOLDOWN_MS - (now.getTime() - Date.parse(row.last_attempt))) / 1000), claim: publicClaim(row) }, 429);
      }
      const token = tokenFor(slug);
      const r = await probeClaim(rec.host, token, fetchImpl || fetch);
      const result = r.ok ? 'ok' : 'no_token';
      const verifiedAt = r.ok ? ((row && row.verified_at) || iso) : ((row && row.verified_at) || '');
      await env.HITS.prepare(
        'INSERT INTO claims (slug, host, method, verified_at, last_seen, last_attempt, last_result, attempts) VALUES (?,?,?,?,?,?,?,1) ' +
        'ON CONFLICT(slug) DO UPDATE SET host=excluded.host, method=excluded.method, verified_at=excluded.verified_at, last_seen=excluded.last_seen, last_attempt=excluded.last_attempt, last_result=excluded.last_result, attempts=claims.attempts+1'
      ).bind(slug, rec.host, r.ok ? r.method : (row ? row.method : ''), verifiedAt, r.ok ? iso : (row ? row.last_seen : ''), iso, result).run();
      const fresh = { slug, host: rec.host, method: r.ok ? r.method : '', verified_at: verifiedAt, last_seen: r.ok ? iso : '', last_result: result };
      return json({ ok: r.ok, code: r.ok ? 'verified' : 'no_token', claim: publicClaim(fresh), how: instructions(slug, rec.host), tried: r.ok ? undefined : r.tried }, r.ok ? 200 : 200);
    }

    // attest：只有当前已验证的认领才能排队更正
    if (!row || row.last_result !== 'ok') return json({ ok: false, code: 'unclaimed', how: instructions(slug, rec.host) }, 403);
    const field = String(b.field || '').trim();
    if (!FIELDS.has(field)) return json({ ok: false, code: 'badfield', fields: [...FIELDS] }, 400);
    const value = String(b.value || '').trim().slice(0, 800);
    if (!value) return json({ ok: false, code: 'novalue' }, 400);
    let official_url = String(b.official_url || '').trim().slice(0, 300);
    try {
      const ou = new URL(official_url);
      if (ou.protocol !== 'https:' || !sameSite(ou.hostname, rec.host)) throw new Error('site');
      official_url = ou.href;
    } catch {
      // 出处必须在被认领的域名上：厂商说的每个数字都要能在自家官方页面上指出来，否则它就是二手数字
      return json({ ok: false, code: 'bad_official_url', host: rec.host }, 400);
    }
    const note = redactEmails(String(b.note || '').trim().slice(0, 500));
    const queued = await env.HITS.prepare("SELECT count(*) n FROM attestations WHERE slug = ? AND status = 'queued'").bind(slug).first();
    if (queued && Number(queued.n) >= MAX_QUEUED_PER_SLUG) return json({ ok: false, code: 'too_many', max: MAX_QUEUED_PER_SLUG }, 429);
    const dup = await env.HITS.prepare("SELECT id FROM attestations WHERE slug = ? AND field = ? AND value = ? AND status = 'queued'").bind(slug, field, value).first();
    if (dup) return json({ ok: true, code: 'already', id: dup.id });
    const ins = await env.HITS.prepare('INSERT INTO attestations (slug, field, value, official_url, note, created, status) VALUES (?,?,?,?,?,?,?)')
      .bind(slug, field, value, official_url, note, iso.slice(0, 10), 'queued').run();
    return json({ ok: true, code: 'queued', id: ins && ins.meta ? ins.meta.last_row_id : undefined });
  } catch (e) {
    return json({ ok: false, code: 'error' }, 500);
  }
}
