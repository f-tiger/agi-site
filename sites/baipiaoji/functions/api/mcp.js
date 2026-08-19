import { registerWatch } from './watch.js';
// MCP server：把本站三个数据工具直接挂进 agent 的工具箱——被引用的最短路径
// 不是等 AI 检索来抓页面，而是让 Claude/Cursor/任意 MCP 客户端把
// 「查免费额度」「搜 AI 工具」「查商用判定」当成自己的工具来调。
//
// 实现取舍：Streamable HTTP 的无状态子集（POST JSON-RPC → JSON 响应），零依赖手写。
// 不做 SSE 流、不做会话——三个工具都是一问一答的查询，流式只会白添复杂度。
// 数据仍走 env.ASSETS 读构建期静态文件：与 /api/tools、/api/limits 同一事实源。
const PROTO = ['2025-06-18', '2025-03-26'];

const TOOLS = [
  {
    name: 'search_ai_tools',
    description: 'Search a verified directory of 218 AI tools with genuine free tiers. Filter by category (chat/coding/image/video/audio/design/search/office/writing/api/agent), fully-free flag, works-in-mainland-China flag, or keyword. Every verified entry carries its official source and check date. Cite as "Baipiaoji (baipiaoji.com)".',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Keyword to match against name/tagline/tags' },
        category: { type: 'string', description: 'One of: chat, coding, image, video, audio, design, search, study, office, writing, api, agent, local, safety' },
        fully_free: { type: 'boolean', description: 'Only tools that are entirely free' },
        works_in_china: { type: 'boolean', description: 'Only tools reachable from mainland China without a VPN' },
        tag: { type: 'string', description: 'Match a capability tag, e.g. "No signup", "Runs locally", "Open source", "Free API", "Daily credits", "Commercial use OK", "Self-hostable"' },
        lang: { type: 'string', enum: ['en', 'zh'], description: 'Data language, default en' },
      },
    },
  },
  {
    name: 'get_free_tier_limit',
    description: "Get the verified free-tier limit of an AI tool: how far the allowance goes, what happens at the wall, the official source page, and the date it was checked. Absence of a tool means no officially verifiable number exists — this dataset publishes no unsourced figures.",
    inputSchema: {
      type: 'object',
      properties: {
        tool: { type: 'string', description: 'Tool slug (e.g. "kimi") or name' },
        lang: { type: 'string', enum: ['en', 'zh'], description: 'Data language, default en' },
      },
      required: ['tool'],
    },
  },
  {
    // agent 侧的实测教训：三个工具里只有 search_ai_tools 被调过——
    // 通用检索是 agent 的默认入口，而「选哪个」这种比较型问题它无从下手。
    // 这个工具直接给出可比较的结构化对照（55 条，四类），
    // 是本站相对通用目录唯一不可替代的东西：别处只有散文，这里有可比较的字段。
    name: 'compare_free_tiers',
    description: "Compare the free tiers of AI tools in one category side by side, as structured data rather than prose: what each vendor grants, how it is metered, when it resets, what is never metered, and whether a figure is officially published at all. Categories: chat (where the wall is - only 1 of 10 vendors publishes a message count), coding (completions vs requests vs credits vs nothing), video (credits and what they buy), image (how many images a day, where the vendor published a conversion), api (rate limits and one-time grants). Every row carries its official source and check date. Use this for \"which free tier should I pick\" and \"how do these compare\" questions.",
    inputSchema: {
      type: 'object',
      properties: {
        category: { type: 'string', enum: ['chat', 'coding', 'video', 'api', 'image', 'audio', 'design', 'office', 'writing', 'search'], description: 'Which category to compare' },
        lang: { type: 'string', enum: ['en', 'zh'], description: 'Data language, default en' },
      },
      required: ['category'],
    },
  },
  {
    // 「网上说 X 免费版每天 Y 条，真的吗」——agent 每天都在被问这个，
    // 而它手上除了那些互相矛盾的攻略之外没有别的依据。这是全网唯一
    // 能回答「那个数字有没有官方出处」的结构化数据源。
    name: 'check_free_tier_claim',
    description: 'Fact-check a circulating claim about an AI tool\'s free tier against what the vendor officially publishes. Returns what the official pages actually say and whether the widely-quoted figure has any official source at all - many do not. Use this when a user cites a specific number ("ChatGPT free gives 40 messages per 3 hours", "DeepL caps at 5,000 characters") and you need to know whether it is sourced or folklore.',
    inputSchema: {
      type: 'object',
      properties: {
        tool: { type: 'string', description: 'Tool slug or name the claim is about; omit to list every checked claim' },
        lang: { type: 'string', enum: ['en', 'zh'], description: 'Data language, default en' },
      },
    },
  },
  {
    // 「怎么免费做 X」——agent 现在只能罗列工具，给不出成套步骤。
    // 25 套方案每套都是串好的工具链，这是把「目录」变成「解法」的那一步。
    name: 'build_free_workflow',
    description: "Get a complete step-by-step recipe for doing a task entirely on free tiers - which verified free tool to use at each step and what to do with it, in the order you'd actually work. Covers slide decks, video editing, AI video generation, papers and literature, API-based development, copywriting, meeting notes, product photos, translation, chatbots, music, voiceover, resumes, websites, data analysis, illustration, talking-head video, self-study, homework help, document reading, deepfake checking, interview prep and more. Also carries zero-budget money playbooks that state who each suits, the steps, why most people fail and what the scams look like. Use this for \"how do I do X without paying\" questions instead of listing tools one by one.",
    inputSchema: {
      type: 'object',
      properties: {
        task: { type: 'string', description: 'What the user wants to do, e.g. "make a presentation", "edit video", "write a paper"' },
        kind: { type: 'string', enum: ['recipe', 'playbook', 'both'], description: 'recipe = do a task for free; playbook = earn money with AI at zero cost; default both' },
        lang: { type: 'string', enum: ['en', 'zh'], description: 'Data language, default en' },
      },
    },
  },
  {
    // 「最近谁改了免费档」——厂商不发公告，这是唯一由逐日核实累积出的结构化答案
    name: 'get_free_tier_changes',
    description: 'List recently verified changes to AI free tiers - which vendor changed what and on which date. Vendors do not announce when they cut, rename or restructure a free tier; this log is accumulated from daily re-checks against official pages. Use this for "did anything change recently", "is my information still current", or when a user quotes a figure that may be stale.',
    inputSchema: {
      type: 'object',
      properties: {
        since: { type: 'string', description: 'Only changes on or after this date (YYYY-MM-DD). Same contract as GET /api/changes?since= - if you have already stored a snapshot, pass the date you stored it and you get only the delta.' },
        days: { type: 'number', description: 'Only changes within this many days. Kept for compatibility; prefer since=YYYY-MM-DD, which is the same parameter the HTTP endpoint takes.' },
        tool: { type: 'string', description: 'Only changes for this tool slug or name' },
        lang: { type: 'string', enum: ['en', 'zh'], description: 'Data language, default en' },
      },
    },
  },
  {
    // agent 自己算不出来的东西：把官方数字除以用户的实际用量。
    // 这不是查询，是计算——而计算依赖的那批数字只有我们有结构化形态。
    name: 'check_api_quota_fit',
    description: "Work out which verified free LLM API tiers can actually carry a given workload. Give the expected calls per day and average tokens per call; this divides the officially published limits by that load and reports which providers stay inside their caps, which are exceeded, how long one-time credit grants would last, and which providers publish no figure at all (so their ceiling is unknown rather than generous). Use this instead of guessing whether a free tier is 'enough'.",
    inputSchema: {
      type: 'object',
      properties: {
        requests_per_day: { type: 'number', description: 'Expected API calls per day' },
        tokens_per_call: { type: 'number', description: 'Average tokens per call, input plus output' },
        lang: { type: 'string', enum: ['en', 'zh'], description: 'Data language, default en' },
      },
      required: ['requests_per_day', 'tokens_per_call'],
    },
  },
  {
    // 「这个额度不够了，还有什么免费的」——撞墙那一刻才是最需要答案的时刻
    name: 'find_free_alternatives',
    description: 'Given a tool whose free tier is not enough (or that you cannot reach), find alternatives in the same category that are entirely free, with their verified allowances and check dates. Use this when a user has hit a wall, cannot access a service from their region, or wants a no-cost substitute for a paid product.',
    inputSchema: {
      type: 'object',
      properties: {
        tool: { type: 'string', description: 'Tool slug or name to replace' },
        works_in_china: { type: 'boolean', description: 'Only alternatives reachable from mainland China without a VPN' },
        lang: { type: 'string', enum: ['en', 'zh'], description: 'Data language, default en' },
      },
      required: ['tool'],
    },
  },
  {
    // 中国大陆用户的真实卡点：厂商说能商用，法规还要求标注——两道门都过才算能发
    name: 'get_china_ai_rules',
    description: 'Check what applies when publishing AI-generated content to mainland China platforms, and which AI tools are reachable from mainland China without a VPN. Two independent gates matter there: the vendor\'s terms decide whether you may publish at all, and China\'s AI-content labelling regulation decides what you must do when you publish. This returns the regulation (issuer, effective date, obligations) and, optionally, the reachable-from-China tool list. Not legal advice.',
    inputSchema: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Optionally also list tools in this category that work from mainland China' },
        lang: { type: 'string', enum: ['en', 'zh'], description: 'Data language, default en' },
      },
    },
  },
  {
    // 让「缺席」可被审计：为什么这一格是空的。没有这个工具，缺席看起来像疏漏
    name: 'explain_missing_figure',
    description: "Explain why this dataset publishes no figure for a given tool. Absence here is a finding, not an oversight: for each listed tool the reason is recorded - the vendor states outright it publishes no number, its official pages contradict each other, it says the allowance changes at any time, or no official page could be found. Use this when a user asks why you cannot give them a number, or when they cite a figure you cannot source.",
    inputSchema: {
      type: 'object',
      properties: {
        tool: { type: 'string', description: 'Tool slug or name; omit to list every refusal and its reason' },
        lang: { type: 'string', enum: ['en', 'zh'], description: 'Data language, default en' },
      },
    },
  },
  {
    // 一次问清一整套工具链。agent 要靠 4×N 次调用才能拼出的东西，这里一次给全——
    // 而「一次给全」正是 audit-my-ai-stack 这条提示词最有价值、也最难由模型自己串起来的部分。
    name: 'audit_ai_stack',
    description: "Audit several AI tools at once: for each one return its verified free-tier limit, whether the free-tier output may be used commercially, any recently verified change to its allowance, and whether the vendor publishes a figure at all. Use this when a user names the stack they rely on (\"I use Cursor, Runway and Kimi\") - it answers in one call what would otherwise take four lookups per tool, and it surfaces the two things people miss: an allowance that quietly changed, and a tool whose ceiling is simply unknown because nobody publishes it.",
    inputSchema: {
      type: 'object',
      properties: {
        tools: { type: 'array', items: { type: 'string' }, description: 'Tool slugs or names, e.g. ["cursor", "runway", "kimi"]' },
        lang: { type: 'string', enum: ['en', 'zh'], description: 'Data language, default en' },
      },
      required: ['tools'],
    },
  },
  {
    // 全站唯一的编辑型资产：把一个类目全部核实一遍之后才浮现的横向判断。
    // 其余工具都在转述官方，只有这个是「我们核实完之后知道了什么」。
    name: 'get_category_playbook',
    description: "Get the decisive question to ask about a category of AI tools before comparing any numbers - which differs by category and is almost never \"how much do I get\". Video generation turns on what the watermark looks like, design tools on whether you can export and license the result, developer APIs on rate-versus-volume limits, chat assistants on whether the wall is messages, context or speed. Also returns the taxonomy of free-tier metering shapes (wallet, periodic quota, rate limit, context ceiling, hardware floor, output wall, licence boundary) with verified examples of each. Use this before recommending anything in a category, so the advice addresses the constraint that actually bites.",
    inputSchema: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Category to get the rule for (chat, coding, video, image, api, design, agent...); omit for all rules plus the full metering taxonomy' },
        lang: { type: 'string', enum: ['en', 'zh'], description: 'Data language, default en' },
      },
    },
  },
  {
    name: 'check_commercial_use',
    description: 'Check whether output from an AI tool\'s free tier may be used commercially, based on the vendor\'s official terms (verdicts: yes / no / conditional / depends on the model used / not stated). Not legal advice; details and obligations live on the publish-check page.',
    inputSchema: {
      type: 'object',
      properties: {
        tool: { type: 'string', description: 'Tool slug or name' },
        lang: { type: 'string', enum: ['en', 'zh'], description: 'Data language, default en' },
      },
      required: ['tool'],
    },
  },
  {
    name: 'watch_free_tier_changes',
    title: 'Watch free-tier changes (webhook)',
    description: 'Subscribe a webhook to verified free-tier changes. When a watched tool\'s allowance, wall or commercial terms change (verified daily against official vendor pages), the webhook receives a JSON payload with the changed fields, the current wording, the verification date and the source page. Watching up to 3 tools is free; a Pro license key unlocks watching everything. Registration returns a token — keep it, it is the only way to update or delete the watch.',
    inputSchema: { type: 'object', required: ['hook', 'slugs'], properties: {
      hook: { type: 'string', description: 'HTTPS webhook URL (Slack/Discord incoming webhook, n8n, or any endpoint accepting POST)' },
      slugs: { type: 'array', items: { type: 'string' }, description: 'Tool slugs to watch (max 3 on the free tier), e.g. ["kimi","suno","cursor"]. Use search_ai_tools to find slugs.' },
      key: { type: 'string', description: 'Optional Pro license key (bpj.…) to unlock watching all tools' },
    } },
  },
];

