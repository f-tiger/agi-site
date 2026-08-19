#!/usr/bin/env node
// 三线度量的唯一口径来源（2026-08-16 起）。
//
// 为什么要有这个文件：三轮里口径漂了三次，每次都是我手写 SQL 时漏掉一类。
//   08-14 漏了 bot_spoofed（冒用 AI 爬虫 UA 的漏洞扫描器）
//   08-15 漏了 bot_maybe_probe（51 条混进真人桶）
//   08-16 更糟：把一整批合成扫描当成真人，据此写出「对比页占真人浏览 52%」的结论，
//          并拿它当作产品决策依据。
// 三次都是靠自觉执行的规矩，三次都没做到。所以把定义搬进代码，每轮跑同一份 SQL，
// 不再手写。用法：node scripts/traffic-truth.mjs [human|bot|agent|all]
// 输出的 SQL 直接贴进 D1 查询。

// ── 判别规则 ────────────────────────────────────────────────────────────
// 机器标签：ev 里已经明确标了机器的四类，一个都不能漏。
const BOT_EV = ['bot', 'api', 'bot_spoofed', 'bot_maybe_probe'];

// 爬虫 UA 片段（2026-08-17 加，第五个口径洞）：爬虫也会打 /api/*，被记成 ev='api'。
// 把爬虫算进 agent 线，与把 CI 自测算进去是同一种自我灌水：agent 线要回答的是
// 「有没有真实的 agent 在用我们的接口」，爬虫抓 API 端点只是抓取的一种形态，属爬虫线。
// 同一次访问只能进一条线，不能两边都算。
// 实测（since 2026-08-10，八天）：ev='api' 共 1017 次 = CI 自测 986 + 爬虫打 API 10 + 其余 21。
// 那 21 次也不都是「用户的 agent」：SaSame-MCP-Audit/0.1 九次分布在八天里、每天恰好一次、
// 全部打同一个 /api/mcp/search_ai_tools —— 形态是第三方定时探针，不是有人在用。
// 所以这条线现在的诚实读数是「个位数」，不是 21，更不是修正前的三位数。
const BOT_UA = ['gptbot', 'chatgpt-user', 'oai-searchbot', 'claudebot', 'claude-user', 'claude-searchbot',
  'anthropic-ai', 'perplexitybot', 'perplexity-user', 'google-extended', 'googlebot', 'bingbot',
  'amazonbot', 'applebot', 'bytespider', 'duckassistbot', 'mistralai', 'cohere-ai', 'yandex',
  'ccbot', 'meta-external', 'mj12bot', 'ahrefsbot', 'semrushbot', 'dotbot', 'petalbot'];

// 手势事件：必须 JS 执行 + 真实交互才会产生，扫描器打不出来。这是最硬的真人证据。
const GESTURE_EV = ['sub_view', 'star', 'go'];

// 合成扫描的签名（08-16 判定，三条互相独立、同时成立才算数）：
//   1. 同一 path 同一天恰好命中固定次数（观测到的是 5 次），且此后再不出现
//   2. path 按字母序成簇（08-13 全是 figma-*，08-14/15 全是 siliconflow-*）
//   3. 来源域恒为空
// 全站直方图佐证：同 path 同日命中 ≥3 次的 55 组里，来源域合计为 0；
// 所有来源域都落在命中 ≤2 次的组里。据此定阈值：
const SCAN_MIN_HITS_PER_PATH_PER_DAY = 3;

// 真人线只认两种证据，缺一不可信：
//   A. 来源域非空（有人从某个地方点进来）
//   B. 手势事件（有人在页面上动了手）
// 「直接访问且无手势」一律不计入真人线——那是本站被扫描的主要形态。


// 把爬虫 UA 片段编译成 SQL 条件。用 lower(ref) LIKE 而不是等值：
// UA 是长字符串，爬虫名只是其中一段（例如 "Mozilla/5.0 ... GPTBot/1.4; +https://..."）。
const BOT_UA_SQL = BOT_UA.map((b) => `lower(ref) NOT LIKE '%${b}%'`).join('\n      AND ');

