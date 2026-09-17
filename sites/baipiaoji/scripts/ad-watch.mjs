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
const INSPECT = process.argv.includes('--inspect');   // 勘察模式：只读链上、不碰订单、不写任何东西
const need = (k) => { const v = process.env[k]; if (!v && !DRY) { console.error(`缺少 ${k}`); process.exit(1); } return v || ''; };

// 2026-09-16 改：订单读写从 D1 REST 换成站点自己的 /api/ad-claim。
// 原因不是洁癖,是原方案根本跑不通——本仓 deploy workflow 自己就写着
// 「CI 直连 D1 的 REST 导出在舰队里从未成功过一次」,根手册 09-12 / 09-13 两次记录
// 仓里两个 Cloudflare token 都没有 D1 权限。那条路上钱包轨会在第一条 SQL 就失败,
// 而失败只有在 owner 真的打开开关、买家真的付了钱之后才看得见。
// 现在走 Worker(自带 D1 绑定,零 token),顺带把一个带 D1 写权限的 CF token
// 从公开仓的 Secrets 里彻底拿掉。
const SITE = (process.env.ADS_CLAIM_URL || 'https://baipiaoji.com/api/ad-claim').trim();
const CLAIM_SECRET = process.env.ADS_WATCH_SECRET || '';
const WALLET = (process.env.ADS_WALLET || '').trim();
const CHAIN = (process.env.ADS_WALLET_CHAIN || '').trim().toLowerCase();
const CONTRACT = (process.env.ADS_WALLET_CONTRACT || '').trim().toLowerCase();
const DECIMALS = Number(process.env.ADS_WALLET_DECIMALS || 6);
const MIN_CONF = Number(process.env.ADS_MIN_CONFIRMATIONS || 12);
const DAYS = Number(process.env.ADS_DAYS || 30);
const SCAN_KEY = process.env.ADS_SCAN_API_KEY || '';

