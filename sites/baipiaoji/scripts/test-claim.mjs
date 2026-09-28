#!/usr/bin/env node
// /api/claim 的端到端测试（2026-09-26）。零网络、~0.1 秒。
//
// 这条路径决定「谁能以厂商身份往队列里放更正」。判错的两个方向：
//   · 判松了 → 任何人都能冒充厂商排队一条「官方说免费额度是 X」的更正（虽然永不自动上站，
//     但复核者会把它当成厂商出处去读，等于往 limits-edit 的输入里掺假）；
//   · 判严了 → 真厂商放了文件却验不过，认领层等于没建。
// 所以下面同时测：令牌逐字比对、跳转跑出域名不算、出处必须在认领域名上、邮箱抹除、
// 冷却、每 slug 上限、以及 export 里没有任何个人字段。
//
// 跑法：node scripts/test-claim.mjs
import { onRequestGet, onRequestPost, apexOf, sameSite, redactEmails, textHasToken, tokenFor, COOLDOWN_MS, MAX_QUEUED_PER_SLUG } from '../functions/api/claim.js';

// ── 最小 D1 替身：只实现 claim.js 用到的 SQL 形状 ──
function mockDB() {
  const db = { claims: new Map(), att: [] };
  let nextId = 1;
  const exec = (sql, args) => {
    const s = sql.replace(/\s+/g, ' ').trim();
    if (s.startsWith('CREATE TABLE IF NOT EXISTS')) return { meta: { changes: 0 } };
    if (s.startsWith('SELECT slug, host, method, verified_at, last_seen FROM claims WHERE last_result')) {
      return { results: [...db.claims.values()].filter((c) => c.last_result === 'ok').map(({ slug, host, method, verified_at, last_seen }) => ({ slug, host, method, verified_at, last_seen })) };
    }
    if (s.startsWith('SELECT id, slug, field, value, official_url, note, created, status FROM attestations')) return { results: db.att.map((a) => ({ ...a })) };
    if (s.startsWith('SELECT slug, host, method, verified_at, last_seen, last_result FROM claims WHERE slug')) return { first: db.claims.get(args[0]) || null };
    if (s.startsWith('SELECT slug, host, method, verified_at, last_seen, last_attempt, last_result, attempts FROM claims WHERE slug')) return { first: db.claims.get(args[0]) || null };
    if (s.startsWith('INSERT INTO claims')) {
      const [slug, host, method, verified_at, last_seen, last_attempt, last_result] = args;
      const prev = db.claims.get(slug);
      db.claims.set(slug, { slug, host, method, verified_at, last_seen, last_attempt, last_result, attempts: prev ? prev.attempts + 1 : 1 });
      return { meta: { changes: 1 } };
    }
    if (s.startsWith('SELECT count(*) n FROM attestations WHERE slug')) return { first: { n: db.att.filter((a) => a.slug === args[0] && a.status === 'queued').length } };
    if (s.startsWith('SELECT id FROM attestations WHERE slug')) return { first: db.att.find((a) => a.slug === args[0] && a.field === args[1] && a.value === args[2] && a.status === 'queued') || null };
    if (s.startsWith('INSERT INTO attestations')) {
      const [slug, field, value, official_url, note, created, status] = args;
      db.att.push({ id: nextId, slug, field, value, official_url, note, created, status });
      return { meta: { changes: 1, last_row_id: nextId++ } };
    }
    throw new Error(`mock 未覆盖的 SQL：${s.slice(0, 80)}`);
  };
  db.prepare = (sql) => {
    let args = [];
    const api = {
      bind: (...a) => { args = a; return api; },
      first: async () => exec(sql, args).first ?? null,
      all: async () => exec(sql, args),
      run: async () => exec(sql, args),
    };
    return api;
  };
  return db;
}

const DIRECTORY = { tools: [
  { slug: 'kimi', name: 'Kimi', official_url: 'https://kimi.moonshot.cn' },
  { slug: 'deepseek', name: 'DeepSeek', official_url: 'https://chat.deepseek.com' },
] };
const ASSETS = { fetch: async () => new Response(JSON.stringify(DIRECTORY), { headers: { 'content-type': 'application/json' } }) };

