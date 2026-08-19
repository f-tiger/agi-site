#!/usr/bin/env node
// 生成 verified-ai-free-tiers 镜像仓库的全部内容到 mirror/ 目录。
// 背景：GitHub App 集成无建仓权限（403），空仓需用户在 github.com/new 手动创建一次；
// 仓库出现后，每日增长循环会 add_repo 并把 mirror/ 推上去，此后由该仓库自带的
// Action 每日从 baipiaoji.com/limits.json 自动同步——彻底脱离人工。
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const site = JSON.parse(readFileSync(join(root, 'data/site.json'), 'utf8'));
const tools = JSON.parse(readFileSync(join(root, 'data/tools.json'), 'utf8'));
const en = JSON.parse(readFileSync(join(root, 'data/i18n/en.json'), 'utf8'));
const out = join(root, 'mirror');
mkdirSync(join(out, '.github/workflows'), { recursive: true });

const lim = tools.filter((t) => t.limits);
const enOf = (t) => ({ ...t, ...(en.tools?.[t.slug] || {}) });

const row = (t) => {
  const e = enOf(t);
  return `| [${e.name}](${site.base_url}/en/tools/${t.slug}.html) | ${String(e.limits?.quota || t.limits.quota).replace(/\|/g, '\\|')} | ${t.limits.checked} |`;
};
const rowZh = (t) => `| [${t.name}](${site.base_url}/tools/${t.slug}.html) | ${String(t.limits.quota).replace(/\|/g, '\\|')} | ${t.limits.checked} |`;

