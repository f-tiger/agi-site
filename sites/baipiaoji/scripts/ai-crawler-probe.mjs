#!/usr/bin/env node
// AI 检索爬虫可达性探测。
//
// 起因：站点 referrer 里 AI 助手来源恒为 0（上线至今 252 次访问，全部是 direct 或 Google），
// 而同一个人的另一个站有可观的 AI 助手流量。要判断这是「没被引用」还是「根本进不来」，
// 得知道爬虫能不能拿到页面——而这件事站内任何数据都答不了：
// 第一方打点靠 JS 信标，爬虫不跑 JS，所以 D1 里永远看不到爬虫，看起来一切正常。
//
// robots.txt 放行也不等于放行：Cloudflare 的 Bot Fight Mode 与「Block AI Scrapers and Crawlers」
// 在 robots 之上、在应用之前生效，一旦开启，GPTBot 拿到的是 403，站长毫无感知。
// 所以只能从外部按爬虫 UA 实测。CI 的出口网络可达生产域，就在那里做。
//
// 判定：200 = 放行；403/503 = 被拦（这正是要找的病根）；其他 = 记录原样，不臆测。
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = process.env.PROBE_ORIGIN || 'https://baipiaoji.com';

// UA 字符串取各家官方文档公布的形式；探测只做 GET，不抓内容。
const AGENTS = [
  { id: 'GPTBot', ua: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.1; +https://openai.com/gptbot', who: 'OpenAI 训练与检索' },
  { id: 'OAI-SearchBot', ua: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot', who: 'ChatGPT 搜索引用' },
  { id: 'ChatGPT-User', ua: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot', who: 'ChatGPT 用户即时取页' },
  { id: 'PerplexityBot', ua: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot', who: 'Perplexity 索引' },
  { id: 'Perplexity-User', ua: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; Perplexity-User/1.0; +https://perplexity.ai/perplexity-user', who: 'Perplexity 用户即时取页' },
  { id: 'ClaudeBot', ua: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ClaudeBot/1.0; +claudebot@anthropic.com', who: 'Anthropic 抓取' },
  { id: 'Claude-User', ua: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; Claude-User/1.0; +Claude-User@anthropic.com', who: 'Claude 用户即时取页' },
  { id: 'Google-Extended', ua: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)', who: 'Google AI 概览（沿用 Googlebot UA）' },
  { id: 'Bingbot', ua: 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)', who: 'Bing / Copilot' },
  { id: '(baseline browser)', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36', who: '对照组：普通浏览器' },
];

// 探这几条：首页、llms.txt（AI 检索最常取的那份）、以及流量第一的页面
const PATHS = ['/', '/llms.txt', '/en/c/coding.html'];

const probe = async (ua, path) => {
  const t0 = Date.now();
  try {
    // ?__probe=1 让 functions/_middleware.js 认出「这是我们自己伪装的 UA」并跳过记账。
    // 不加这一条，探针每天会往 ev='bot' 里灌几十行假抓取，
    // 而「AI 爬虫来没来」正是我们要用那张表回答的问题——自证数据混进去就全废了。
    const res = await fetch(`${ORIGIN}${path}${path.includes('?') ? '&' : '?'}__probe=1`, {
      headers: { 'User-Agent': ua, Accept: 'text/html,text/plain,*/*' },
      redirect: 'follow',
      signal: AbortSignal.timeout(20000),
    });
    return { status: res.status, ms: Date.now() - t0 };
  } catch (e) {
    return { status: 0, ms: Date.now() - t0, error: String(e.message || e).slice(0, 120) };
  }
};

const results = [];
for (const a of AGENTS) {
  const byPath = {};
  for (const p of PATHS) byPath[p] = await probe(a.ua, p);
  const codes = Object.values(byPath).map((r) => r.status);
  const blocked = codes.some((c) => c === 403 || c === 503 || c === 429);
  results.push({ agent: a.id, who: a.who, blocked, byPath });
  const line = PATHS.map((p) => `${p} ${byPath[p].status || byPath[p].error}`).join(' | ');
  console.log(`${blocked ? '🚫' : codes.every((c) => c === 200) ? '✅' : '⚠️ '} ${a.id.padEnd(16)} ${line}`);
}

// 对照组是这个探测的命门：如果连普通浏览器 UA 都拿不到页面，
// 那 403 来自探测方自己的网络（代理、出口策略、站点全站故障），跟 AI 爬虫策略无关。
// 没有这一行，本地跑一次就会得出「Cloudflare 拦了所有 AI 爬虫」的错误结论——实测确实如此。
const baseline = results.find((r) => r.agent === '(baseline browser)');
const baselineOk = Object.values(baseline.byPath).every((r) => r.status === 200);
const blockedList = baselineOk ? results.filter((r) => r.blocked && r !== baseline).map((r) => r.agent) : [];
const out = {
  checked: new Date().toISOString().slice(0, 10), origin: ORIGIN,
  valid: baselineOk, blocked: blockedList, results,
};
writeFileSync(join(root, 'data/ai-crawler-probe.json'), JSON.stringify(out, null, 2) + '\n');

if (!baselineOk) {
  console.log('\n⚠️  探测无效：对照组（普通浏览器 UA）也没拿到 200，说明是探测方自己的网络到不了生产域，');
  console.log('   不是站点在拦 AI 爬虫。这一轮结果不作数——请在出口网络通畅的环境（如 CI）重跑。');
  process.exit(0);
}

if (blockedList.length) {
  console.log(`\n::warning::AI 爬虫被拦：${blockedList.join(', ')}——robots.txt 放行了，但网络层没有。`);
  console.log('多半是 Cloudflare 的 Bot Fight Mode 或「Block AI Scrapers and Crawlers」；');
  console.log('在 Cloudflare 控制台 Security → Bots 关掉对应开关即可。这一项开着，AI 助手永远不会引用本站。');
} else {
  console.log('\n✅ 所有 AI 检索爬虫均可取到页面——AI 助手没有引用本站，不是因为进不来。');
}