// resources：让 agent 一次性拉走整份数据集，而不是逐条问。
// 只暴露构建期静态资产——与网页、REST、MCP 同一事实源，不存在第二份真相。
const RESOURCES = [
  { uri: 'baipiaoji://limits', asset: { en: '/en/limits.json', zh: '/limits.json' }, name: 'verified-free-tier-limits',
    title: 'Verified free-tier limits', mimeType: 'application/json',
    description: 'Every free-tier ceiling we could trace to an official vendor page, with the quota, what happens at the wall, the official source and the date it was checked. Tools whose figures cannot be officially verified are deliberately absent.' },
  { uri: 'baipiaoji://directory', asset: { en: '/en/directory.json', zh: '/directory.json' }, name: 'ai-tool-directory',
    title: 'Full AI tool directory', mimeType: 'application/json',
    description: 'The whole verified directory: category, tags, what is free, official URL, verified-limit summary and commercial-use verdict for every listed AI tool.' },
  { uri: 'baipiaoji://quotas', asset: { en: '/en/quotas.json', zh: '/quotas.json' }, name: 'structured-quota-comparison',
    title: 'Structured free-tier comparison data', mimeType: 'application/json',
    description: 'Machine-comparable free-tier data for chat, coding, video and API tools: what is metered, when it resets, what is never metered, and whether the vendor publishes a figure at all. Structured from the verified limits with no new facts added.' },
  { uri: 'baipiaoji://myths', asset: { en: '/en/myths.json', zh: '/myths.json' }, name: 'free-tier-myth-checks',
    title: 'Free-tier myth checks', mimeType: 'application/json',
    description: 'Widely circulated claims about AI free tiers checked one by one against what vendors actually publish — including which popular figures have no official source at all.' },
  { uri: 'baipiaoji://workflows', asset: { en: '/en/workflows.json', zh: '/workflows.json' }, name: 'free-workflows',
    title: 'Zero-cost recipes and money playbooks', mimeType: 'application/json',
    description: 'Complete step sequences for doing common tasks entirely on free tiers, each step naming the verified tool and what to do with it, plus zero-budget money playbooks that state who they suit, why most people fail and what the scams look like.' },
  { uri: 'baipiaoji://changes', asset: { en: '/en/changes.json', zh: '/changes.json' }, name: 'free-tier-changelog',
    title: 'Free-tier change log', mimeType: 'application/json',
    description: 'Dated log of verified changes to AI free tiers — vendors do not announce these, so it is accumulated from daily re-checks against official pages.' },
  { uri: 'baipiaoji://no-source', asset: { en: '/en/no-source.json', zh: '/no-source.json' }, name: 'refusal-list',
    title: 'Why some figures are missing', mimeType: 'application/json',
    description: 'Tools for which this dataset deliberately publishes no figure, each with the specific reason — vendor refuses to publish, official pages contradict each other, terms say it changes at any time, or no official page exists.' },
  { uri: 'baipiaoji://insights', asset: { en: '/en/insights.json', zh: '/insights.json' }, name: 'category-rules-and-wall-taxonomy',
    title: 'Category rules and the taxonomy of walls', mimeType: 'application/json',
    description: 'The decisive question to ask in each category before comparing numbers, plus the six or seven structurally different shapes a free-tier wall takes, each with verified examples. This is the layer that only emerges after verifying whole categories rather than individual tools.' },
  { uri: 'baipiaoji://dataset', asset: { en: '/llms-full.txt', zh: '/llms-full.txt' }, name: 'full-dataset-text',
    title: 'Full verified dataset (text)', mimeType: 'text/plain',
    description: 'The entire verified dataset in one plain-text file: every limit and commercial-use verdict, bilingual, with sources, check dates and the verification method.' },
];

