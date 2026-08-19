#!/usr/bin/env node
// GA4 一键配置与体检。
//
// 需要你先做的两件事（这两件只有 Google 账号本人能做，脚本代替不了）：
//   1. Google Cloud → 启用 Google Analytics Admin API 与 Google Analytics Data API
//      → 创建服务账号 → 下载 JSON 密钥
//   2. GA4 后台 → 管理 → 媒体资源访问管理 → 把服务账号邮箱加进去
//      · 只想让闭环读数据 → 「查看者」就够
//      · 想让本脚本自动建自定义维度 → 需要「编辑者」
//
// 然后：
//   GA4_PROPERTY_ID=123456789 GA4_SERVICE_ACCOUNT_JSON="$(cat key.json)" npm run ga4:setup
//
// 脚本会做完剩下的：验证凭据 → 列出已有维度 → 补齐缺的 8 个 → 跑一次真实取数验收。
// 加 --check 只体检不改动。

import { createSign } from 'node:crypto';

const DRY = process.argv.includes('--check') || process.argv.includes('--dry-run');

// 站内埋点用到的全部自定义维度。少一个，闭环里对应的那段分析就是空的。
const DIMENSIONS = [
  { parameterName: 'search_term', displayName: 'search_term', desc: '用户搜了什么（含无结果搜索，选题积压的唯一来源）' },
  { parameterName: 'tool_name', displayName: 'tool_name', desc: '点了哪个工具（出站点击 = 离营收最近的信号）' },
  { parameterName: 'tool_category', displayName: 'tool_category', desc: '工具属于哪个分类（推荐位重排依据）' },
  { parameterName: 'placement', displayName: 'placement', desc: '从哪儿点走的：card / tool_page / plan_step / hustle_step' },
  { parameterName: 'plan', displayName: 'plan', desc: '哪套 0 元方案（完成率与卡点分析）' },
  { parameterName: 'hustle', displayName: 'hustle', desc: '哪份赚钱作业（四层阶梯通不通的顶层信号）' },
  { parameterName: 'site_edition', displayName: 'site_edition', desc: '中文 zh / 英文 en（决定英文版还要不要投入）' },
  { parameterName: 'step_no', displayName: 'step_no', desc: '卡在第几步（全站颗粒度最细的改进信号）' },
];

const log = (...a) => console.log(...a);
const fail = (msg, hint) => {
  log(`\n❌ ${msg}`);
  if (hint) log(`   ${hint}`);
  process.exit(1);
};

/* ---------- 1. 凭据 ---------- */
const raw = process.env.GA4_SERVICE_ACCOUNT_JSON;
const propRaw = process.env.GA4_PROPERTY_ID;

if (!raw || !propRaw) {
  fail(
    '缺少环境变量。',
    `需要两个：
   GA4_PROPERTY_ID           GA4 媒体资源 ID，纯数字（管理 → 媒体资源详情里能看到，不是 G- 开头那个）
   GA4_SERVICE_ACCOUNT_JSON  服务账号 JSON 密钥全文

   本地试跑：
   GA4_PROPERTY_ID=123456789 GA4_SERVICE_ACCOUNT_JSON="$(cat key.json)" npm run ga4:setup`
  );
}

const property = String(propRaw).replace(/^properties\//, '').trim();
if (!/^\d+$/.test(property)) {
  fail(`GA4_PROPERTY_ID 不是纯数字：「${property}」`, '填的可能是「G-XXXXXXX」衡量 ID。要的是媒体资源 ID（管理 → 媒体资源详情，一串数字）。');
}

let sa;
try {
  sa = JSON.parse(raw);
} catch {
  fail('GA4_SERVICE_ACCOUNT_JSON 不是合法 JSON。', '要粘贴下载下来的密钥文件**全文**，包括最外层的大括号，不要只贴 private_key。');
}
if (!sa.client_email || !sa.private_key) {
  fail('JSON 里缺 client_email 或 private_key。', '这多半不是服务账号密钥，而是 OAuth 客户端配置。请在「IAM 与管理 → 服务账号 → 密钥 → 添加密钥 → JSON」重新下载。');
}

log('GA4 配置检查');
log('─'.repeat(56));
log(`媒体资源      properties/${property}`);
log(`服务账号      ${sa.client_email}`);
log(`模式          ${DRY ? '只体检，不改动' : '体检 + 自动补齐缺失的自定义维度'}`);

/* ---------- 2. 换 token ---------- */
const b64u = (b) => Buffer.from(b).toString('base64url');

async function accessToken(scope) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64u(JSON.stringify({
    iss: sa.client_email, scope, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600,
  }));
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${claim}`);
  const jwt = `${header}.${claim}.${signer.sign(sa.private_key, 'base64url')}`;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  });
  const body = await res.text();
  if (!res.ok) {
    if (body.includes('invalid_grant')) {
      fail(`换取令牌失败：${body.slice(0, 160)}`, '常见原因：私钥被转义坏了（\\n 变成了真正的换行，或反过来）。把 JSON 原样贴进 Secret，不要手工改。');
    }
    fail(`换取令牌失败 ${res.status}：${body.slice(0, 200)}`);
  }
  return JSON.parse(body).access_token;
}

// 只读 scope 够用来读数据；建维度需要 edit。一次要齐，权限不够时 Google 只会在调用处报错。
const SCOPES = [
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/analytics.edit',
].join(' ');

const token = await accessToken(DRY ? 'https://www.googleapis.com/auth/analytics.readonly' : SCOPES);
log('\n✅ 凭据有效，已换到访问令牌');

/* ---------- 3. 自定义维度 ---------- */
const admin = (path, init) => fetch(`https://analyticsadmin.googleapis.com/v1beta/properties/${property}${path}`, {
  ...init,
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init?.headers || {}) },
});

