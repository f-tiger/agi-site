// 服务端爬虫可见性：页面级打点此前 100% 依赖客户端 JS beacon（build.mjs 的 sendBeacon），
// 而 GPTBot / ClaudeBot / PerplexityBot 这些 AI 检索爬虫**不执行 JavaScript**——
// 它们抓一万页我们也一条都记不到。于是「AI 助手有没有来抓」这个问题，
// 我们过去只能靠 ai-crawler-probe 自己伪装 UA 去敲门（那证明的是「进得来」，
// 不是「来过」），真实抓取量始终是个盲区。这一层把它补上：在边缘直接记服务端日志。
//
// 只记已知 AI 爬虫，不记普通浏览器——普通访问已由 beacon 覆盖，重复记会把漏斗算两遍；
// 也不记 /api/*（那几个函数各自已经在记 ev='api'，UA 存在 ref 里）。
// 写入走 waitUntil，失败静默：任何统计问题都不能影响页面本身。
const AI_BOTS = [
  // OpenAI：训练 / 搜索索引 / 用户点开链接时的实时抓取
  ['GPTBot', 'gptbot'], ['OAI-SearchBot', 'oai-searchbot'], ['ChatGPT-User', 'chatgpt-user'],
  // Anthropic
  ['ClaudeBot', 'claudebot'], ['Claude-User', 'claude-user'], ['Claude-SearchBot', 'claude-searchbot'],
  ['anthropic-ai', 'anthropic-ai'],
  // Perplexity
  ['PerplexityBot', 'perplexitybot'], ['Perplexity-User', 'perplexity-user'],
  // Google：Gemini / AI Overviews 的抓取授权信号走 Google-Extended，
  // 但它不是独立爬虫（Googlebot 抓、Google-Extended 管用途），两者都记以便对照
  ['Google-Extended', 'google-extended'], ['Googlebot', 'googlebot'],
  // Microsoft Copilot 的检索底座
  ['Bingbot', 'bingbot'],
  // 其他 AI 检索 / 数据抓取
  ['Amazonbot', 'amazonbot'], ['Applebot', 'applebot'], ['Bytespider', 'bytespider'],
  ['DuckAssistBot', 'duckassistbot'], ['MistralAI-User', 'mistralai'], ['cohere-ai', 'cohere-ai'],
  ['YandexBot', 'yandex'], ['CCBot', 'ccbot'], ['Meta-ExternalAgent', 'meta-external'],
  // 中国搜索与 AI 检索（2026-09-17 补）。为什么现在补:D1 现查显示中国已经是本站增长的
  // 那一半——四周里带来源真人从 0 涨到最近 14 天 60 次(同窗美国 63),其中 **cn.bing.com
  // 占中国来源的 77%**，而落地页 92 次里 90 次是中文页。既然一半的读者在中国，
  // 「百度/搜狗/神马/华为到底有没有来抓」就不该是一个查不到的问题——此前它们的 UA
  // 一个都不在表里，botOf() 返回空，中间件直接 return，**在库里完全不存在**。
  // 取词一律用**爬虫专属**词根,绝不用厂商名:`baidu` 会命中百度浏览器(baidubrowser)
  // 把真人记成爬虫，那正好是这张表最不能犯的错。词根写错的后果只是「仍然看不见」
  // (fail-safe)，永远不会变成一个错的数字。
  ['Baiduspider', 'baiduspider'], ['Sogou', 'sogou web spider'],
  ['360Spider', '360spider'], ['HaosouSpider', 'haosouspider'],
  ['PetalBot', 'petalbot'], ['YisouSpider', 'yisouspider'],
];