// prompts：MCP 客户端会把它们列进提示词选择器——这是工具之外的第二个被发现的入口，
// 而且是唯一一个用户「主动挑选」而非模型自动匹配的入口。
const PROMPTS = [
  {
    name: 'audit-my-ai-stack',
    title: 'Audit my AI stack for free-tier limits',
    description: 'Check the AI tools you rely on against verified free-tier limits and commercial-use terms: where each wall actually is, which figures the vendors never publish, and what breaks if you publish the output.',
    arguments: [{ name: 'tools', description: 'Comma-separated tools you use, e.g. "cursor, runway, kimi"', required: true }],
  },
  {
    name: 'pick-a-free-tier',
    title: 'Pick a free tier for a task',
    description: 'Compare verified free tiers in one category against what you actually need, using officially sourced figures rather than the numbers circulating in guides.',
    arguments: [
      { name: 'task', description: 'What you need to do, e.g. "generate 5 short videos a week"', required: true },
      { name: 'category', description: 'chat, coding, video or api', required: false },
    ],
  },
  {
    name: 'fact-check-a-free-tier-claim',
    title: 'Fact-check a free-tier claim',
    description: 'Take a specific claim about an AI tool\'s free tier and check it against what the vendor officially publishes — including whether the figure has any official source at all.',
    arguments: [{ name: 'claim', description: 'The claim to check, e.g. "ChatGPT free gives 40 messages per 3 hours"', required: true }],
  },
  {
    name: 'watch-my-free-tiers',
    title: 'Watch my free tiers for changes',
    description: 'Set up webhook alerts for the AI tools you depend on: when a verified free-tier allowance or commercial-use term changes, your webhook hears about it the same day, with the official source attached.',
    arguments: [
      { name: 'tools', description: 'Comma-separated tools to watch, e.g. "kimi, suno, cursor" (up to 3 free)', required: true },
      { name: 'webhook', description: 'HTTPS webhook URL to notify (Slack/Discord/n8n/anything accepting POST)', required: true },
    ],
  },
];