// 订单读写走站点自己的端点(Worker 有 D1 绑定,不需要任何 Cloudflare API token)
async function claimApi(body) {
  const r = await fetch(SITE, {
    method: 'POST',
    headers: { Authorization: `Bearer ${CLAIM_SECRET}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  // 503 = 站点侧没配 ADS_WATCH_SECRET;401 = 两边的密钥对不上。
  // 这两种都必须大声失败:静默跳过等于「钱到了但位子没上」而没人知道。
  if (r.status === 503) throw new Error('站点侧未配置 ADS_WATCH_SECRET（/api/ad-claim 返回 503）');
  if (r.status === 401) throw new Error('ADS_WATCH_SECRET 两边不一致（/api/ad-claim 返回 401）');
  return j;
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
      symbol: String((t.token_info && t.token_info.symbol) || ''),
      // 小数位以**链上这笔交易自己报的**为准,而不是配置里那个值。USDT 在多数链是 6 位、
      // 在 BNB Chain 是 18 位,配错一位金额就差 10 倍,而表现是「永远匹配不上」——
      // 一个不报错的静默失败。能从数据里读到的,就不要让人去填。
      decimals: Number((t.token_info && t.token_info.decimals) ?? NaN),
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
      symbol: String(t.tokenSymbol || ''),
      decimals: Number(t.tokenDecimal ?? NaN),   // 见 TRON 分支那段注释:小数位以链上为准
    }));
}

// 原始整数 → 分。用字符串切而不是浮点:1e-6 精度的金额用 Number 会在边界上出错,
// 而这里的比较必须是精确相等。
// decimals 默认走配置,但调用方应传入**链上这笔交易自己报的**位数(见 incoming 的注释)。
export function toCents(raw, decimals = DECIMALS) {
  const d = Number.isFinite(decimals) && decimals >= 0 ? Math.floor(decimals) : DECIMALS;
  const s = String(raw).padStart(d + 1, '0');
  const whole = s.slice(0, s.length - d);
  const frac = s.slice(s.length - d).padEnd(2, '0').slice(0, 2);
  return Number(whole) * 100 + Number(frac);
}

// 地址形态与链必须自洽。把 TRON 地址配成 ethereum(或反过来)是这类配置最常见的手滑,
// 而它的表现不是报错,是**永远匹配不到任何一笔**——又一个静默失败。开跑前就拦住。
export function chainMismatch(chain, addr, label = '地址') {
  const a = String(addr || '').trim();
  if (!a) return '';
  if (chain === 'tron') {
    if (!/^T[A-Za-z1-9]{33}$/.test(a)) return `${label}「${a.slice(0, 6)}…」不像 TRON 地址（应为 T 开头、34 位）`;
    return '';
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(a)) return `${label}「${a.slice(0, 6)}…」不像 EVM 地址（应为 0x 开头、42 位）`;
  return '';
}

const main = async () => {
  if (DRY) {
    // 自测:不碰网络,只验算金额换算与配置校验——这一段能红,才算有自检
    let bad = 0;
    const ck = (got, want, what) => { if (got !== want) { console.error(`❌ ${what}：得到 ${got}，应为 ${want}`); bad++; } };
    for (const [raw, want] of [['50370000', 5037], ['1000000', 100], ['999999', 99], ['0', 0]]) {
      ck(toCents(raw), want, `toCents(${raw}) 6 位小数`);
    }
    // 18 位小数的链(如 BNB Chain 上的 USDT)：按 6 位算会差 10^12 倍,表现是永远匹配不上。
    ck(toCents('49370000000000000000', 18), 4937, 'toCents 18 位小数');
    ck(toCents('1000000000000000000', 18), 100, 'toCents 18 位小数（整数额）');
    // 链与地址形态必须自洽
    ck(chainMismatch('tron', 'T' + 'x'.repeat(33)) === '', true, 'TRON 地址配 tron 应通过');
    ck(chainMismatch('ethereum', '0x'.padEnd(42, 'a')) === '', true, 'EVM 地址配 ethereum 应通过');
    ck(chainMismatch('ethereum', 'T' + 'x'.repeat(33)) !== '', true, 'TRON 地址配 ethereum 必须被拦');
    ck(chainMismatch('tron', '0x'.padEnd(42, 'a')) !== '', true, 'EVM 地址配 tron 必须被拦');
    ck(chainMismatch('tron', '') === '', true, '空值不在这里报错（由 need() 管）');
    console.log(bad ? `自测失败 ${bad} 例` : '✅ 自测通过（金额换算 6/18 位小数、链与地址形态自洽）');
    process.exit(bad ? 1 : 0);
  }
  need('ADS_WALLET');
  // 配置自洽性:开跑前就把手滑拦住,而不是让它表现为「一直匹配不上」。
  for (const [v, label] of [[WALLET, '收款地址 ADS_WALLET'], [CONTRACT, '合约地址 ADS_WALLET_CONTRACT']]) {
    const bad = chainMismatch(CHAIN, v, label);
    if (bad) { console.error(`❌ ${bad}——当前 ADS_WALLET_CHAIN=${CHAIN || '(未设置)'}`); process.exit(1); }
  }

  // 勘察模式:不碰订单、不写任何东西,只把这个地址最近收到的转账列出来
  // (代币符号 / 合约地址 / 小数位)。用途很具体——ADS_WALLET_CONTRACT 该填什么,
  // 从链上真实数据里抄,而不是靠任何人的记忆。填错合约的后果是永远收不到钱。
  if (INSPECT) {
    const txs = await incoming();
    if (!txs.length) { console.log('该地址最近没有代币转入,无法勘察合约地址'); return; }
    const seen = new Map();
    for (const t of txs) {
      const k = `${t.symbol}|${t.contract}|${t.decimals}`;
      seen.set(k, (seen.get(k) || 0) + 1);
    }
    console.log('该地址最近收到的代币(按链上数据,不是我记的):');
    for (const [k, n] of [...seen.entries()].sort((a, b) => b[1] - a[1])) {
      const [sym, c, d] = k.split('|');
      console.log(`  ${sym || '(无符号)'}  合约 ${c}  小数位 ${d}  最近 ${n} 笔`);
    }
    console.log('\n把上面对应 USDT 那一行的合约地址填进 GitHub Secret 「ADS_WALLET_CONTRACT」。');
    return;
  }

  need('ADS_WATCH_SECRET');
  if (!CONTRACT) { console.error('缺少 ADS_WALLET_CONTRACT——不核对合约地址等于任何人扔一个山寨币都能换到广告位。不知道填什么就先跑一次 --inspect，它会从链上列出这个地址收到过的代币与合约。'); process.exit(1); }

  const pending = (await claimApi({ action: 'pending' })).pending || [];
  if (!pending.length) { console.log('没有待付订单，跳过'); return; }
  console.log(`待付订单 ${pending.length} 笔`);

  const txs = await incoming();
  console.log(`该地址最近入账 ${txs.length} 笔`);

  // 上架日与到期日由服务端算(它才是唯一写库的一方)。这里不再留一份本地副本——
  // 留着会让人以为改这里能改到期日,而实际改的是 Worker 侧的 ADS_DAYS。
  let live = 0;

  for (const t of txs) {
    if (t.contract !== CONTRACT) continue;                 // ① 山寨代币
    if (t.confirmations < MIN_CONF) { console.log(`确认数不足(${t.confirmations}/${MIN_CONF})，本轮跳过 ${t.hash}`); continue; } // ②
    const cents = toCents(t.amountRaw, t.decimals);   // 小数位以链上这笔交易自报的为准
    const hit = pending.find((p) => Number(p.price_cents) === cents);   // ③ 容差为 0
    if (!hit) continue;
    // 幂等与金额都由服务端再核一遍(它不信任本脚本);这里只报告链上看到了什么。
    const r = await claimApi({
      action: 'claim', id: hit.id, cents, hash: t.hash, token: process.env.ADS_WALLET_TOKEN || 'USDT',
    });
    if (r.code === 'already' || r.code === 'notpending' || r.code === 'nochange') continue;
    if (!r.ok) { console.log(`⚠️ ${hit.id} 未上架：${r.code}${r.want ? `（应收 ${r.want} 分，链上 ${r.got} 分）` : ''}`); continue; }
    console.log(`✅ 上架 ${hit.id}（金额 ${cents} 分，tx ${t.hash}）`);
    live++;
  }
  // 收到钱但对不上任何订单 → 必须显式报出来,否则钱静静躺着而买家在等
  const claimed = new Set(pending.map((p) => Number(p.price_cents)));
  const orphan = txs.filter((t) => t.contract === CONTRACT && t.confirmations >= MIN_CONF && !claimed.has(toCents(t.amountRaw, t.decimals)));
  if (orphan.length) console.log(`⚠️ ${orphan.length} 笔入账对不上任何待付订单（金额不符/多付/少付），需要人工处理`);
  console.log(`本轮上架 ${live} 笔`);
};

main().catch((e) => { console.error('ad-watch 失败:', e.message); process.exit(1); });
