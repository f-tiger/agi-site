#!/usr/bin/env node
// 链上收款轮询:把「钱到了」翻译成「广告上架」,全程无人。
//
// 为什么在这里而不是在 Worker 里:裸钱包地址不回调任何 URL,所以没有 webhook 可验签。
// 唯一可靠的办法是主动去链上查。查这件事属于取数,按舰队纪律应当下沉到第①层
//（.github/workflows,零 AI）——它不需要判断力,而且 AI 会话挂掉的时候它照样得跑。
//
// 认领方式是**唯一金额**:下单时每笔在基准价上加一个由订单 id 派生的分位尾数,
// 这里按「金额完全相等」匹配。不用 memo,因为 EVM 与 TRON 没有这个字段,
// 而买家漏填 memo 是这类方案最常见的卡单原因。
//
// 三条硬规矩:
// ① 合约地址必须核对——任何人都能往这个地址扔一个自己造的、名字也叫 USDT 的代币;
// ② 确认数不够不上架——链重组会让「到账」回滚;
// ③ 少付一分都不算——容差写死为 0,少付/多付都挂起等 owner 处理,不让代码替他猜。
import { readFileSync } from 'node:fs';

const DRY = process.argv.includes('--dry-run');
const need = (k) => { const v = process.env[k]; if (!v && !DRY) { console.error(`缺少 ${k}`); process.exit(1); } return v || ''; };

const ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID || '';
const D1 = process.env.D1_DATABASE_ID || '';
const CF_TOKEN = process.env.CLOUDFLARE_API_TOKEN || '';
const WALLET = (process.env.ADS_WALLET || '').trim();
const CHAIN = (process.env.ADS_WALLET_CHAIN || '').trim().toLowerCase();
const CONTRACT = (process.env.ADS_WALLET_CONTRACT || '').trim().toLowerCase();
const DECIMALS = Number(process.env.ADS_WALLET_DECIMALS || 6);
const MIN_CONF = Number(process.env.ADS_MIN_CONFIRMATIONS || 12);
const DAYS = Number(process.env.ADS_DAYS || 30);
const SCAN_KEY = process.env.ADS_SCAN_API_KEY || '';

// D1 走 REST,与 deploy-baipiaoji.yml 里导出流量快照的那一步同一条路子
async function d1(sql, params = []) {
  const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/d1/database/${D1}/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${CF_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql, params }),
  });
  const j = await r.json().catch(() => ({}));
  if (!j.success) throw new Error(`D1 失败: ${JSON.stringify(j.errors || j).slice(0, 200)}`);
  return (j.result && j.result[0] && j.result[0].results) || [];
}

// 各链的取数方式不同,但都要回同一个形状:{ amountRaw, contract, confirmations, hash }
async function incoming() {
  if (CHAIN === 'tron') {
    const u = `https://api.trongrid.io/v1/accounts/${WALLET}/transactions/trc20?limit=50&only_to=true`;
    const r = await fetch(u, { headers: SCAN_KEY ? { 'TRON-PRO-API-KEY': SCAN_KEY } : {} });
    const j = await r.json();
    return (j.data || []).map((t) => ({
      amountRaw: String(t.value || '0'),
      contract: String((t.token_info && t.token_info.address) || '').toLowerCase(),
      // TronGrid 不直接给确认数;用区块时间距今的秒数近似(TRON 约 3 秒一块)
      confirmations: Math.floor((Date.now() - Number(t.block_timestamp || 0)) / 3000),
      hash: t.transaction_id,
    }));
  }
  // Etherscan v2 统一多链端点:Ethereum / Base / Arbitrum 等用同一个 API,靠 chainid 区分
  const CHAIN_IDS = { ethereum: 1, base: 8453, arbitrum: 42161, optimism: 10, polygon: 137 };
  const cid = CHAIN_IDS[CHAIN];
  if (!cid) throw new Error(`不支持的链: ${CHAIN || '(未设置)'}——支持 ${Object.keys(CHAIN_IDS).join('/')}/tron`);
  const u = `https://api.etherscan.io/v2/api?chainid=${cid}&module=account&action=tokentx&address=${WALLET}`
    + `&page=1&offset=50&sort=desc&apikey=${SCAN_KEY}`;
  const r = await fetch(u);
  const j = await r.json();
  if (j.status !== '1' && j.message !== 'No transactions found') throw new Error(`浏览器 API: ${j.message || j.result}`);
  return (Array.isArray(j.result) ? j.result : [])
    .filter((t) => String(t.to || '').toLowerCase() === WALLET.toLowerCase())
    .map((t) => ({
      amountRaw: String(t.value || '0'),
      contract: String(t.contractAddress || '').toLowerCase(),
      confirmations: Number(t.confirmations || 0),
      hash: t.hash,
    }));
}