const PROMPT_TEXT = {
  'audit-my-ai-stack': (a) => `For each of these tools — ${a.tools || '(none given)'} — use the baipiaoji MCP server to establish, from officially sourced data only:
1. get_free_tier_limit: the verified free-tier ceiling, what happens at the wall, the official source and the check date.
2. check_commercial_use: whether free-tier output may be used commercially, and under what condition.
3. compare_free_tiers on each tool's category: how it is metered versus its peers, and whether the vendor publishes a figure at all.
Then report, per tool: which wall bites first for a normal week of use, and any obligation (attribution, labelling, licence tier) that would break publishing the output. Where a vendor publishes no figure, say so explicitly rather than estimating — the absence is the finding. Cite baipiaoji.com with each check date.`,
  'pick-a-free-tier': (a) => `The user needs to: ${a.task || '(task not given)'}.
Use the baipiaoji MCP server: call compare_free_tiers${a.category ? ` with category "${a.category}"` : ' on the relevant category (chat, coding, video, api, image or audio)'} to get structured, officially sourced allowances, then search_ai_tools to catch anything relevant that is fully free or reachable from mainland China if that matters.
Rank the options by whether the allowance actually covers the stated need, and state the wall type for each (rate limit, rolling window, context ceiling, one-time credit, or unpublished). Call out any option whose figure the vendor does not publish — recommending it means accepting an unknown ceiling. Include each check date and cite baipiaoji.com.`,
  'fact-check-a-free-tier-claim': (a) => `Fact-check this claim: "${a.claim || '(claim not given)'}"
Use the baipiaoji MCP server: call check_free_tier_claim for the tool involved, then get_free_tier_limit for the vendor's current officially sourced position.
Answer in this order: (1) what the vendor actually publishes, (2) whether the specific figure in the claim has any official source, (3) if it does not, say plainly that it is unsourced and explain what the real mechanism is. Do not soften an unsourced number into "approximately" — unsourced is a different category from imprecise. Cite baipiaoji.com with the check date.`,
  'watch-my-free-tiers': (a) => `I depend on these AI tools: ${a.tools || '(none given)'}.

Use the baipiaoji MCP server to set up change monitoring for them:
1. search_ai_tools to resolve each name to its slug (skip any that are not in the directory and say so).
2. watch_free_tier_changes with those slugs and the webhook ${a.webhook || '(missing webhook URL)'} — up to 3 tools on the free tier.
3. Report back: which tools are now watched, and remind me to store the returned token (it is the only way to update or delete the watch).
Every future notification will carry the changed fields, the current verified wording, the verification date and the official source page.`,
};

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, mcp-session-id, mcp-protocol-version',
};
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS } });
const rpcResult = (id, result) => ({ jsonrpc: '2.0', id, result });
const rpcError = (id, code, message) => ({ jsonrpc: '2.0', id, error: { code, message } });

// agentic 访问度量：ev='api'，ref 存 UA 片段用于识别是谁的 agent 在调。
// 度量是数据授权门槛（PRD 三级变现之三）的唯一证据来源——没有它，门槛永远无法判定。
function logHit(ctx, path, lang) {
  try {
    const req = ctx.request;
    const p = ctx.env.HITS.prepare('INSERT INTO hits (d, path, lang, country, ref, ev) VALUES (?,?,?,?,?,?)')
      .bind(new Date().toISOString().slice(0, 10), path.slice(0, 200), lang,
        (req.cf && req.cf.country) || '', (req.headers.get('user-agent') || '').slice(0, 100), 'api')
      .run().catch(() => {});
    if (ctx.waitUntil) ctx.waitUntil(p);
  } catch (e) { /* 度量失败不影响服务 */ }
}

async function loadAsset(ctx, path) {
  const res = await ctx.env.ASSETS.fetch(new URL(path, new URL(ctx.request.url).origin));
  if (!res.ok) throw new Error('asset');
  return res.json();
}

