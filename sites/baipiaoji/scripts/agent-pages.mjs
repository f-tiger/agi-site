// Agents surface (2026-09-22 rebuild, owner: "整体重构下 agents" + "面向不同的用户分类清晰" + "做流量 GEO 优化").
// Every page here goes through build.mjs's own layout() — same stylesheet, rail, language switch, footer, beacon —
// instead of the standalone template the first version used (its nav injection landed the link next to the
// language switch, and its pages carried their own CSS and no working zh↔en switch).
//
// Page inventory per locale (indexable = in sitemap + hreflang; noindex = neither):
//   /agents/                indexable   hub: who-are-you doors (audiences), categories, newest, machine access
//   /agents/for/<audience>  indexable   one door per reader type; curated records as cards, registry-origin as counts
//   /agents/c/<category>    indexable   the complete list for one category — the citable table
//   /agents/<slug>          noindex     one curated record (official text, vocab labels, URL checks, siblings)
// Registry-origin records (official MCP registry) have no detail page: their page IS their repository; they live in
// the category tables, agents.json and the MCP tools. That keeps 700+ near-identical pages out of the index.
import { audiencesOf, AUDIENCES } from '../functions/api/_agents.js';

const CJK = /[一-鿿]/;

export function buildAgentPages(ctx) {
  const { layout, railOf, esc, crumbLd, BASE, site, NAME, LOCALE, vocab, registry, toolBySlug, write, pushPage, subscribeOf } = ctx;
  const zh = LOCALE.code === 'zh';
  const T = (en, z) => (zh ? z : en);
  const agents = [...registry.agents].sort((a, b) => String(b.first_seen).localeCompare(String(a.first_seen)) || String(a.name).localeCompare(String(b.name)));
  const hasPage = (a) => a.origin !== 'mcp-registry';
  const curated = agents.filter(hasPage);
  const fromRegistry = agents.filter((a) => !hasPage(a));
  const url = (p) => `${BASE}${p}`;
  const pageOf = (a) => url(`/agents/${a.slug}.html`);
  const catLabel = (k) => (vocab.categories[k] ? vocab.categories[k][zh ? 'zh' : 'en'] : k);
  const catLede = (k) => (vocab.categories[k] ? vocab.categories[k][zh ? 'lede_zh' : 'lede_en'] : '');
  const audLabel = (k) => vocab.audiences[k][zh ? 'zh' : 'en'];
  const audLede = (k) => vocab.audiences[k][zh ? 'lede_zh' : 'lede_en'];
  const nm = (a) => (zh && a.zh_name ? a.zh_name : a.name);   // a publisher's Chinese title shows on the zh side only
  const L = (a) => ({
    desc: zh ? a.zh_description : a.description,
    cat: catLabel(a.category),
    transport: zh ? a.zh_transport : a.transport,
    caps: zh ? a.zh_capabilities : a.capabilities,
    pricing: zh ? a.zh_pricing_note : a.pricing_note,
    evidence: zh ? a.zh_evidence_level : a.evidence_level,
    status: (vocab.status[a.status] || {})[zh ? 'zh' : 'en'] || a.status,
  });
  // Official page text is quoted verbatim; on the English side it is shown only when it has no CJK (en pages carry a
  // no-CJK gate, and a Chinese vendor title on an English page would trip it while helping nobody).
  const official = (a) => {
    const o = a.official || {}; const t = o.title || '', d = o.description || '';
    if (!t && !d) return null;
    if (!zh && (CJK.test(t) || CJK.test(d))) return null;
    return { title: t, desc: d, checked: o.checked };
  };
  const check = (date, http) => {
    const dead = http === 404 || http === 410;
    if (zh) return date ? `${esc(date)} 核验${dead ? `（现 HTTP ${http}）` : ''}` : (dead ? `最近核验 HTTP ${http}` : '未核验');
    return date ? `checked ${esc(date)}${dead ? ` — now HTTP ${http}` : ''}` : (dead ? `HTTP ${http} on last check` : 'not yet checked');
  };
  const checks = (a) => `${T('source URL ', '来源 URL ')}${check(a.source_checked, a.source_http)}${a.repo_url ? ` · ${T('repository URL ', '仓库 URL ')}${check(a.repo_checked, a.repo_http)}` : ` · ${T('no public repository', '无公开仓库')}`}`;
  const goLink = (a, kind, label, cls = '') => `<a${cls ? ` class="${cls}"` : ''} href="${esc(kind === 'repo' ? a.repo_url : a.source_url)}" target="_blank" rel="noopener nofollow" data-tool="agents/${esc(a.slug)}/${kind}" data-cat="agents" data-place="${kind}">${label}</a>`;
  const nameLink = (a) => (hasPage(a) ? `<a href="${pageOf(a)}">${esc(nm(a))}</a>` : goLink(a, 'source', esc(nm(a))));
  const originTag = (a) => (hasPage(a) ? '' : `<span class="aw-origin" title="${T('Listed in the official MCP registry; page = repository', '收录自官方 MCP 注册表；页面即仓库')}">${T('registry', '注册表')}</span>`);
  const byCat = new Map(); for (const a of agents) { if (!byCat.has(a.category)) byCat.set(a.category, []); byCat.get(a.category).push(a); }
  const cats = Object.keys(vocab.categories).filter((k) => byCat.has(k));
  const byAud = new Map(AUDIENCES.map((k) => [k, []])); for (const a of agents) for (const k of audiencesOf(a)) byAud.get(k).push(a);
  const n = (x) => String(x).replace(/\B(?=(\d{3})+(?!\d))/g, zh ? ' ' : ',');
  // NAME is the localized site name from build.mjs (site.name is the Chinese one — using it here put 白嫖计 on every English page).
  const crumb = (items) => `<nav class="crumb"><a href="${BASE}/">${esc(NAME)}</a>${items.map((i) => `<i>/</i>${i.href ? `<a href="${i.href}">${esc(i.name)}</a>` : `<span>${esc(i.name)}</span>`}`).join('')}</nav>`;
  const ld = (items) => crumbLd([{ name: NAME, url: `${BASE}/` }, ...items]);
  const itemList = (list, name) => ({ '@context': 'https://schema.org', '@type': 'ItemList', name, numberOfItems: list.length, itemListElement: list.slice(0, 60).map((a, i) => ({ '@type': 'ListItem', position: i + 1, name: a.name, url: hasPage(a) ? pageOf(a) : a.source_url })) });

  const row = (a) => { const x = L(a); return `<tr><td>${nameLink(a)}${originTag(a)}${a.tool_slug && toolBySlug.has(a.tool_slug) ? ` <a class="aw-tool" href="${BASE}/tools/${esc(a.tool_slug)}.html" title="${T('free-tier record on this site', '本站免费额度记录')}">${T('free tier', '免费额度')}</a>` : ''}</td><td class="aw-desc">${esc(x.desc)}</td><td>${esc(x.transport)}</td><td>${esc(a.first_seen)}</td><td><span class="aw-st aw-st-${esc(a.status)}">${esc(x.status)}</span></td><td class="aw-links">${goLink(a, 'source', T('official', '官方'))}${a.repo_url ? ' · ' + goLink(a, 'repo', T('repo', '仓库')) : ''}</td></tr>`; };
  const table = (list) => `<div class="aw-tablewrap"><table class="aw-table"><thead><tr><th>${T('Name', '名称')}</th><th>${T('What it is', '是什么')}</th><th>${T('Access', '接入方式')}</th><th>${T('First seen', '首见')}</th><th>${T('Status', '状态')}</th><th>${T('Links', '链接')}</th></tr></thead><tbody>${list.map(row).join('')}</tbody></table></div>`;
  const card = (a) => { const x = L(a); return `<article class="aw-card"><p class="aw-meta">${esc(x.status)} · ${esc(x.cat)} · ${esc(a.first_seen)}</p><h3>${nameLink(a)}</h3><p>${esc(x.desc)}</p><p class="aw-kv"><b>${T('Access', '接入')}</b> ${esc(x.transport)} · <b>${T('Pricing', '价格')}</b> ${esc(x.pricing)}</p><p class="aw-kv">${x.caps.map((c) => `<span class="tag">${esc(c)}</span>`).join(' ')}</p><p class="aw-links">${goLink(a, 'source', T('Official source', '官方来源'))}${a.repo_url ? ' · ' + goLink(a, 'repo', T('Repository', '代码仓库')) : ''}${hasPage(a) ? ` · <a href="${pageOf(a)}">${T('Record', '记录页')}</a>` : ''}</p><p class="aw-meta">${checks(a)}</p></article>`; };
  const machine = () => `<section class="aw-machine" id="machine"><h2>${T('For agents and AI search', '给智能体与 AI 搜索用的入口')}</h2><p>${T('The whole list is machine-readable and citable with its check dates:', '整份清单机器可读，引用时请带核验日期：')}</p><ul><li><code>${site.base_url}${zh ? '' : '/en'}/agents.json</code> — ${T('every record with first-seen date, per-URL check dates, vocabulary keys and audiences', '每条记录带首见日、每条 URL 的核验日、词表键与受众')}</li><li>MCP <code>monitor_new_agents</code> (${T('filters: category, audience, status, transport, origin, since, query; paginate with offset/limit', '过滤：category / audience / status / transport / origin / since / query；offset+limit 翻页')}) · <code>get_agent</code> — <a href="${BASE}/mcp.html">${T('server docs', '服务器文档')}</a></li><li><a href="${site.base_url}/llms.txt">llms.txt</a> · <a href="${site.base_url}/.well-known/mcp.json">.well-known/mcp.json</a></li></ul><p class="aw-meta">${T('Cite as “Baipiaoji (baipiaoji.com)” with the check date. Discovery is separated from verification: a listing is not a security, performance or revenue claim.', '引用请注明「白嫖计（baipiaoji.com）」并带核验日期。发现与核验分开：收录不等于安全、性能或盈利承诺。')}</p></section>`;

  // ── hub ───────────────────────────────────────────────────────────────
  {
    const path = '/agents/';
    const h1 = T(`${n(agents.length)} AI agents, MCP servers and agent platforms — each with an official source and a check date`, `${n(agents.length)} 个 AI Agent、MCP 服务器与 Agent 平台，每条带官方来源与核验日期`);
    const answer = T(`${n(curated.length)} records are curated by hand and ${n(fromRegistry.length)} come from the official MCP registry. A record is admitted only after its official page answered on the day it was added, and both of its URLs are re-checked in rotation afterwards. Pick a door by who you are, or browse by category.`, `其中 ${n(curated.length)} 条人工收录、${n(fromRegistry.length)} 条来自官方 MCP 注册表。一条记录只在它的官方页面当天有应答时才会被收录，之后两条 URL 轮询重核。按你是谁选一扇门，或按类目浏览。`);
    const newest = agents.slice(0, 24);
    const body = `${railOf()}
<main class="stage aw">
  ${crumb([{ name: T('Agents & MCP', 'Agent 与 MCP') }])}
  <header class="hero"><div class="hero-inner">
    <h1>${esc(h1)}</h1>
    <p class="answer">${esc(answer)}</p>
    <dl class="stats">
      <div><dt>${T('Records', '记录')}</dt><dd class="num">${agents.length}</dd></div>
      <div><dt>${T('Curated', '人工收录')}</dt><dd class="num">${curated.length}</dd></div>
      <div><dt>${T('From MCP registry', '来自 MCP 注册表')}</dt><dd class="num">${fromRegistry.length}</dd></div>
      <div><dt>${T('Categories', '类目')}</dt><dd class="num">${cats.length}</dd></div>
      <div><dt>${T('Last check', '最近核验')}</dt><dd class="num aw-date">${esc(registry.checked)}</dd></div>
    </dl>
  </div></header>
  <section class="aw-doors" id="for">
    <h2 class="group-title">${T('Who are you?', '你是谁？')}<span>${AUDIENCES.length}</span></h2>
    <div class="aw-doorgrid">${AUDIENCES.map((k) => `<a class="aw-door" href="${url(`/agents/for/${k}.html`)}"><b>${esc(audLabel(k))}</b><i>${byAud.get(k).length}</i><span>${esc(audLede(k))}</span></a>`).join('')}</div>
  </section>
  <section id="categories">
    <h2 class="group-title">${T('By category', '按类目')}<span>${cats.length}</span></h2>
    <div class="aw-cats">${cats.map((k) => `<a class="aw-cat" href="${url(`/agents/c/${k}.html`)}"><b>${esc(catLabel(k))}</b><i>${byCat.get(k).length}</i><span>${esc(catLede(k))}</span></a>`).join('')}</div>
  </section>
  <section id="newest">
    <h2 class="group-title">${T('Newest', '最新收录')}<span>${newest.length}</span></h2>
    ${table(newest)}
    <p class="coverage">${T('Full lists live on the category pages; every record is also in the JSON and MCP feeds below.', '完整清单在各类目页；每条记录也都在下面的 JSON 与 MCP 里。')}</p>
  </section>
  <section class="faq" id="faq">
    <h2 class="group-title">${T('How this list works', '这份清单怎么运作')}</h2>
    <details open><summary>${T('What does “verified” mean here?', '这里的「已核验」是什么意思？')}</summary><p>${T('Only that the official URL and, when there is one, the repository URL answered when we fetched them on the date shown. It is not a review, a security audit or an endorsement. A URL that stops answering is marked stale, never silently removed.', '只表示官方 URL（以及有公开仓库时的仓库 URL）在所示日期被我们抓取时有应答。它不是评测、不是安全审计、也不是背书。停止应答的 URL 会标为待复核，绝不会被静默删除。')}</p></details>
    <details><summary>${T('Where do records come from?', '记录从哪里来？')}</summary><p>${T('Two sources, kept apart: a hand-curated seed list (every entry has an English and a Chinese one-line description written here, plus vocabulary labels), and the official MCP registry, whose listings are published by whoever controls the namespace. Registry records show the publisher’s own description and link straight to the repository.', '两个来源，分开标注：人工种子清单（每条都有本站写的中英文一句话描述与词表标签），以及官方 MCP 注册表——那里的条目由控制该命名空间的人发布。注册表记录展示发布者自己的描述，并直接链接到仓库。')}</p></details>
    <details><summary>${T('Why are there no star counts, user numbers or prices?', '为什么没有星数、用户数和价格？')}</summary><p>${T('Because we did not verify them. Pricing is described only as a shape (open-source, free tier, paid, usage-billed) and always points to the official site. Where this site has a verified free-tier record for the same product, the row links to it.', '因为我们没有核实过。价格只以形态描述（开源、免费档、付费、按用量计费）并一律指向官网。若本站对同一产品有已核实的免费额度记录，行内会链接过去。')}</p></details>
  </section>
  ${machine()}
  ${subscribeOf ? subscribeOf(path) : ''}
</main>`;
    write(`agents/index.html`, layout({ title: T('AI agents, MCP servers & agent platforms — verified watchlist | Baipiaoji', 'AI Agent 与 MCP 监控目录：带官方来源与核验日期 | 白嫖计'), description: answer, path, body, wide: true, schema: [ld([{ name: T('Agents & MCP', 'Agent 与 MCP'), url: url(path) }]), { '@context': 'https://schema.org', '@type': 'CollectionPage', name: h1, url: url(path), description: answer }, itemList(newest, T('Newest agents and MCP servers', '最新收录的 Agent 与 MCP'))] }));
    pushPage(url(path), '0.9');
  }

  // ── audience doors ────────────────────────────────────────────────────
  for (const k of AUDIENCES) {
    const list = byAud.get(k); const path = `/agents/for/${k}.html`;
    const groups = cats.map((c) => [c, list.filter((a) => a.category === c)]).filter(([, xs]) => xs.length);
    const h1 = T(`${audLabel(k)}: ${n(list.length)} agents and MCP tools`, `${audLabel(k)}：${n(list.length)} 个 Agent 与 MCP 工具`);
    const body = `${railOf()}
<main class="stage aw">
  ${crumb([{ name: T('Agents & MCP', 'Agent 与 MCP'), href: url('/agents/') }, { name: audLabel(k) }])}
  <header class="hero"><div class="hero-inner"><h1>${esc(h1)}</h1><p class="answer">${esc(audLede(k))} ${esc(T('Grouped by category; curated records are shown in full, registry-origin ones are counted with a link to the complete category table.', '按类目分组；人工收录的记录完整展示，来自注册表的只计数并链接到完整类目表。'))}</p>
  <p class="coverage">${AUDIENCES.filter((x) => x !== k).map((x) => `<a href="${url(`/agents/for/${x}.html`)}">${esc(audLabel(x))} (${byAud.get(x).length})</a>`).join(' · ')}</p></div></header>
  ${groups.map(([c, xs]) => { const cur = xs.filter(hasPage), reg = xs.filter((a) => !hasPage(a)); return `<section id="${esc(c)}"><h2 class="group-title">${esc(catLabel(c))}<span>${xs.length}</span></h2><p class="aw-lede">${esc(catLede(c))}</p>${cur.length ? `<div class="aw-cards">${cur.map(card).join('')}</div>` : ''}${reg.length ? `<p class="coverage"><a href="${url(`/agents/c/${c}.html`)}">${T(`${n(reg.length)} more from the official MCP registry in the full ${catLabel(c)} table →`, `另有 ${n(reg.length)} 条来自官方 MCP 注册表，见完整的「${catLabel(c)}」表 →`)}</a></p>` : `<p class="coverage"><a href="${url(`/agents/c/${c}.html`)}">${T('Full category table →', '完整类目表 →')}</a></p>`}</section>`; }).join('\n')}
  ${machine()}
</main>`;
    write(`agents/for/${k}.html`, layout({ title: T(`${audLabel(k)} — agents & MCP tools with sources | Baipiaoji`, `${audLabel(k)}：带来源的 Agent 与 MCP 工具 | 白嫖计`), description: `${audLede(k)} ${T(`${n(list.length)} records with official sources and check dates.`, `${n(list.length)} 条记录，带官方来源与核验日期。`)}`, path, body, wide: true, schema: [ld([{ name: T('Agents & MCP', 'Agent 与 MCP'), url: url('/agents/') }, { name: audLabel(k), url: url(path) }]), itemList(list.filter(hasPage), h1)] }));
    pushPage(url(path), '0.8');
  }

  // ── category tables ───────────────────────────────────────────────────
  for (const c of cats) {
    const list = byCat.get(c); const path = `/agents/c/${c}.html`;
    const h1 = T(`${catLabel(c)}: ${n(list.length)} records with official sources`, `${catLabel(c)}：${n(list.length)} 条记录，带官方来源`);
    const auds = AUDIENCES.filter((k) => list.some((a) => audiencesOf(a).includes(k)));
    const body = `${railOf()}
<main class="stage aw">
  ${crumb([{ name: T('Agents & MCP', 'Agent 与 MCP'), href: url('/agents/') }, { name: catLabel(c) }])}
  <header class="hero"><div class="hero-inner"><h1>${esc(h1)}</h1><p class="answer">${esc(catLede(c))} ${esc(T('Newest first. Curated rows link to a record page; registry rows link straight to the repository. Each row carries the date its official URL last answered.', '按首见日期倒序。人工收录的行链接到记录页；注册表的行直接链接到仓库。每行带官方 URL 最近一次应答的日期。'))}</p>
  <p class="coverage">${T('Doors', '入口')}: ${auds.map((k) => `<a href="${url(`/agents/for/${k}.html`)}">${esc(audLabel(k))}</a>`).join(' · ')} · ${T('Other categories', '其它类目')}: ${cats.filter((x) => x !== c).map((x) => `<a href="${url(`/agents/c/${x}.html`)}">${esc(catLabel(x))} (${byCat.get(x).length})</a>`).join(' · ')}</p></div></header>
  <section id="list">${table(list)}</section>
  ${machine()}
</main>`;
    write(`agents/c/${c}.html`, layout({ title: T(`${catLabel(c)} — ${n(list.length)} agents & MCP tools, verified sources | Baipiaoji`, `${catLabel(c)}：${n(list.length)} 个 Agent 与 MCP 工具，来源已核验 | 白嫖计`), description: `${catLede(c)} ${T(`${n(list.length)} records, each with an official source URL and the date it last answered.`, `${n(list.length)} 条记录，每条带官方来源 URL 与最近应答日期。`)}`, path, body, wide: true, schema: [ld([{ name: T('Agents & MCP', 'Agent 与 MCP'), url: url('/agents/') }, { name: catLabel(c), url: url(path) }]), itemList(list, h1)] }));
    pushPage(url(path), '0.8');
  }

  // ── curated detail pages (noindex,follow — usable, not indexed) ───────
  for (const a of curated) {
    const x = L(a); const o = official(a); const path = `/agents/${a.slug}.html`;
    const sib = agents.filter((b) => b.category === a.category && b.slug !== a.slug && hasPage(b)).slice(0, 8);
    const auds = audiencesOf(a);
    const tool = a.tool_slug && toolBySlug.get(a.tool_slug);
    const body = `${railOf()}
<main class="stage aw">
  ${crumb([{ name: T('Agents & MCP', 'Agent 与 MCP'), href: url('/agents/') }, { name: x.cat, href: url(`/agents/c/${a.category}.html`) }, { name: a.name }])}
  <article class="aw-record">
    <p class="aw-meta">${esc(x.status)} · ${esc(x.cat)} · ${T('first seen', '首见')} ${esc(a.first_seen)} · ${T('last verified', '最近核验')} ${esc(a.last_verified)}</p>
    <h1>${esc(a.name)}</h1>
    <p class="aw-desc-lead">${esc(x.desc)}</p>
    ${o ? `<blockquote class="aw-official"><p>${o.title ? `<b>${esc(o.title)}</b>` : ''}${o.title && o.desc ? '<br>' : ''}${esc(o.desc)}</p><footer>${T('The official page’s own title and description, fetched', '官方页面自己的标题与描述，抓取于')} ${esc(o.checked)}</footer></blockquote>` : ''}
    <dl class="aw-facts">
      <div><dt>${T('For', '适合')}</dt><dd>${auds.map((k) => `<a href="${url(`/agents/for/${k}.html`)}">${esc(audLabel(k))}</a>`).join(' · ')}</dd></div>
      <div><dt>${T('Capabilities', '能力')}</dt><dd>${x.caps.map((c) => `<span class="tag">${esc(c)}</span>`).join(' ')}</dd></div>
      <div><dt>${T('Access', '接入方式')}</dt><dd>${esc(x.transport)}</dd></div>
      <div><dt>${T('Pricing shape', '价格形态')}</dt><dd>${esc(x.pricing)}</dd></div>
      <div><dt>${T('Evidence', '证据')}</dt><dd>${esc(x.evidence)}</dd></div>
      <div><dt>${T('URL checks', 'URL 核验')}</dt><dd>${checks(a)}</dd></div>
      ${tool ? `<div><dt>${T('On this site', '本站记录')}</dt><dd><a href="${BASE}/tools/${esc(tool.slug)}.html">${esc(tool.name)} — ${T('verified free-tier record', '已核实的免费额度记录')}</a></dd></div>` : ''}
    </dl>
    <p class="aw-actions">${goLink(a, 'source', T('Official source →', '官方来源 →'), 'go')}${a.repo_url ? goLink(a, 'repo', T('Repository →', '代码仓库 →'), 'go alt') : ''}</p>
    <p class="aw-meta">${T('“Not yet checked” means the URL was not yet reached from a network that can fetch it; both URLs are re-checked in rotation. This record separates a discovery signal from verified facts: it says the project exists at these URLs and what its own page says — not that it is safe, fast, profitable or endorsed. Read the project’s licence, privacy terms and status page before adopting it.', '「未核验」表示尚未从能访问它的网络核过；两条 URL 轮询重核。本记录把发现信号与已核验事实分开：它只说明项目存在于这些 URL、以及它自己的页面怎么说，不代表安全、快速、盈利或背书。接入前请读项目自己的许可证、隐私条款与服务状态页。')}</p>
    ${sib.length ? `<section class="aw-sib"><h2>${T('Same category', '同类目')}</h2><ul>${sib.map((b) => `<li><a href="${pageOf(b)}">${esc(b.name)}</a> <span>${esc(L(b).desc)}</span></li>`).join('')}</ul></section>` : ''}
    <section class="aw-machine"><h2>${T('Fetch this record', '取这条记录')}</h2><pre>MCP get_agent {"slug":"${esc(a.slug)}"}\n${site.base_url}${zh ? '' : '/en'}/agents.json</pre></section>
  </article>
</main>`;
    write(`agents/${a.slug}.html`, layout({ title: T(`${a.name} — ${x.cat} | Agent watch | Baipiaoji`, `${a.name}：${x.cat} | Agent 监控 | 白嫖计`), description: x.desc, path, body, wide: true, noindex: true, schema: [{ '@context': 'https://schema.org', '@type': 'WebPage', name: a.name, url: url(path), description: x.desc, dateModified: a.last_verified, about: { '@type': 'SoftwareApplication', name: a.name, url: a.source_url, applicationCategory: x.cat } }] }));
  }

  // ── machine-readable list for this locale ─────────────────────────────
  const strip = (a) => { const o = { ...a, audiences: audiencesOf(a), page: hasPage(a) ? pageOf(a) : null }; if (!zh) for (const k of Object.keys(o)) if (k.startsWith('zh_')) delete o[k]; return o; };
  write('agents.json', JSON.stringify({ title: zh ? 'Baipiaoji Agent Watch' : 'Baipiaoji Agent Watch (English)', generated: registry.checked, policy: registry.policy, vocab_version: vocab.version, count: agents.length, curated: curated.length, from_registry: fromRegistry.length, categories: Object.fromEntries(cats.map((c) => [c, byCat.get(c).length])), audiences: Object.fromEntries(AUDIENCES.map((k) => [k, byAud.get(k).length])), agents: agents.map(strip) }, null, 1) + '\n');
  return { total: agents.length, curated: curated.length, registry: fromRegistry.length, categories: cats, audiences: Object.fromEntries(AUDIENCES.map((k) => [k, byAud.get(k).length])) };
}