writeFileSync(join(out, 'README.md'), `# Verified AI Free-Tier Limits ｜ 已核实的 AI 免费额度数据集

Free-tier limits of AI tools, **hand-verified against official sources** — every figure carries a source and a check date. Listed in the official [MCP Registry](https://registry.modelcontextprotocol.io/v0/servers?search=verified-ai-free-tiers) as \`io.github.f-tiger/verified-ai-free-tiers\`.

## MCP server（agent 直连本数据）

\`\`\`
claude mcp add --transport http baipiaoji https://baipiaoji.com/api/mcp
\`\`\`

\`\`\`json
{ "mcpServers": { "baipiaoji": { "type": "http", "url": "https://baipiaoji.com/api/mcp" } } }
\`\`\`

No auth, streamable HTTP, nothing to install. Full setup docs for Claude Code / Claude Desktop / Cursor / Windsurf / VS Code: <${site.base_url}/mcp.html>

**14 tools**

| Tool | What it answers |
|---|---|
| \`search_ai_tools\` | Search the ${tools.length}-tool directory: category / fully-free / works-in-China / capability tag / keyword |
| \`get_free_tier_limit\` | The verified ceiling, what happens at the wall, official source, check date |
| \`compare_free_tiers\` | Compare a whole category side by side (chat / coding / video / image / api) — what is metered, when it resets, whether a figure is published at all |
| \`check_free_tier_claim\` | Fact-check a circulating claim against official sources — many popular figures have none |
| \`check_commercial_use\` | May free-tier output be used commercially: five verdict states from vendors' own terms |
| \`audit_ai_stack\` | Audit a whole stack in one call: each tool's limit, commercial verdict, recent change, and whether its ceiling is simply unknown |
| \`build_free_workflow\` | Complete step-by-step recipes for doing a task entirely on free tiers, plus zero-budget money playbooks |
| \`get_free_tier_changes\` | Who changed a free tier lately — vendors don't announce it, so this comes from daily re-checks |
| \`check_api_quota_fit\` | Divide the official API limits by your actual load: which providers hold, which are exceeded, how long one-time credits last |
| \`find_free_alternatives\` | What to switch to at the wall: fully-free alternatives in the same category |
| \`get_category_playbook\` | What to ask *before* comparing numbers in a category, plus the taxonomy of free-tier walls with verified examples |
| \`get_china_ai_rules\` | Two gates for publishing to mainland China: vendor terms, and the AI-content labelling duty on top |
| \`explain_missing_figure\` | Why a figure is missing — the vendor refuses to publish, official pages contradict each other, or no official page exists |
| \`watch_free_tier_changes\` | Subscribe a webhook to verified free-tier changes: when a watched allowance or licence term moves (checked daily), a sourced JSON payload arrives the same day; 3 tools free |

**9 resources** (pull whole datasets in one call): \`baipiaoji://limits\` · \`://directory\` · \`://quotas\` · \`://myths\` · \`://workflows\` · \`://changes\` · \`://no-source\` · \`://insights\` · \`://dataset\`

**4 prompts** (they appear in your client's prompt picker): \`audit-my-ai-stack\` · \`pick-a-free-tier\` · \`fact-check-a-free-tier-claim\` · \`watch-my-free-tiers\`

REST alternative: \`${site.base_url}/api/tools\` · OpenAPI: \`${site.base_url}/openapi.json\` · Registry manifest: [server.json](./server.json)

> 仓库 topics 请设置：\`mcp\` \`mcp-server\` \`ai-tools\` \`free-tier\` \`dataset\`（目录站按 topics 爬取收录）

## Why this exists ｜ 为什么做这个

Most "best free AI tools" lists repeat figures nobody can trace. This dataset does the opposite: a number is published **only** when an official vendor page states it, and the date it was checked travels with it. When a vendor publishes no figure, the entry says so instead of carrying a guess — for AI chat assistants, for instance, only 1 of 10 vendors publishes a message count at all.

多数「免费 AI 工具榜单」转述的数字查不到出处。这份数据集反过来做：**只有官方页面写明的数字才发布**，并带上核实日期；官方没公布的如实标注「未公布」，而不是填一个猜的数——比如对话助手这一类，10 家里只有 1 家真的公布了条数。

Figures that cannot be traced to an official page are deliberately absent — ${lim.length} of the ${tools.length} listed tools have a verified ceiling.
查不到官方来源的数字一律缺席：目前 ${tools.length} 个工具中 ${lim.length} 条已核实。

- 📄 In this repo: [limits.json](./limits.json) ｜ [limits.md](./limits.md) — synced daily from [baipiaoji.com](${site.base_url}/en/)（每日自动同步）
- 🧮 Structured comparison data（可比较的结构化对照，非散文）: ${site.base_url}/en/quotas.json — what each vendor meters, when it resets, whether a figure is published
- 🧾 Myth checks（流言核查，含哪些流传数字查无出处）: ${site.base_url}/en/myths.json ｜ ${site.base_url}/myths.html
- 📚 Whole dataset in one file: ${site.base_url}/llms-full.txt
- 📊 Embeddable daily-quota widget: \`<iframe src="${site.base_url}/en/widget/daily.html" width="100%" height="320" style="border:0"></iframe>\`

## Verified limits (EN)

| Tool | Free-tier ceiling | Checked |
|---|---|---|
${lim.map(row).join('\n')}

## 已核实额度（中文）

| 工具 | 免费额度到哪为止 | 核实于 |
|---|---|---|
${lim.map(rowZh).join('\n')}

## Method ｜ 核实方法

1. A figure is published only with an **official source** (pricing page, docs, license terms) + a check date. 数字必须有官方来源与核实日期。
2. Contradictory official figures are reported as contradictions — we never pick one. 官方口径矛盾时如实写矛盾。
3. Third-party hearsay is never accepted, however consistent. 纯第三方转述一律不采信。
4. Links are re-checked daily by CI. 链接每日自动巡检。

## License

Data is released under **CC BY 4.0**: reuse freely (commercial included) with attribution to “白嫖计 baipiaoji.com” and a link back. 数据以 CC BY 4.0 开放：注明「白嫖计 baipiaoji.com」并回链即可自由转载（含商用）。
`);

// MCP 注册资产：直接复制仓库根的 server.json——两处各写一份迟早分叉，单一事实源。
writeFileSync(join(out, 'server.json'), readFileSync(join(root, 'server.json'), 'utf8'));

