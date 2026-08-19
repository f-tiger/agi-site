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
];

// 只对「内容资产」记账：页面、给 AI 读的清单、机器可读数据集。
// 静态图片/CSS/JS 不记——爬虫抓一次页面会顺带拉一堆附属资源，全记等于把一次访问放大成几十条。
function isContentPath(p) {
  if (p.startsWith('/api/')) return false;                    // 已由各 API 函数自行记账
  if (p === '/' || p.endsWith('/')) return true;
  return /\.(html|txt|json|md|xml)$/i.test(p);
}

function botOf(ua) {
  const s = (ua || '').toLowerCase();
  if (!s) return '';
  for (const [name, needle] of AI_BOTS) if (s.includes(needle)) return name;
  return '';
}

export async function onRequest(ctx) {
  const res = await ctx.next();
  try {
    const url = new URL(ctx.request.url);
    if (ctx.request.method !== 'GET' || !isContentPath(url.pathname)) return res;
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