const listRes = await admin('/customDimensions?pageSize=200');
if (!listRes.ok) {
  const t = await listRes.text();
  if (listRes.status === 403) {
    fail(
      '没有权限读取该媒体资源的自定义维度。',
      `到 GA4 后台 → 管理 → 媒体资源访问管理 → 添加用户，填：\n   ${sa.client_email}\n   角色：想让脚本自动建维度选「编辑者」，只读数据选「查看者」。\n   另外确认 Google Cloud 里已启用 Google Analytics Admin API。`
    );
  }
  if (listRes.status === 404) fail(`找不到 properties/${property}。`, '媒体资源 ID 填错了，或服务账号没被加进这个资源。');
  fail(`读取自定义维度失败 ${listRes.status}：${t.slice(0, 200)}`);
}
const existing = (await listRes.json()).customDimensions || [];
const have = new Set(existing.map((d) => d.parameterName));

log(`\n自定义维度（已有 ${existing.length} 个，站内需要 ${DIMENSIONS.length} 个）`);
log('─'.repeat(56));

const missing = DIMENSIONS.filter((d) => !have.has(d.parameterName));
for (const d of DIMENSIONS) {
  log(`${have.has(d.parameterName) ? '  ✅' : DRY ? '  ⚠️ 缺失' : '  ➕ 待创建'}  ${d.parameterName.padEnd(15)} ${d.desc}`);
}

let created = 0;
if (missing.length && !DRY) {
  log('');
  for (const d of missing) {
    const res = await admin('/customDimensions', {
      method: 'POST',
      body: JSON.stringify({ parameterName: d.parameterName, displayName: d.displayName, scope: 'EVENT', description: d.desc }),
    });
    if (res.ok) {
      created++;
      log(`  ✅ 已创建 ${d.parameterName}`);
    } else {
      const t = await res.text();
      if (res.status === 403) {
        log(`  ❌ ${d.parameterName} 创建失败：权限不足`);
        log(`     服务账号 ${sa.client_email} 在 GA4 里需要「编辑者」角色，当前多半是「查看者」。`);
        break;
      }
      log(`  ❌ ${d.parameterName} 创建失败 ${res.status}：${t.slice(0, 140)}`);
    }
  }
}

/* ---------- 4. 真实取数验收 ---------- */
log('\n取数验收（近 7 天）');
log('─'.repeat(56));
const reportRes = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${property}:runReport`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    dateRanges: [{ startDate: '7daysAgo', endDate: 'yesterday' }],
    metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
  }),
});
if (!reportRes.ok) {
  const t = await reportRes.text();
  log(`  ❌ 取数失败 ${reportRes.status}：${t.slice(0, 200)}`);
  log('     若提示 API 未启用，到 Google Cloud 启用 Google Analytics Data API 后再跑一次。');
} else {
  const j = await reportRes.json();
  const row = j.rows?.[0];
  const sessions = Number(row?.metricValues?.[0]?.value || 0);
  const users = Number(row?.metricValues?.[1]?.value || 0);
  log(`  ✅ 取数成功：近 7 天 ${sessions} 次会话 / ${users} 个用户`);
  if (!sessions) log('     数字是 0 说明还没流量，不是配置问题——闭环会照常运行，只是暂时没有信号可用。');
}

/* ---------- 5. 结论 ---------- */
log('\n结论');
log('─'.repeat(56));
if (DRY) {
  log(missing.length
    ? `  还缺 ${missing.length} 个自定义维度。去掉 --check 重跑即可自动创建（需要「编辑者」权限）。`
    : '  自定义维度齐了，取数正常，增长闭环可以完整运行。');
} else {
  log(`  本次创建 ${created} 个维度，现有 ${have.size + created}/${DIMENSIONS.length} 个到位。`);
  const still = DIMENSIONS.length - (have.size + created);
  if (still > 0) log(`  还差 ${still} 个，多半是权限不够——把服务账号在 GA4 里改成「编辑者」再跑一次。`);
}
log(`
  ⚠️ 自定义维度只对**创建之后**产生的数据生效，历史数据不会补。
     所以今天建好，明天的闭环才开始有事件维度可用。

  下一步：把这两个值填进 GitHub 仓库 Secret（Settings → Secrets and variables → Actions）
     GA4_PROPERTY_ID           ${property}
     GA4_SERVICE_ACCOUNT_JSON  刚才那份 JSON 全文
  然后在 Actions 页手动跑一次 Growth loop 验证。`);
