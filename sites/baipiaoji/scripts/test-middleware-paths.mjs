#!/usr/bin/env node
// 边缘爬虫记账的路径分类单测（2026-09-17）。零网络、零 D1。
//
// 为什么存在
// ----------
// `functions/_middleware.js` 的 `isContentPath()` 决定「这次爬虫访问记不记账」。
// 它上线以来是个**白名单**——`/` 或以 `/` 结尾，否则必须匹配 `\.(html|txt|json|md|xml)$`。
// 本站的内容页却是**无扩展名**路由（`/tools/grok`、`/en/c/coding`、`/vs/a-vs-b`），
// 一条都不匹配，于是这张表对整个产品是瞎的，而报表看上去一切正常。
//
// D1 现查坐实（2026-09-17，28 天窗）：
//   · ev='bot' 共 1,221 行，只有 **23 个不同路径**，全部是带斜杠的枢纽或带扩展名的文件；
//     `/tools/<slug>` 与 `/c/<cat>` 各 **0** 条。
//   · 同窗真人落地 330 次，其中 **302 次（92%）在无扩展名路径上**。
//   · Bingbot 记到 14 个路径，同期 Bing 家族却把真人送到了 20 个不同的中文工具页——
//     两个数字互相矛盾，矛盾的是仪器不是爬虫。
//
// 这个单测存在的理由不是「测一个正则」，是**把那次误判钉死**：分类器再变回白名单、
// 或者有人往黑名单里加了会吃掉内容页的规则，部署就红。挂在 push 路径（零外部副作用）。
//
// 运行：node scripts/test-middleware-paths.mjs
import { isContentPath, botOf } from '../functions/_middleware.js';

let bad = 0;
const ck = (cond, msg) => { if (!cond) { console.error(`❌ ${msg}`); bad++; } };

// ── 内容页：必须记账 ────────────────────────────────────────────────
// 前 12 条直接取自生产 D1 里 28 天真人落地的最高路径，**其中 10 条是旧白名单会漏掉的**。
const CONTENT = [
  '/tools/grok', '/en/tools/grok', '/en/c/coding', '/tools/kimi', '/c/api',
  '/en/tools/fireworks', '/tools/cline', '/tools/feishu-miaoji', '/en/tools/haiper',
  '/vs/dify-vs-n8n', '/en/vs/bailian-vs-cerebras', '/is-grok-still-free',
  '/', '/en/', '/vs/', '/money/', '/earn/', '/upgrade/',
  '/llms.txt', '/llms-full.txt', '/sitemap.xml', '/robots.txt', '/feed.xml',
  '/limits.json', '/limits.md', '/pricing.md', '/openapi.json', '/tools/grok.md',
];
for (const p of CONTENT) ck(isContentPath(p) === true, `内容页必须记账：${p}`);

// ── 附属资源与 API：不记 ────────────────────────────────────────────
// 资源全记等于把一次页面抓取放大成几十条；/api/* 各函数自己记 ev='api'，重复记会把漏斗算两遍。
const SKIP = [
  '/api/ev', '/api/reach', '/api/limits', '/api/subscribe',
  '/bpj.js', '/hit.js', '/assets/app.css', '/assets/chunk.mjs', '/assets/app.js.map',
  '/logo.svg', '/og.png', '/hero.jpg', '/hero.jpeg', '/icon.ico', '/anim.gif',
  '/shot.webp', '/shot.avif', '/font.woff', '/font.woff2', '/font.ttf', '/font.otf',
  '/legacy.eot', '/clip.mp4', '/clip.webm', '/voice.mp3', '/paper.pdf', '/pack.zip', '/mod.wasm',
];
for (const p of SKIP) ck(isContentPath(p) === false, `不该记账：${p}`);

// ── 把那次误判本身钉死 ──────────────────────────────────────────────
// 旧实现逐字复刻。任何一条内容页在旧规则下为 false、在新规则下必须为 true——
// 这条断言就是这个文件的全部意义；分类器退回白名单它立刻红。
const legacy = (p) => {
  if (p.startsWith('/api/')) return false;
  if (p === '/' || p.endsWith('/')) return true;
  return /\.(html|txt|json|md|xml)$/i.test(p);
};
const rescued = CONTENT.filter((p) => !legacy(p) && isContentPath(p));
ck(rescued.length >= 10,
   `旧白名单漏掉的内容页现在必须被记账，实得 ${rescued.length} 条（应 ≥10）`);
ck(rescued.includes('/tools/grok') && rescued.includes('/en/c/coding'),
   '本站流量最大的两个页型（工具页、板块页）必须在被救回之列');