// Glama 索引声明：Glama 会摄取并转发官方 MCP Registry 的全部内容（我们已在其中），
// 再叠加自己的沙箱行为分析与质量评分。repo 根放一份 glama.json 即可声明维护者、
// 把收录条目认领到本账号名下。格式取自 Glama 官方 schema 与线上真实样例
// （makeplane/plane-mcp-server、graphlit-mcp-server 都是这个形状），不臆造字段。
writeFileSync(join(out, 'glama.json'), JSON.stringify({
  $schema: 'https://glama.ai/mcp/schemas/server.json',
  maintainers: ['f-tiger'],
}, null, 2) + '\n');

// 数据本体随首推一起进仓库：sync.yml 要到次日才跑，空着的 limits.json 会让
// 仓库在被爬到的第一天看起来是个空壳——而首推那一刻正是目录站与搜索引擎最先看到它的时候。
// 直接复制构建产物，与线上同一份文件，不另生成一套。
for (const f of ['limits.json', 'limits.md']) {
  const p = join(root, 'dist', f);
  if (existsSync(p)) writeFileSync(join(out, f), readFileSync(p, 'utf8'));
  else console.warn(`⚠ dist/${f} 不存在——先跑 scripts/build.mjs，否则仓库首推会缺数据本体`);
}

writeFileSync(join(out, 'LICENSE'), `Creative Commons Attribution 4.0 International (CC BY 4.0)

The dataset in this repository (limits.json, limits.md, README tables) is licensed under CC BY 4.0.
Full text: https://creativecommons.org/licenses/by/4.0/legalcode
Attribution: 白嫖计 baipiaoji.com (${site.base_url})
`);

writeFileSync(join(out, 'sync.mjs'), `#!/usr/bin/env node
// 每日从 baipiaoji.com 拉取最新已核实数据并重建 README 表格；无变化则不产生提交。
import { writeFileSync } from 'node:fs';
const base = '${site.base_url}';
const data = await (await fetch(base + '/limits.json')).json();
writeFileSync('limits.json', JSON.stringify(data, null, 2));
writeFileSync('limits.md', await (await fetch(base + '/limits.md')).text());
const row = (t) => \`| [\${t.name}](\${base}/en/tools/\${t.slug}.html) | \${String(t.quota).replace(/\\|/g, '\\\\|')} | \${t.checked} |\`;
const rowZh = (t) => \`| [\${t.name}](\${t.page}) | \${String(t.quota).replace(/\\|/g, '\\\\|')} | \${t.checked} |\`;
const { readFileSync } = await import('node:fs');
let readme = readFileSync('README.md', 'utf8');
readme = readme
  .replace(/(## Verified limits \\(EN\\)\\n\\n\\| Tool[^\\n]*\\n\\|[^\\n]*\\n)([\\s\\S]*?)(\\n\\n## )/, (_, h, _rows, tail) => h + data.tools.map(row).join('\\n') + tail)
  .replace(/(## 已核实额度（中文）\\n\\n\\| 工具[^\\n]*\\n\\|[^\\n]*\\n)([\\s\\S]*?)(\\n\\n## )/, (_, h, _rows, tail) => h + data.tools.map(rowZh).join('\\n') + tail);
writeFileSync('README.md', readme);
console.log('synced', data.tools.length, 'verified limits');
`);

writeFileSync(join(out, '.github/workflows/sync.yml'), `name: Daily sync from baipiaoji.com
on:
  schedule:
    - cron: '30 23 * * *'
  workflow_dispatch:
permissions:
  contents: write
jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: node sync.mjs
      - name: Commit if changed
        run: |
          git config user.name 'Claude'
          git config user.email 'noreply@anthropic.com'
          git add -A
          git diff --cached --quiet || git commit -m 'chore: daily sync from baipiaoji.com'
          git push
`);

console.log(`✅ mirror/ 生成完毕：README（${lim.length} 条双语表）+ LICENSE + sync.mjs + sync.yml`);
