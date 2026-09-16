#!/usr/bin/env node
// /api/ad-claim 的端到端测试（2026-09-16）。零网络、~0.1 秒。
//
// 为什么这条路径值得一个真测试：它是**钱的路径**。链上轮询说「我看到一笔到账」，
// 由它决定一个广告位是否上架。判错的两个方向都直接是钱：
//   · 判松了 → 有人用一笔金额不符（或伪造）的交易换到真实曝光；
//   · 判严了 → 买家付了钱而位子不上架，是收钱不交付。
// 本仓既有的规矩是「执行器不信任台账，同仓同作者也是输入」——这里测的正是
// 服务端有没有真的不信任调用方：金额、状态、重复，三项都要在服务端重新核。
//
// 跑法：node scripts/test-ad-claim.mjs
import { onRequestPost } from '../functions/api/ad-claim.js';

// ── 最小 D1 替身：只实现被用到的那几个形状，行为按真 D1 复刻 ──
// 关键一条：.run() 即使一行都没改也返回真值，changes 才是真相。真 D1 就是这样，
// 替身若「贴心地」在没改动时返回假值，就会把一个真实的竞态 bug 藏起来。
function mockDB(seed = {}) {
  const db = { ads: seed.ads || [], ad_orders: seed.ad_orders || [], hits: [] };
  const exec = (sql, args) => {
    const s = sql.replace(/\s+/g, ' ').trim();
    if (s.startsWith('SELECT id, cat, url, price_cents FROM ads')) {
      return { results: db.ads.filter((a) => a.status === 'pending' && a.price_cents != null) };
    }
    if (s.startsWith('SELECT ad_id FROM ad_orders WHERE session')) {
      return { first: db.ad_orders.find((o) => o.session === args[0]) || null };
    }
    if (s.startsWith('SELECT id, cat, url, price_cents, status FROM ads WHERE id')) {
      return { first: db.ads.find((a) => a.id === args[0]) || null };
    }
    if (s.startsWith('UPDATE ads SET')) {
      const [paid_at, expires, amount, session, id] = args;
      const row = db.ads.find((a) => a.id === id && a.status === 'pending');
      if (!row) return { meta: { changes: 0 } };
      Object.assign(row, { status: 'live', paid_at, expires, amount, session });
      return { meta: { changes: 1 } };
    }
    if (s.startsWith('INSERT OR IGNORE INTO ad_orders')) {
      const [ad_id, session] = args;
      if (!db.ad_orders.some((o) => o.session === session)) db.ad_orders.push({ ad_id, session });
      return { meta: { changes: 1 } };
    }
    if (s.startsWith('INSERT INTO hits')) { db.hits.push({ path: args[1], ev: args[5] }); return { meta: { changes: 1 } }; }
    throw new Error(`mock 未覆盖的 SQL：${s.slice(0, 70)}`);
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

const SECRET = 'test-secret-do-not-use-in-production';
const post = (body, { secret = SECRET, env = {} } = {}) => onRequestPost({
  request: new Request('https://x/api/ad-claim', {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }),
  env: { ADS_WATCH_SECRET: SECRET, ADS_DAYS: '30', ...env },
});

let fail = 0;
const t = async (name, fn) => {
  try { await fn(); console.log(`  ✅ ${name}`); }
  catch (e) { console.error(`  ❌ ${name}\n     ${e.message}`); fail++; }
};
const eq = (got, want, what) => { if (got !== want) throw new Error(`${what}：得到 ${JSON.stringify(got)}，应为 ${JSON.stringify(want)}`); };

const fresh = () => mockDB({ ads: [{ id: 'abc123', cat: 'chat', url: 'https://x.test', price_cents: 4937, status: 'pending' }] });

console.log('/api/ad-claim 端到端测试');

await t('未配置 ADS_WATCH_SECRET → 503（绝不能在没有密钥时放行）', async () => {
  const r = await post({ action: 'pending' }, { env: { ADS_WATCH_SECRET: '', HITS: fresh() } });
  eq(r.status, 503, '状态码');
});

await t('密钥不对 → 401', async () => {
  const r = await post({ action: 'pending' }, { secret: 'wrong', env: { HITS: fresh() } });
  eq(r.status, 401, '状态码');
});

await t('长度相同但内容不同的密钥 → 401（定长比较不能只比长度）', async () => {
  const r = await post({ action: 'pending' }, { secret: 'x'.repeat(SECRET.length), env: { HITS: fresh() } });
  eq(r.status, 401, '状态码');
});

await t('pending 返回待付订单', async () => {
  const r = await post({ action: 'pending' }, { env: { HITS: fresh() } });
  const d = await r.json();
  eq(d.pending.length, 1, '条数'); eq(d.pending[0].price_cents, 4937, '金额');
});

await t('金额不符 → 409，且位子不上架（不自动折算，不静默放行）', async () => {
  const db = fresh();
  const r = await post({ action: 'claim', id: 'abc123', cents: 4900, hash: '0xaaa' }, { env: { HITS: db } });
  eq(r.status, 409, '状态码');
  eq((await r.json()).code, 'amount_mismatch', 'code');
  eq(db.ads[0].status, 'pending', '订单状态必须原样不动');
  eq(db.hits.some((h) => h.ev === 'ad_mismatch'), true, '应记一条 ad_mismatch 供人工处理');
});

await t('金额正确 → 上架，并写订单与事件', async () => {
  const db = fresh();
  const r = await post({ action: 'claim', id: 'abc123', cents: 4937, hash: '0xbbb', token: 'USDT' }, { env: { HITS: db } });
  const d = await r.json();
  eq(d.code, 'live', 'code');
  eq(db.ads[0].status, 'live', '订单状态');
  eq(db.ads[0].amount, '4937 USDT', '金额与币种只存原值不换算');
  eq(db.ad_orders.length, 1, '拒付抗辩用的订单行');
  eq(db.hits.some((h) => h.ev === 'ad_live'), true, 'ad_live 事件');
});

await t('同一笔链上交易重投 → already，不重复上架（幂等）', async () => {
  const db = fresh();
  await post({ action: 'claim', id: 'abc123', cents: 4937, hash: '0xccc' }, { env: { HITS: db } });
  const r2 = await post({ action: 'claim', id: 'abc123', cents: 4937, hash: '0xccc' }, { env: { HITS: db } });
  eq((await r2.json()).code, 'already', 'code');
  eq(db.ad_orders.length, 1, '订单行不该翻倍');
});

await t('已 live 的位子换个交易哈希再认领 → notpending（不能被付两次）', async () => {
  const db = fresh();
  await post({ action: 'claim', id: 'abc123', cents: 4937, hash: '0xddd' }, { env: { HITS: db } });
  const r2 = await post({ action: 'claim', id: 'abc123', cents: 4937, hash: '0xeee' }, { env: { HITS: db } });
  eq((await r2.json()).code, 'notpending', 'code');
});

await t('不存在的订单号 → 404', async () => {
  const r = await post({ action: 'claim', id: 'nope', cents: 4937, hash: '0xfff' }, { env: { HITS: fresh() } });
  eq(r.status, 404, '状态码');
});

await t('金额为 0 或负数 → 400（不能用一笔 0 元交易换到位子）', async () => {
  for (const cents of [0, -1, NaN]) {
    const r = await post({ action: 'claim', id: 'abc123', cents, hash: '0x111' }, { env: { HITS: fresh() } });
    eq(r.status, 400, `cents=${cents} 的状态码`);
  }
});

await t('未知 action → 400', async () => {
  const r = await post({ action: 'drop_table' }, { env: { HITS: fresh() } });
  eq(r.status, 400, '状态码');
});

console.log(fail ? `\n❌ ad-claim 测试失败 ${fail} 例` : '\n✅ ad-claim 全部通过（鉴权 / 幂等 / 金额核对 / 状态机）');
process.exit(fail ? 1 : 0);