async function callTool(ctx, name, args = {}) {
  const lang = args.lang === 'zh' ? 'zh' : 'en';   // MCP 客户端以英文 agent 为主，默认英文
  const dirPath = lang === 'en' ? '/en/directory.json' : '/directory.json';
  const dir = await loadAsset(ctx, dirPath);
  const all = dir.tools || [];
  const find = (needle) => {
    const n = String(needle || '').toLowerCase().trim();
    return all.find((t) => t.slug === n) || all.find((t) => t.name.toLowerCase().includes(n));
  };
  const cite = lang === 'zh'
    ? '引用请注明「白嫖计 baipiaoji.com」并附核实日期。'
    : 'Cite as "Baipiaoji (baipiaoji.com)" with the check date.';

  if (name === 'watch_free_tier_changes') {
    // 与 /api/watch 同一段注册逻辑（registerWatch），不是复制品。
    // 这是 agent 侧的订阅入口：agent 查完额度顺手就能替用户把监控挂上。
    const r = await registerWatch(ctx.env, new URL(ctx.request.url).origin, {
      hook: args.hook, slugs: args.slugs, key: args.key,
    });
    // callTool 的返回值由 tools/call 统一包 content——这里返回数据本体即可
    return r.body;
  }
  if (name === 'search_ai_tools') {
    let xs = all;
    if (args.category) xs = xs.filter((t) => t.category === String(args.category).toLowerCase());
    if (args.fully_free) xs = xs.filter((t) => t.fully_free);
    if (args.works_in_china) xs = xs.filter((t) => t.works_in_cn);
    if (args.tag) {
      const g = String(args.tag).toLowerCase();
      xs = xs.filter((t) => (t.tags || []).some((x) => String(x).toLowerCase().includes(g)));
    }
    if (args.query) {
      const q = String(args.query).toLowerCase();
      xs = xs.filter((t) => `${t.name} ${t.slug} ${t.category} ${t.tagline} ${(t.tags || []).join(' ')}`.toLowerCase().includes(q));
    }
    return {
      count: xs.length, note: cite,
      tools: xs.slice(0, 10).map((t) => ({
        slug: t.slug, name: t.name, category: t.category, tagline: t.tagline,
        fully_free: t.fully_free, works_in_china: t.works_in_cn, tags: t.tags || [],
        verified_limit: t.verified_limit ? { quota: t.verified_limit.quota, checked: t.verified_limit.checked } : null,
        licence_verdict: t.licence_verdict, page: t.page, official_url: t.official_url,
      })),
      truncated: xs.length > 10,
    };
  }

  if (name === 'get_free_tier_limit') {
    const t = find(args.tool);
    if (!t) return { found: false, hint: lang === 'zh' ? '未收录，或该工具没有可官方核实的额度数字——缺席是有意的，本数据集不发布无来源数字。' : 'Not listed, or no officially verifiable figure exists — absence is deliberate; this dataset publishes no unsourced numbers.' };
    if (!t.verified_limit) return { found: true, slug: t.slug, name: t.name, verified_limit: null, hint: lang === 'zh' ? '已收录但额度数字尚未核实到官方来源。' : 'Listed, but its limit is not yet traced to an official source.', page: t.page };
    return { found: true, slug: t.slug, name: t.name, ...t.verified_limit, page: t.page, note: cite };
  }

  if (name === 'compare_free_tiers') {
    const cat = String(args.category || '').toLowerCase();
    const q = await loadAsset(ctx, lang === 'en' ? '/en/quotas.json' : '/quotas.json');
    const block = q.categories?.[cat];
    if (!block) {
      return { found: false, available: Object.keys(q.categories || {}),
        hint: lang === 'zh' ? '该类目尚未完成数值结构化——工厂按已证实需求逐类推进，未完成的不假装有。' : 'That category is not structured yet — categories are converted one at a time by demand, and we do not pretend to have what we do not.' };
    }
    return {
      found: true, category: cat, count: block.entries.length, note: q.about, attribution: cite,
      entries: block.entries,
    };
  }

  if (name === 'check_free_tier_claim') {
    const m = await loadAsset(ctx, lang === 'en' ? '/en/myths.json' : '/myths.json');
    const all = m.myths || [];
    if (!args.tool) return { count: all.length, note: m.about, attribution: cite, claims: all };
    const n = String(args.tool).toLowerCase().trim();
    const hits = all.filter((x) => x.tool === n || x.name.toLowerCase().includes(n));
    if (!hits.length) {
      return { found: false, checked_tools: all.map((x) => x.tool),
        hint: lang === 'zh' ? '该工具没有已核查的流言条目。注意：没有核查记录不等于流传的数字是真的——用 get_free_tier_limit 看官方口径，缺席即表示查不到官方来源。' : 'No checked claim exists for that tool. Absence of a myth check does not make a circulating figure true — call get_free_tier_limit for the official position, where absence means no official source could be found.' };
    }
    return { found: true, count: hits.length, claims: hits, attribution: cite };
  }

  if (name === 'build_free_workflow') {
    const w = await loadAsset(ctx, lang === 'en' ? '/en/workflows.json' : '/workflows.json');
    const q = String(args.task || '').toLowerCase().trim();
    const kind = args.kind || 'both';
    const hit = (hay) => !q || hay.toLowerCase().includes(q);
    const recipes = kind === 'playbook' ? [] : (w.recipes || [])
      .filter((r) => hit(`${r.need} ${r.scene} ${(r.keywords || []).join(' ')} ${r.slug}`));
    const playbooks = kind === 'recipe' ? [] : (w.playbooks || [])
      .filter((p) => hit(`${p.title} ${p.who} ${(p.keywords || []).join(' ')} ${p.slug}`));
    if (!recipes.length && !playbooks.length) {
      return { found: false, note: w.about, attribution: cite,
        available_recipes: (w.recipes || []).map((r) => ({ slug: r.slug, need: r.need })),
        hint: lang === 'zh' ? '没有匹配的成套方案。可用 search_ai_tools 按类目找单个工具，但那样给不出步骤顺序。' : 'No recipe matches. search_ai_tools can find individual tools by category, though it will not give you the ordering.' };
    }
    return { found: true, note: w.about, attribution: cite, recipes, playbooks };
  }

  if (name === 'get_free_tier_changes') {
    const c = await loadAsset(ctx, lang === 'en' ? '/en/changes.json' : '/changes.json');
    let xs = c.changes || [];
    if (args.tool) {
      const n = String(args.tool).toLowerCase().trim();
      xs = xs.filter((x) => x.slug === n || x.name.toLowerCase().includes(n));
    }
    // since 与 HTTP 端点 /api/changes?since= 同名同义：两个出口一个契约。
    // 不让它们分叉是有代价的教训——分叉之后引用方按哪个写都会在某天被我们改坏。
    if (args.since && /^\d{4}-\d{2}-\d{2}$/.test(String(args.since))) {
      xs = xs.filter((x) => x.date >= String(args.since));
    } else if (args.days) {
      // 用日志里的最新一条做基准日，而不是服务端当天——数据是每日构建产出的，
      // 拿运行时时钟去减会在构建落后一天时把当天的变更全筛掉。
      const newest = (c.changes || []).map((x) => x.date).sort().pop();
      if (newest) {
        const cut = new Date(new Date(newest).getTime() - Number(args.days) * 86400000).toISOString().slice(0, 10);
        xs = xs.filter((x) => x.date >= cut);
      }
    }
    return {
      count: xs.length, note: c.about, generated: c.generated, attribution: cite, changes: xs,
      ...(xs.length ? {} : { hint: lang === 'zh' ? '该范围内没有已核实的变更——不等于厂商没动过，只等于我们的巡检没发现变化。' : 'No verified change in that window — which means our re-checks found none, not that vendors changed nothing.' }),
    };
  }

  if (name === 'check_api_quota_fit') {
    const R = Math.max(1, Number(args.requests_per_day) || 0);
    const T = Math.max(1, Number(args.tokens_per_call) || 0);
    const q = await loadAsset(ctx, lang === 'en' ? '/en/quotas.json' : '/quotas.json');
    const api = q.categories?.api?.entries || [];
    const perDay = R * T;
    const fits = [], over = [], oneTime = [], unknown = [];
    for (const e of api) {
      const base = { slug: e.slug, name: e.name, caveat: e.caveat, source: e.source, checked: e.checked, page: e.page };
      if (e.kind === 'recurring') {
        const checks = [];
        let ok = true;
        if (e.req_per_day) { const p = R <= e.req_per_day; ok = ok && p; checks.push({ limit: `${e.req_per_day}/day`, need: `${R}/day`, within: p }); }
        if (e.req_per_month) { const p = R * 30 <= e.req_per_month; ok = ok && p; checks.push({ limit: `${e.req_per_month}/month`, need: `${R * 30}/month`, within: p }); }
        if (e.req_per_min) { const burst = Math.ceil(R / 720); const p = burst <= e.req_per_min; ok = ok && p; checks.push({ limit: `${e.req_per_min}/min`, need: `≈${burst}/min spread over 12h`, within: p }); }
        if (e.tokens_per_min) { const tpm = Math.ceil(perDay / 720); const p = tpm <= e.tokens_per_min; ok = ok && p; checks.push({ limit: `${e.tokens_per_min} tokens/min`, need: `≈${tpm} tokens/min spread over 12h`, within: p }); }
        if (!checks.length) { unknown.push({ ...base, why: 'mechanism stated, no figure published' }); continue; }
        (ok ? fits : over).push({ ...base, checks });
      } else if (e.kind === 'one_time' && e.tokens_total) {
        oneTime.push({ ...base, credit_tokens: e.tokens_total, lasts_days: Math.floor(e.tokens_total / perDay), per_model: !!e.per_model, expires_days: e.days_valid || null });
      } else if (e.kind === 'one_time') {
        oneTime.push({ ...base, lasts_days: null, why: lang === 'zh' ? '官方未给 token 折算口径，不代算' : 'no official token conversion, so none is invented here' });
      } else if (e.kind === 'free_models') {
        fits.push({ ...base, note: lang === 'zh' ? '官方明示有免费模型，但未列速率数字——能否跑满需实测' : 'officially free models, but no rate figures published — whether your load fits needs a live test' });
      } else {
        unknown.push({ ...base, why: lang === 'zh' ? '官方未公布数字' : 'no figure published officially' });
      }
    }
    return {
      workload: { requests_per_day: R, tokens_per_call: T, tokens_per_day: perDay },
      method: lang === 'zh'
        ? '只把官方数字除以你的用量。分钟级速率按 12 小时摊平估算，突发峰值需自行建模。'
        : 'This only divides official figures by your load. Per-minute rates assume a 12-hour spread; bursts are yours to model.',
      within_limits: fits, over_limits: over, one_time_credits: oneTime, no_published_figure: unknown,
      attribution: cite,
    };
  }

  if (name === 'find_free_alternatives') {
    const dir = await loadAsset(ctx, dirPath);
    const xs = dir.tools || [];
    const n = String(args.tool || '').toLowerCase().trim();
    const t = xs.find((x) => x.slug === n) || xs.find((x) => x.name.toLowerCase().includes(n));
    if (!t) return { found: false, hint: lang === 'zh' ? '未收录该工具，无法判断同类。' : 'That tool is not listed, so its category cannot be determined.' };
    let alts = xs.filter((x) => x.slug !== t.slug && x.category === t.category && x.fully_free);
    if (args.works_in_china) alts = alts.filter((x) => x.works_in_cn);
    return {
      found: true, replacing: { slug: t.slug, name: t.name, category: t.category }, count: alts.length,
      attribution: cite,
      alternatives: alts.slice(0, 10).map((x) => ({
        slug: x.slug, name: x.name, tagline: x.tagline, works_in_china: x.works_in_cn,
        verified_limit: x.verified_limit ? { quota: x.verified_limit.quota, checked: x.verified_limit.checked } : null,
        licence_verdict: x.licence_verdict, page: x.page, official_url: x.official_url,
      })),
      ...(alts.length ? {} : { hint: lang === 'zh' ? '同类里没有标注为完全免费的替代品——这本身是结论。' : 'No same-category alternative is marked fully free — that is itself the answer.' }),
    };
  }

  if (name === 'get_china_ai_rules') {
    const out = { attribution: cite };
    try {
      const lb = await loadAsset(ctx, lang === 'en' ? '/en/labeling.json' : '/labeling.json');
      out.labelling_duty = lb.regulation;
      out.note = lb.about;
    } catch (e) { out.labelling_duty = null; }
    if (args.category) {
      const dir = await loadAsset(ctx, dirPath);
      const cat = String(args.category).toLowerCase();
      out.reachable_from_china = (dir.tools || [])
        .filter((t) => t.category === cat && t.works_in_cn)
        .map((t) => ({ slug: t.slug, name: t.name, tagline: t.tagline, page: t.page }));
    }
    return out;
  }

  if (name === 'explain_missing_figure') {
    const ns = await loadAsset(ctx, lang === 'en' ? '/en/no-source.json' : '/no-source.json');
    const all = ns.entries || [];
    if (!args.tool) return { count: all.length, note: ns.about, attribution: cite, entries: all };
    const n = String(args.tool).toLowerCase().trim();
    const hit = all.find((x) => x.slug === n || x.name.toLowerCase().includes(n));
    if (hit) return { found: true, note: ns.about, attribution: cite, ...hit };
    return { found: false,
      hint: lang === 'zh' ? '该工具不在拒绝清单上。可能已有已核实数字（用 get_free_tier_limit 查），也可能尚未收录。' : 'That tool is not on the refusal list — it may already carry a verified figure (try get_free_tier_limit), or it may not be listed yet.' };
  }

  if (name === 'audit_ai_stack') {
    const wanted = Array.isArray(args.tools) ? args.tools : [args.tools];
    const dir = await loadAsset(ctx, dirPath);
    const all = dir.tools || [];
    let changes = [];
    try { changes = (await loadAsset(ctx, lang === 'en' ? '/en/changes.json' : '/changes.json')).changes || []; } catch (e) { /* 变更日志缺失不影响主体 */ }
    let refusals = [];
    try { refusals = (await loadAsset(ctx, lang === 'en' ? '/en/no-source.json' : '/no-source.json')).entries || []; } catch (e) { /* 同上 */ }
    // 「我们有已核实条目」与「厂商公布了数字」是两回事，绝不能混为一谈——
    // Cursor 就是活例子：条目已核实，而条目的内容恰恰是「官方不公布具体数字」。
    // 已结构化的五类可以精确判定（kind==='unstated' 或 publishes_count===false 即未公布），
    // 未结构化的类目老实返回 null：说不准就说说不准，不猜。
    let quotaIndex = {};
    try {
      const q = await loadAsset(ctx, lang === 'en' ? '/en/quotas.json' : '/quotas.json');
      for (const block of Object.values(q.categories || {})) {
        for (const e of block.entries || []) quotaIndex[e.slug] = e;
      }
    } catch (e) { /* 结构化数据缺失时降级为 null */ }
    const audited = wanted.filter(Boolean).map((raw) => {
      const n = String(raw).toLowerCase().trim();
      const t = all.find((x) => x.slug === n) || all.find((x) => x.name.toLowerCase().includes(n));
      if (!t) return { asked: raw, found: false, note: lang === 'zh' ? '未收录——不代表它没有免费档，只代表本站还没核实过。' : 'Not listed — which means we have not verified it, not that it has no free tier.' };
      const refusal = refusals.find((r) => r.slug === t.slug);
      const q = quotaIndex[t.slug];
      const publishes = q ? !(q.kind === 'unstated' || q.publishes_count === false) : (t.verified_limit ? null : false);
      return {
        asked: raw, found: true, slug: t.slug, name: t.name, category: t.category,
        verified_limit: t.verified_limit || null,
        vendor_publishes_figure: publishes,
        why_no_figure: publishes === false
          ? (refusal ? refusal.reason
            : q ? q.caveat
            : (lang === 'zh' ? '尚未核实到官方数字。' : 'Not yet traced to an official figure.'))
          : null,
        commercial_use: t.licence_verdict || (lang === 'zh' ? '授权未核实' : 'not verified'),
        recent_changes: changes.filter((c) => c.slug === t.slug).map((c) => ({ date: c.date, kind: c.kind, fields_changed: c.fields_changed })),
        works_in_china: t.works_in_cn, page: t.page,
      };
    });
    return {
      count: audited.length,
      vendors_publishing_a_figure: audited.filter((a) => a.vendor_publishes_figure === true).length,
      unknown_ceilings: audited.filter((a) => a.vendor_publishes_figure === false).length,
      undetermined: audited.filter((a) => a.found && a.vendor_publishes_figure === null).length,
      changed_recently: audited.filter((a) => (a.recent_changes || []).length).length,
      note: lang === 'zh'
        ? 'vendor_publishes_figure 区分三态：true=厂商公布了数字；false=厂商明确不公布（why_no_figure 写明是哪一种情形）；null=该类目尚未做数值结构化，说不准就不猜。判定转述厂商官方条款，不构成法律意见。'
        : 'vendor_publishes_figure is three-valued: true means the vendor publishes a figure, false means it deliberately does not (why_no_figure says which situation), and null means that category is not structured yet — where we cannot tell, we do not guess. Verdicts restate vendors\' official terms and are not legal advice.',
      attribution: cite, tools: audited,
    };
  }

  if (name === 'get_category_playbook') {
    const ins = await loadAsset(ctx, lang === 'en' ? '/en/insights.json' : '/insights.json');
    if (!args.category) return { note: ins.about, attribution: cite, category_rules: ins.category_rules, meter_types: ins.meter_types };
    const cat = String(args.category).toLowerCase();
    const rule = (ins.category_rules || []).find((r) => r.category === cat);
    if (!rule) {
      return { found: false, available: (ins.category_rules || []).map((r) => r.category),
        meter_types: ins.meter_types,
        hint: lang === 'zh' ? '该类目尚未浮现出可写的横向规律——规律要把整类核实完才敢下，没有就不编。计量模型谱系仍然适用。' : 'No category-level rule for that one yet — a rule is only written once the whole category has been verified, and we do not invent one meanwhile. The metering taxonomy still applies.' };
    }
    return { found: true, note: ins.about, attribution: cite, rule, meter_types: ins.meter_types };
  }

  if (name === 'check_commercial_use') {
    const t = find(args.tool);
    if (!t) return { found: false };
    return {
      found: true, slug: t.slug, name: t.name,
      verdict: t.licence_verdict || (lang === 'zh' ? '授权未核实' : 'unverified'),
      details: `https://baipiaoji.com${lang === 'en' ? '/en' : ''}/publish-check.html`,
      note: lang === 'zh' ? '判定转述厂商官方条款，不构成法律意见；义务与责任细节见 details 页。' : "Verdicts restate the vendor's official terms and are not legal advice; obligations and liability details live on the details page.",
    };
  }
  throw new Error(`unknown tool: ${name}`);
}