// 只对「内容资产」记账：页面、给 AI 读的清单、机器可读数据集。
// 静态图片/CSS/JS 不记——爬虫抓一次页面会顺带拉一堆附属资源，全记等于把一次访问放大成几十条。
//
// ⚠️ 2026-09-17 修复一个让这张表几乎无用的分类错误。原实现是**白名单**：
//   `/` 或以 `/` 结尾 → 记；否则必须匹配 `\.(html|txt|json|md|xml)$` 才记。
// 但本站的内容页是**无扩展名**路由（`/tools/grok`、`/en/c/coding`、`/vs/a-vs-b`、
// `/is-grok-still-free`），一条都不匹配。D1 现查坐实了后果：28 天里 ev='bot' 一共只有
// **23 个不同路径**，全是 `/`、`/en/`、`/vs/`、`/money/` 这类带斜杠的枢纽，加上
// sitemap.xml / robots.txt / llms.txt / feed.xml / limits.json —— **没有任何一个
// `/tools/<slug>` 或 `/c/<cat>`**。同窗真人落地页有 330 次，其中 **302 次（92%）落在
// 无扩展名路径上**，也就是这张表看不见的那一半。
//
// 为什么这件事卡住了流量决策：1,542 个页面里只有约 26 个拿到过搜索流量，而
// 「从没被抓过」与「抓了但排不上」的补救方向完全相反（前者是发现层，后者是内容）。
// 原实现让这两种情况在库里长得一模一样——又一次「把测量沉默当判定」。
//
// 改法与 check_adlabel 2026-09-04 那次同源：**白名单改黑名单**。白名单的失败模式是
// 「没被想到的形态永远不被检查，而报表照样说一切正常」；黑名单的失败模式只是多记，
// 那是看得见、也便宜的。
// isContentPath / botOf 额外导出，供 scripts/test-middleware-paths.mjs 零网络单测。
// Cloudflare Pages Functions 只认 onRequest* 导出，其余导出会被忽略——不影响运行时。
const ASSET_RE = /\.(css|m?js|map|png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|otf|eot|mp4|webm|mp3|pdf|zip|wasm)$/i;

export function isContentPath(p) {
  if (p.startsWith('/api/')) return false;   // 已由各 API 函数自行记账（ev='api'）
  if (ASSET_RE.test(p)) return false;        // 附属资源：一次页面抓取会顺带拉一堆
  return true;                                // 其余一律是内容，含无扩展名路由
}

export function botOf(ua) {
  const s = (ua || '').toLowerCase();
  if (!s) return '';
  for (const [name, needle] of AI_BOTS) if (s.includes(needle)) return name;
  return '';
}

// Markdown 镜像（build.mjs 末段生成,.html 换 .md）必须 noindex:HTML 页是 canonical
// 与引用面,镜像只喂 LLM/agent 上下文,进搜索索引就是重复内容稀释。
// limits.md / pricing.md 没有 HTML 孪生、本身就是正典数据文件,不在此列。
const CANONICAL_MD = new Set(['/limits.md', '/pricing.md']);

export async function onRequest(ctx) {
  let res = await ctx.next();
  try {
    const url = new URL(ctx.request.url);
    if (ctx.request.method !== 'GET' || !isContentPath(url.pathname)) return res;
    if (/\.md$/i.test(url.pathname) && !CANONICAL_MD.has(url.pathname)) {
      res = new Response(res.body, res);
      res.headers.set('X-Robots-Tag', 'noindex');
    }
    // 我方探针（scripts/ai-crawler-probe.mjs）每天伪装九家 UA 敲三个路径，
    // 记进去就等于每天给自己造几十条假抓取——而这张表存在的意义正是回答
    // 「AI 爬虫到底来没来」。自证数据必须挡在门外。
    if (url.searchParams.get('__probe') === '1') return res;
    // 只记成功响应。2026-08-15 审计发现：漏洞扫描器冒着 AI 爬虫的 UA 打凭据文件路径
    // （/@fs/…/credentials.json、/.openai/config.json 一类，全是 404），Google-Extended
    // 名下 64% 是假的——404 也入账等于让扫描器给我们的领先指标灌水。
    if (!res.ok) return res;
    const bot = botOf(ctx.request.headers.get('user-agent'));
    if (!bot || !ctx.env.HITS) return res;
    // lang 沿用站内约定：/en/ 前缀为英文版，根路径为中文版——
    // 「AI 爬虫更爱抓哪一边」直接决定内容投入往哪倾斜，所以这一列必须分得开。
    const lang = url.pathname.startsWith('/en/') ? 'en' : 'zh';
    const p = ctx.env.HITS
      .prepare('INSERT INTO hits (d, path, lang, country, ref, ev) VALUES (?,?,?,?,?,?)')
      .bind(new Date().toISOString().slice(0, 10), url.pathname.slice(0, 200), lang,
        (ctx.request.cf && ctx.request.cf.country) || '', bot, 'bot')
      .run().catch(() => {});
    if (ctx.waitUntil) ctx.waitUntil(p);
  } catch (e) { /* 统计永远不能影响页面 */ }
  return res;
}