// 反方向：新规则不许把附属资源放进来，否则「多记一点」会变成「把抓取量灌水几十倍」。
ck(SKIP.every((p) => !isContentPath(p)), '黑名单不能漏掉任何一类附属资源');

// ── 爬虫识别 ────────────────────────────────────────────────────────
ck(botOf('Mozilla/5.0 (compatible; Bingbot/2.0; +http://www.bing.com/bingbot.htm)') === 'Bingbot',
   'Bingbot 必须被认出');
ck(botOf('Mozilla/5.0 AppleWebKit (compatible; GPTBot/1.2; +https://openai.com/gptbot)') === 'GPTBot',
   'GPTBot 必须被认出');
ck(botOf('Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)') === 'ClaudeBot',
   'ClaudeBot 必须被认出');
// 真人浏览器绝不能被当成爬虫：beacon 已经记过一遍，重复记会把漏斗算两遍。
ck(botOf('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
       + '(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36') === '',
   '普通 Chrome 不是爬虫');
ck(botOf('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 '
       + 'Version/18.0 Mobile/15E148 Safari/604.1') === '', '普通 Safari 不是爬虫');
ck(botOf('') === '' && botOf(null) === '', '空 UA 不是爬虫');

// ── 中国搜索与 AI 检索（2026-09-17）────────────────────────────────
// 为什么单独一组:中国已经是本站增长的那一半（四周里带来源真人 0 → 最近 14 天 60,
// 同窗美国 63,其中 cn.bing.com 占中国来源的 77%），而此前这些爬虫的 UA 一个都不在
// AI_BOTS 里,botOf() 返回空 → 中间件直接 return → **它们在库里完全不存在**。
const CN_BOTS = [
  ['Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)', 'Baiduspider'],
  ['Mozilla/5.0 (Linux; u; Android 4.2.2) AppleWebKit/534.46 (KHTML,like Gecko) Version/5.1 '
   + 'Mobile Safari/10600.6.3 (compatible; Baiduspider-render/2.0; '
   + '+http://www.baidu.com/search/spider.html)', 'Baiduspider'],
  ['Sogou web spider/4.0(+http://www.sogou.com/docs/help/webmasters.htm#07)', 'Sogou'],
  ['Mozilla/5.0 (compatible; 360Spider(compatible; HaosouSpider; '
   + 'http://www.haosou.com/help/help_3_2.html))', '360Spider'],
  ['Mozilla/5.0 (compatible; PetalBot;+https://webmaster.petalsearch.com/site/petalbot)', 'PetalBot'],
  ['Mozilla/5.0 (compatible; YisouSpider/5.0; http://www.yisou.com/help/help_bot.html)', 'YisouSpider'],
];
for (const [ua, want] of CN_BOTS) ck(botOf(ua) === want, `中文爬虫应被认出为 ${want}：${ua.slice(0, 48)}…`);

// 这一组是整块改动里最容易出事的地方,所以正面写死:**词根必须是爬虫专属的**。
// 用厂商名当词根（'baidu'、'360'、'sogou'）会把这些真人浏览器记成爬虫,
// 而 beacon 已经记过它们一遍 —— 漏斗会被算两遍,且正好发生在我们最关心的那个市场。
const CN_HUMANS = [
  'Mozilla/5.0 (Linux; Android 13; V2227A) AppleWebKit/537.36 (KHTML, like Gecko) '
  + 'Chrome/140.0.0.0 Mobile Safari/537.36 baidubrowser/13.28.0.10',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) '
  + 'Chrome/140.0.0.0 Safari/537.36 SE 2.X MetaSr 1.0',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) '
  + 'Mobile/15E148 Quark/7.4.5 MQQBrowser/2.0',
  'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 '
  + 'Chrome/140.0.0.0 Mobile Safari/537.36 MicroMessenger/8.0.50.2701(0x28003237)',
];
for (const ua of CN_HUMANS) ck(botOf(ua) === '', `中国真人浏览器不能被当成爬虫：${ua.slice(-40)}`);

if (bad) { console.error(`\ntest-middleware-paths: ${bad} 项失败`); process.exit(1); }
console.log(`✅ test-middleware-paths 通过（内容页 ${CONTENT.length} 条 / 排除 ${SKIP.length} 条 / `
          + `旧白名单漏掉的 ${rescued.length} 条已救回 / 爬虫识别双向 / `
          + `中文爬虫 ${CN_BOTS.length} 家、中国真人浏览器 ${CN_HUMANS.length} 种）`);