// 可编程的出网替身：按 URL 返回预设响应；记录访问顺序
function mockFetch(routes) {
  const calls = [];
  const f = async (url) => {
    calls.push(url);
    const r = routes[url];
    if (!r) return new Response('', { status: 404 });
    if (r.error) throw new Error('net');
    const res = new Response(r.body ?? '', { status: r.status ?? 200, headers: r.headers || {} });
    if (r.finalUrl) Object.defineProperty(res, 'url', { value: r.finalUrl });
    return res;
  };
  f.calls = calls;
  return f;
}

const env = (db) => ({ HITS: db, ASSETS });
const get = (qs, db) => onRequestGet({ request: new Request(`https://baipiaoji.com/api/claim${qs}`), env: env(db) });
const post = (body, db, fetchImpl) => onRequestPost({
  request: new Request('https://baipiaoji.com/api/claim', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  env: env(db), fetchImpl,
});

let fail = 0;
const t = async (name, fn) => {
  try { await fn(); console.log(`  ✅ ${name}`); }
  catch (e) { console.error(`  ❌ ${name}\n     ${e.message}`); fail++; }
};
const eq = (got, want, what) => { if (got !== want) throw new Error(`${what}：得到 ${JSON.stringify(got)}，应为 ${JSON.stringify(want)}`); };
const TOKEN = tokenFor('kimi');
const WK = 'https://kimi.moonshot.cn/.well-known/baipiaoji-claim.txt';
const WK_APEX = 'https://moonshot.cn/.well-known/baipiaoji-claim.txt';
const DOH = 'https://cloudflare-dns.com/dns-query?name=_baipiaoji.moonshot.cn&type=TXT';

console.log('/api/claim 端到端测试');

await t('纯函数：apex / sameSite / 邮箱抹除 / 令牌逐字比对', async () => {
  eq(apexOf('chat.deepseek.com'), 'deepseek.com', 'apex 三段');
  eq(apexOf('x.example.com.cn'), 'example.com.cn', 'apex 二级公共后缀');
  eq(apexOf('kimi.moonshot.cn'), 'moonshot.cn', 'apex 二段');
  eq(sameSite('www.moonshot.cn', 'kimi.moonshot.cn'), true, '同主域的兄弟子域算同站');
  eq(sameSite('moonshot.cn.evil.com', 'kimi.moonshot.cn'), false, '前缀伪装不算同站');
  eq(sameSite('notmoonshot.cn', 'kimi.moonshot.cn'), false, '后缀相似不算同站');
  eq(redactEmails('contact me at dev@moonshot.cn or ops@x.io'), 'contact me at [email] or [email]', '邮箱抹除');
  eq(textHasToken(`# comment\n  ${TOKEN}  \n`, TOKEN), true, '带空白的整行等于令牌');
  eq(textHasToken(`${TOKEN}x`, TOKEN), false, '前缀匹配不算');
  eq(textHasToken(tokenFor('deepseek'), TOKEN), false, '别的 slug 的令牌不算');
});

await t('GET 未知 slug → 404；已知 slug → unclaimed + 三种放置说明', async () => {
  const db = mockDB();
  const r1 = await get('?slug=no-such-tool', db);
  eq(r1.status, 404, '未知 slug');
  const r2 = await get('?slug=kimi', db);
  const b = await r2.json();
  eq(r2.status, 200, '已知 slug');
  eq(b.claim.status, 'unclaimed', '初始状态');
  eq(b.how.token, TOKEN, '令牌');
  eq(b.how.well_known, WK, 'well-known 主机');
  eq(b.how.well_known_apex, WK_APEX, 'well-known 主域');
  eq(b.how.dns_txt, '_baipiaoji.moonshot.cn', 'TXT 名');
  eq(r2.headers.get('cache-control'), 'no-store', '状态永不缓存');
});

await t('verify：文件不存在 → no_token，且记录尝试；再次立刻 verify → cooldown 429', async () => {
  const db = mockDB();
  const f = mockFetch({});
  const r = await post({ slug: 'kimi', action: 'verify' }, db, f);
  const b = await r.json();
  eq(b.ok, false, 'ok'); eq(b.code, 'no_token', 'code');
  eq(f.calls.length, 3, '主机 well-known → 主域 well-known → DoH，三处都试过');
  eq(f.calls[0], WK, '先试官方主机'); eq(f.calls[1], WK_APEX, '再试主域'); eq(f.calls[2], DOH, '最后 DNS');
  const r2 = await post({ slug: 'kimi', action: 'verify' }, db, f);
  eq(r2.status, 429, '冷却');
  eq((await r2.json()).code, 'cooldown', 'code');
  eq(f.calls.length, 3, '冷却期内不出网');
});

await t('verify：官方主机 well-known 含令牌 → verified，只出网一次', async () => {
  const db = mockDB();
  const f = mockFetch({ [WK]: { body: `${TOKEN}\n` } });
  const b = await (await post({ slug: 'kimi', action: 'verify' }, db, f)).json();
  eq(b.ok, true, 'ok'); eq(b.code, 'verified', 'code'); eq(b.claim.status, 'verified', 'status'); eq(b.claim.method, 'well-known', 'method');
  eq(f.calls.length, 1, '命中即停');
  const g = await (await get('?slug=kimi', db)).json();
  eq(g.claim.status, 'verified', 'GET 读回已验证');
});

await t('verify：文件里是别的 slug 的令牌 → no_token（令牌绑记录，不绑域名）', async () => {
  const db = mockDB();
  const f = mockFetch({ [WK]: { body: `${tokenFor('deepseek')}\n` } });
  const b = await (await post({ slug: 'kimi', action: 'verify' }, db, f)).json();
  eq(b.code, 'no_token', 'code');
});

await t('verify：well-known 跳转到别的站点 → 不算，即使那边正文含令牌', async () => {
  const db = mockDB();
  const f = mockFetch({ [WK]: { body: `${TOKEN}\n`, finalUrl: 'https://evil.example/x' } });
  const b = await (await post({ slug: 'kimi', action: 'verify' }, db, f)).json();
  eq(b.code, 'no_token', 'code');
});

await t('verify：主机文件缺、主域 DNS TXT 有（带引号）→ verified via dns-txt', async () => {
  const db = mockDB();
  const f = mockFetch({ [DOH]: { body: JSON.stringify({ Status: 0, Answer: [{ name: '_baipiaoji.moonshot.cn', type: 16, data: `"${TOKEN}"` }] }) } });
  const b = await (await post({ slug: 'kimi', action: 'verify' }, db, f)).json();
  eq(b.code, 'verified', 'code'); eq(b.claim.method, 'dns-txt', 'method');
});

await t('verify：网络错误不炸，按 no_token 记', async () => {
  const db = mockDB();
  const f = mockFetch({ [WK]: { error: true }, [WK_APEX]: { error: true }, [DOH]: { error: true } });
  const r = await post({ slug: 'kimi', action: 'verify' }, db, f);
  eq(r.status, 200, 'HTTP'); eq((await r.json()).code, 'no_token', 'code');
});

await t('冷却期过后再验：文件已撤 → 回到 unclaimed（认领只在证明还在时有效）', async () => {
  const db = mockDB();
  const f = mockFetch({ [WK]: { body: TOKEN } });
  await post({ slug: 'kimi', action: 'verify' }, db, f);
  db.claims.get('kimi').last_attempt = new Date(Date.now() - COOLDOWN_MS - 1000).toISOString();
  const f2 = mockFetch({});
  const b = await (await post({ slug: 'kimi', action: 'verify' }, db, f2)).json();
  eq(b.code, 'no_token', 'code'); eq(b.claim.status, 'unclaimed', '状态回退');
  eq(db.claims.get('kimi').attempts, 2, '尝试计数累加');
});

await t('attest：未认领 → 403 unclaimed，一行都不写', async () => {
  const db = mockDB();
  const r = await post({ slug: 'kimi', action: 'attest', field: 'quota', value: 'x', official_url: 'https://kimi.moonshot.cn/pricing' }, db);
  eq(r.status, 403, 'HTTP'); eq((await r.json()).code, 'unclaimed', 'code'); eq(db.att.length, 0, '队列为空');
});

const claimed = async () => {
  const db = mockDB();
  await post({ slug: 'kimi', action: 'verify' }, db, mockFetch({ [WK]: { body: TOKEN } }));
  return db;
};

await t('attest：字段白名单、出处必须 https 且在认领域名上、值不能为空', async () => {
  const db = await claimed();
  const base = { slug: 'kimi', action: 'attest', value: '每日 50 次', official_url: 'https://kimi.moonshot.cn/pricing' };
  eq((await (await post({ ...base, field: 'price_secret' }, db)).json()).code, 'badfield', '字段白名单');
  eq((await (await post({ ...base, field: 'quota', official_url: 'https://other.example/pricing' }, db)).json()).code, 'bad_official_url', '出处域名');
  eq((await (await post({ ...base, field: 'quota', official_url: 'http://kimi.moonshot.cn/pricing' }, db)).json()).code, 'bad_official_url', '出处必须 https');
  eq((await (await post({ ...base, field: 'quota', value: '' }, db)).json()).code, 'novalue', '值为空');
  eq(db.att.length, 0, '全部被拒，队列仍空');
});

await t('attest：合法更正进队列 status=queued；重复 → already；note 里的邮箱被抹掉', async () => {
  const db = await claimed();
  const body = { slug: 'kimi', action: 'attest', field: 'quota', value: '每日 50 次', official_url: 'https://platform.moonshot.cn/docs/pricing', note: '联系 ops@moonshot.cn 确认' };
  const b1 = await (await post(body, db)).json();
  eq(b1.code, 'queued', 'code'); eq(b1.id, 1, 'id');
  eq(db.att[0].status, 'queued', 'status'); eq(db.att[0].note, '联系 [email] 确认', '邮箱抹除');
  eq(db.att[0].official_url, 'https://platform.moonshot.cn/docs/pricing', '兄弟子域的出处放行');
  const b2 = await (await post(body, db)).json();
  eq(b2.code, 'already', '重复'); eq(db.att.length, 1, '不重复入库');
});

await t(`attest：每 slug 排队上限 ${MAX_QUEUED_PER_SLUG} → too_many 429`, async () => {
  const db = await claimed();
  for (let i = 0; i < MAX_QUEUED_PER_SLUG; i++) db.att.push({ id: 100 + i, slug: 'kimi', field: 'quota', value: `v${i}`, official_url: 'https://kimi.moonshot.cn/', note: '', created: '2026-09-26', status: 'queued' });
  const r = await post({ slug: 'kimi', action: 'attest', field: 'quota', value: 'one more', official_url: 'https://kimi.moonshot.cn/' }, db);
  eq(r.status, 429, 'HTTP'); eq((await r.json()).code, 'too_many', 'code');
});

await t('蜜罐字段有值 → 静默 ok，什么都不做', async () => {
  const db = mockDB();
  const f = mockFetch({ [WK]: { body: TOKEN } });
  const b = await (await post({ slug: 'kimi', action: 'verify', website: 'http://spam' }, db, f)).json();
  eq(b.ok, true, 'ok'); eq(f.calls.length, 0, '不出网'); eq(db.claims.size, 0, '不落库');
});

await t('export：只含已验证认领与更正；每行没有任何个人字段', async () => {
  const db = await claimed();
  await post({ slug: 'kimi', action: 'attest', field: 'wall', value: '超过后降速', official_url: 'https://kimi.moonshot.cn/faq', note: 'x' }, db);
  db.claims.set('deepseek', { slug: 'deepseek', host: 'chat.deepseek.com', method: '', verified_at: '', last_seen: '', last_attempt: new Date().toISOString(), last_result: 'no_token', attempts: 1 });
  const b = await (await get('?export=1', db)).json();
  eq(b.ok, true, 'ok');
  eq(b.counts.claims_verified, 1, '只数已验证'); eq(b.counts.attestations_queued, 1, '排队数');
  eq(b.claims.length, 1, '未验证的 deepseek 不出现');
  const FORBID = /email|name|ip|country|user|ua/i;
  for (const row of [...b.claims, ...b.attestations]) for (const k of Object.keys(row)) if (FORBID.test(k) && k !== 'slug') throw new Error(`export 里出现疑似个人字段 ${k}`);
  eq(Object.keys(b.claims[0]).sort().join(','), 'host,last_seen,method,slug,verified_at', 'claims 行形状');
});

if (fail) { console.error(`❌ ${fail} 项失败`); process.exit(1); }
console.log('✅ /api/claim 全部通过');