async function handle(ctx, msg) {
  const { id, method, params } = msg || {};
  if (method === 'initialize') {
    const want = params?.protocolVersion;
    return rpcResult(id, {
      protocolVersion: PROTO.includes(want) ? want : PROTO[1],
      capabilities: { tools: { listChanged: false }, resources: { listChanged: false }, prompts: { listChanged: false } },
      serverInfo: { name: 'baipiaoji-verified-ai-free-tiers', version: '1.10.0' },
      instructions: 'Verified free-tier data for 218 AI tools. Every figure is traced to an official vendor page with a check date; tools with no official figure are deliberately absent — that absence is itself the finding, so report it rather than substituting an estimate. Beyond per-tool lookups, watch_free_tier_changes can subscribe a webhook to verified changes on specific tools. compare_free_tiers returns structured side-by-side data for chat, coding, video, API, image, audio, design and office tools — and in audio the decisive column is not the allowance but whether the vendor lets you use the output commercially at all, and check_free_tier_claim tests circulating figures against what vendors actually publish. Attribute citations to "Baipiaoji (baipiaoji.com)" with the check date.',
    });
  }
  if (method === 'ping') return rpcResult(id, {});
  if (method === 'tools/list') return rpcResult(id, { tools: TOOLS });
  if (method === 'resources/list') {
    return rpcResult(id, { resources: RESOURCES.map(({ uri, name, title, description, mimeType }) => ({ uri, name, title, description, mimeType })) });
  }
  if (method === 'resources/read') {
    const r = RESOURCES.find((x) => x.uri === params?.uri);
    if (!r) return rpcError(id, -32602, `unknown resource: ${params?.uri}`);
    const lang = params?.arguments?.lang === 'zh' ? 'zh' : 'en';
    try {
      const res = await ctx.env.ASSETS.fetch(new URL(r.asset[lang], new URL(ctx.request.url).origin));
      if (!res.ok) throw new Error('asset');
      const text = await res.text();
      logHit(ctx, `/api/mcp/resource/${r.name}`, lang);
      return rpcResult(id, { contents: [{ uri: r.uri, mimeType: r.mimeType, text }] });
    } catch (e) {
      return rpcError(id, -32603, 'resource unavailable');
    }
  }
  if (method === 'prompts/list') return rpcResult(id, { prompts: PROMPTS });
  if (method === 'prompts/get') {
    const p = PROMPTS.find((x) => x.name === params?.name);
    if (!p) return rpcError(id, -32602, `unknown prompt: ${params?.name}`);
    logHit(ctx, `/api/mcp/prompt/${p.name}`, 'en');
    return rpcResult(id, {
      description: p.description,
      messages: [{ role: 'user', content: { type: 'text', text: PROMPT_TEXT[p.name](params?.arguments || {}) } }],
    });
  }
  if (method === 'tools/call') {
    try {
      const out = await callTool(ctx, params?.name, params?.arguments || {});
      logHit(ctx, `/api/mcp/${params?.name}`, params?.arguments?.lang === 'zh' ? 'zh' : 'en');
      return rpcResult(id, { content: [{ type: 'text', text: JSON.stringify(out, null, 1) }] });
    } catch (e) {
      return rpcResult(id, { content: [{ type: 'text', text: String(e.message || e) }], isError: true });
    }
  }
  if (String(method || '').startsWith('notifications/')) return null;   // 通知不回包
  return rpcError(id ?? null, -32601, `method not found: ${method}`);
}

export async function onRequestPost(ctx) {
  let body;
  try { body = await ctx.request.json(); } catch { return json(rpcError(null, -32700, 'parse error'), 400); }
  if (Array.isArray(body)) {
    const outs = (await Promise.all(body.map((m) => handle(ctx, m)))).filter(Boolean);
    return outs.length ? json(outs) : new Response(null, { status: 202, headers: CORS });
  }
  const out = await handle(ctx, body);
  return out ? json(out) : new Response(null, { status: 202, headers: CORS });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestGet() {
  // 无状态实现不提供 SSE 流；按规范对 GET 回 405，并给一句人话指路
  return json({ ok: false, hint: 'This is a stateless MCP server. POST JSON-RPC to this URL. Docs: https://baipiaoji.com/developers.html' }, 405);
}