const SQL = {
  human: `-- 真人线 A：有来源域的到达（唯一可归因的真人证据）
SELECT d, country, lang, ref, path, count(*) n
FROM hits
WHERE d >= :since AND ev = ''
  AND ref IS NOT NULL AND ref != ''
GROUP BY d, country, lang, ref, path
ORDER BY d DESC;

-- 真人线 B：手势事件（JS + 交互，扫描器打不出来）
SELECT d, ev, country, lang, path, count(*) n
FROM hits
WHERE d >= :since AND ev IN (${GESTURE_EV.map((e) => `'${e}'`).join(', ')})
GROUP BY d, ev, country, lang, path
ORDER BY d DESC, ev;

-- 反向校验：扫描嫌疑组。命中 >= ${SCAN_MIN_HITS_PER_PATH_PER_DAY} 且来源域全空的，
-- 不得计入真人线。这一段每轮都要看，看到新的字母序簇就是又来了一轮扫描。
SELECT path, country, d, count(*) c,
       sum(CASE WHEN ref IS NOT NULL AND ref != '' THEN 1 ELSE 0 END) referred
FROM hits
WHERE d >= :since AND ev = '' AND path != '/__selftest'
GROUP BY path, country, d
HAVING c >= ${SCAN_MIN_HITS_PER_PATH_PER_DAY} AND referred = 0
ORDER BY c DESC;`,

  bot: `-- AI 爬虫线：只认成功响应（中间件自 08-15 起不再记 404），
-- 且必须把 bot_spoofed 单列出来看占比——那是冒用 AI 爬虫 UA 的漏洞扫描器。
SELECT d, ev, ref AS ua, count(*) n
FROM hits
WHERE d >= :since AND ev IN ('bot', 'bot_spoofed', 'bot_maybe_probe')
GROUP BY d, ev, ua
ORDER BY d DESC, n DESC;`,

  agent: `-- agent 线。2026-08-16 发现的第四个口径洞：这条线 95% 是我们自己的 CI 自测——
-- daily-update.yml 每天用 curl 打 /api/limits?slug=kimi 等固定 URL，九天累计数百次，
-- 全部记成 ev='api'。把自测算进 agent 线，等于自己给自己造了一条「增长曲线」。
-- 所以必须排除 curl UA（CI 唯一的 UA），只看外部调用。
SELECT d, ref AS ua, path, count(*) n
FROM hits
WHERE d >= :since AND ev = 'api'
  AND ref NOT LIKE 'curl/%'
  AND ${BOT_UA_SQL}
GROUP BY d, ua, path
ORDER BY d DESC, n DESC;

-- 对照二：打到 /api/* 的爬虫。它们属爬虫线，不属 agent 线——
-- 这一段存在的意义是让「被剔掉多少」始终看得见，而不是悄悄消失。
SELECT d, ref AS ua, count(*) n
FROM hits
WHERE d >= :since AND ev = 'api' AND ref NOT LIKE 'curl/%'
  AND NOT (${BOT_UA_SQL})
GROUP BY d, ua ORDER BY d DESC, n DESC;

-- 对照：被排除掉的自测量。这个数应该始终远大于上面那个——
-- 如果哪天上面的数追上来了，那才是 agent 线真的起来了。
SELECT d, count(*) ci_selftest_calls
FROM hits
WHERE d >= :since AND ev = 'api' AND ref LIKE 'curl/%'
GROUP BY d ORDER BY d DESC;`,
};

const want = (process.argv[2] || 'all').toLowerCase();
const since = process.argv[3] || '';

console.log(`# 三线度量口径（scripts/traffic-truth.mjs）
# 机器标签（必须全部排除出真人线）：${BOT_EV.join(' / ')}
# 手势事件（真人硬证据）：${GESTURE_EV.join(' / ')}
# 扫描判定阈值：同 path 同日命中 >= ${SCAN_MIN_HITS_PER_PATH_PER_DAY} 且来源域全空
${since ? `# :since = ${since}\n` : '# 用法：node scripts/traffic-truth.mjs [human|bot|agent|all] [YYYY-MM-DD]\n'}`);

const keys = want === 'all' ? Object.keys(SQL) : [want];
for (const k of keys) {
  if (!SQL[k]) {
    console.error(`未知的线：${k}（可选 human / bot / agent / all）`);
    process.exit(1);
  }
  console.log(`\n${'='.repeat(70)}\n【${k}】\n${'='.repeat(70)}`);
  console.log(since ? SQL[k].replaceAll(':since', `'${since}'`) : SQL[k]);
}