// 原始整数 → 分。用字符串切而不是浮点:1e-6 精度的金额用 Number 会在边界上出错,
// 而这里的比较必须是精确相等。
function toCents(raw) {
  const s = String(raw).padStart(DECIMALS + 1, '0');
  const whole = s.slice(0, s.length - DECIMALS);
  const frac = s.slice(s.length - DECIMALS).padEnd(2, '0').slice(0, 2);
  return Number(whole) * 100 + Number(frac);
}

const main = async () => {
  if (DRY) {
    // 自测:不碰网络,只验算金额换算与匹配逻辑——这一段能红,才算有自检
    const cases = [['50370000', 5037], ['1000000', 100], ['999999', 99], ['0', 0]];
    let bad = 0;
    for (const [raw, want] of cases) {
      const got = toCents(raw);
      if (got !== want) { console.error(`❌ toCents(${raw}) = ${got}，应为 ${want}`); bad++; }
    }
    console.log(bad ? `自测失败 ${bad} 例` : '✅ 金额换算自测通过（6 位小数）');
    process.exit(bad ? 1 : 0);
  }
  need('CLOUDFLARE_ACCOUNT_ID'); need('D1_DATABASE_ID'); need('CLOUDFLARE_API_TOKEN'); need('ADS_WALLET');
  if (!CONTRACT) { console.error('缺少 ADS_WALLET_CONTRACT——不核对合约地址等于任何人扔一个山寨币都能换到广告位'); process.exit(1); }

  const pending = await d1("SELECT id, cat, url, price_cents FROM ads WHERE status='pending' AND price_cents IS NOT NULL");
  if (!pending.length) { console.log('没有待付订单，跳过'); return; }
  console.log(`待付订单 ${pending.length} 笔`);

  const txs = await incoming();
  console.log(`该地址最近入账 ${txs.length} 笔`);

  const today = new Date().toISOString().slice(0, 10);
  const exp = new Date(Date.now() + DAYS * 86400000).toISOString().slice(0, 10);
  let live = 0;

  for (const t of txs) {
    if (t.contract !== CONTRACT) continue;                 // ① 山寨代币
    if (t.confirmations < MIN_CONF) { console.log(`确认数不足(${t.confirmations}/${MIN_CONF})，本轮跳过 ${t.hash}`); continue; } // ②
    const cents = toCents(t.amountRaw);
    const hit = pending.find((p) => Number(p.price_cents) === cents);   // ③ 容差为 0
    if (!hit) continue;
    const dupe = await d1('SELECT ad_id FROM ad_orders WHERE session = ?', [t.hash]);
    if (dupe.length) continue;                                          // 幂等:同一笔链上交易只认一次
    const r = await d1(
      "UPDATE ads SET status='live', paid_at=?, expires=?, amount=?, session=? WHERE id=? AND status='pending'",
      [today, exp, `${cents} ${process.env.ADS_WALLET_TOKEN || 'USDT'}`, t.hash, hit.id]);
    await d1('INSERT OR IGNORE INTO ad_orders (ad_id, session, event_id, paid_at, amount, cat, url, starts, expires) VALUES (?,?,?,?,?,?,?,?,?)',
      [hit.id, t.hash, t.hash, new Date().toISOString(), `${cents}`, hit.cat || '', hit.url || '', today, exp]);
    console.log(`✅ 上架 ${hit.id}（金额 ${cents} 分，tx ${t.hash}）`);
    live++;
  }
  // 收到钱但对不上任何订单 → 必须显式报出来,否则钱静静躺着而买家在等
  const claimed = new Set(pending.map((p) => Number(p.price_cents)));
  const orphan = txs.filter((t) => t.contract === CONTRACT && t.confirmations >= MIN_CONF && !claimed.has(toCents(t.amountRaw)));
  if (orphan.length) console.log(`⚠️ ${orphan.length} 笔入账对不上任何待付订单（金额不符/多付/少付），需要人工处理`);
  console.log(`本轮上架 ${live} 笔`);
};

main().catch((e) => { console.error('ad-watch 失败:', e.message); process.exit(1); });
