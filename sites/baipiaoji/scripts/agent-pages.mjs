// Agents surface (2026-09-22 rebuild, owner: "整体重构下 agents" + "面向不同的用户分类清晰" + "做流量 GEO 优化";
// third round the same day: "首页不够凸显 agents / 分类样式不够好看、不能突出重点 / 没有搜索").
// Every page here goes through build.mjs's own layout() — same stylesheet, rail, language switch, footer, beacon —
// instead of the standalone template the first version used (its nav injection landed the link next to the
// language switch, and its pages carried their own CSS and no working zh↔en switch).
//
// Page inventory per locale (indexable = in sitemap + hreflang; noindex = neither):
//   /agents/                indexable   hub: search, who-are-you doors, the records cross-linked to verified
//                                       free-tier data, category index, FAQ, machine access
//   /agents/for/<audience>  indexable   one door per reader type; curated records as cards, registry-origin as counts
//   /agents/c/<category>    indexable   curated cards first ("重点"), then the registry table; in-page filter
//   /agents/<slug>          noindex     one curated record (official text, vocab labels, URL checks, siblings)
//   /agents-index.json      —           search index for the agents search box (same {u,n,k,q} shape as the site one)
// Registry-origin records (official MCP registry) have no detail page: their page IS their repository; they live in
// the category tables, agents.json and the MCP tools. That keeps 700+ near-identical pages out of the index.
// "重点" is a rule, not taste: curated records (hand-written, vocab-labelled) always come before registry rows, and a
// record that also has a verified free-tier entry on this site is marked as such — that cross-link is the one thing
// no other agent directory has.
import { audiencesOf, AUDIENCES } from '../functions/api/_agents.js';

const CJK = /[一-鿿]/;

export function buildAgentPages(ctx) {
  const { layout, railOf, esc, crumbLd, faqLd, BASE, site, NAME, LOCALE, vocab, registry, toolBySlug, write, pushPage, subscribeOf, serverJson } = ctx;
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
  const tool = (a) => (a.tool_slug && toolBySlug.get(a.tool_slug)) || null;
  // RSS for the directory (2026-09-22, owner: 「让网站更快被自动发现」): feed readers, aggregators and AI crawlers poll feeds
  // for what is new; the registry admits new records daily, so this feed changes daily. Indexable pages advertise it in <head>.
  const feedRef = { title: T('New AI agents & MCP servers — Baipiaoji', '新收录的 Agent 与 MCP — 白嫖计'), href: url('/agents/feed.xml') };
  const lay = (o) => layout({ ...o, feed: o.noindex ? undefined : feedRef });
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
  const ftBadge = (a) => (tool(a) ? ` <a class="aw-tool" href="${BASE}/tools/${esc(a.tool_slug)}.html" title="${T('This site also keeps a verified free-tier record for it', '本站另有它的已核实免费额度记录')}">${T('free tier', '免费额度')}</a>` : '');
  const originTag = (a) => (hasPage(a) ? '' : `<span class="aw-origin" title="${T('Listed in the official MCP registry; page = repository', '收录自官方 MCP 注册表；页面即仓库')}">${T('registry', '注册表')}</span>`);
  const byCat = new Map(); for (const a of agents) { if (!byCat.has(a.category)) byCat.set(a.category, []); byCat.get(a.category).push(a); }
  const cats = Object.keys(vocab.categories).filter((k) => byCat.has(k));
  const byAud = new Map(AUDIENCES.map((k) => [k, []])); for (const a of agents) for (const k of audiencesOf(a)) byAud.get(k).push(a);
  const n = (x) => String(x).replace(/\B(?=(\d{3})+(?!\d))/g, zh ? ' ' : ',');
  // NAME is the localized site name from build.mjs (site.name is the Chinese one — using it here put 白嫖计 on every English page).
  const crumb = (items) => `<nav class="crumb"><a href="${BASE}/">${esc(NAME)}</a>${items.map((i) => `<i>/</i>${i.href ? `<a href="${i.href}">${esc(i.name)}</a>` : `<span>${esc(i.name)}</span>`}`).join('')}</nav>`;
  const ld = (items) => crumbLd([{ name: NAME, url: `${BASE}/` }, ...items]);
  const itemList = (list, name) => ({ '@context': 'https://schema.org', '@type': 'ItemList', name, numberOfItems: list.length, itemListElement: list.slice(0, 60).map((a, i) => ({ '@type': 'ListItem', position: i + 1, name: a.name, url: hasPage(a) ? pageOf(a) : a.source_url })) });

  // Search box (same .gs component and /bpj.js logic as the site search; its own index + its own event tag) and the
  // in-page filter (narrows the cards/rows already on the page; zero network).
  const searchBox = (big) => `<div class="gs agents-gs${big ? ' aw-gs-big' : ''}" data-idx="${BASE}/agents-index.json" data-tag="agents"><input type="search" placeholder="${T(`Search ${n(agents.length)} agents & MCP servers: name, capability, category`, `搜 ${n(agents.length)} 条 Agent / MCP：名称、能力、类目`)}" aria-label="${T('Search agents and MCP', '搜索 Agent 与 MCP')}" autocomplete="off"><div class="gs-drop" hidden></div></div>`;
  const filterBox = (count) => `<div class="aw-filter"><input type="search" id="aw-filter" placeholder="${T(`Filter the ${n(count)} records on this page`, `在本页 ${n(count)} 条里筛选`)}" aria-label="${T('Filter this page', '筛选本页')}" autocomplete="off"><span id="aw-filter-n" class="aw-meta"></span></div>`;
  const filterScript = `<script>(function(){var f=document.getElementById('aw-filter');if(!f)return;var rows=document.querySelectorAll('[data-aw-row]'),n=document.getElementById('aw-filter-n'),secs=document.querySelectorAll('[data-aw-sec]');f.addEventListener('input',function(){var k=f.value.trim().toLowerCase(),c=0;for(var i=0;i<rows.length;i++){var ok=!k||rows[i].textContent.toLowerCase().indexOf(k)>=0;rows[i].hidden=!ok;if(ok)c++}for(var j=0;j<secs.length;j++){secs[j].hidden=!!k&&!secs[j].querySelector('[data-aw-row]:not([hidden])')}if(n)n.textContent=k?c+' / '+rows.length:''})})();</script>`;

  const card = (a) => { const x = L(a); return `<article class="aw-card${tool(a) ? ' has-ft' : ''}" data-aw-row><p class="aw-meta"><span class="aw-st aw-st-${esc(a.status)}">${esc(x.status)}</span> · ${esc(x.transport)}</p><h3>${nameLink(a)}${ftBadge(a)}</h3><p class="aw-card-desc">${esc(x.desc)}</p><p class="aw-tags">${x.caps.map((c) => `<span class="tag">${esc(c)}</span>`).join(' ')}</p><p class="aw-kv"><b>${T('Pricing', '价格形态')}</b> ${esc(x.pricing)}</p><p class="aw-links">${goLink(a, 'source', T('Official source →', '官方来源 →'))}${a.repo_url ? goLink(a, 'repo', T('Repository →', '代码仓库 →')) : ''}${hasPage(a) ? `<a href="${pageOf(a)}">${T('Record', '记录页')}</a>` : ''}</p><p class="aw-meta">${checks(a)}</p></article>`; };
  const cards = (list) => `<div class="aw-cards">${list.map(card).join('')}</div>`;
  const row = (a) => { const x = L(a); return `<tr data-aw-row><td><b>${nameLink(a)}</b>${originTag(a)}${ftBadge(a)}<span class="aw-rowmeta">${esc(x.transport)} · ${esc(a.first_seen)} · <span class="aw-st aw-st-${esc(a.status)}">${esc(x.status)}</span></span></td><td class="aw-desc">${esc(x.desc)}</td><td class="aw-links">${goLink(a, 'source', T('official', '官方'))}${a.repo_url && a.repo_url !== a.source_url ? goLink(a, 'repo', T('repo', '仓库')) : ''}</td></tr>`; };
  const table = (list) => `<div class="aw-tablewrap"><table class="aw-table"><thead><tr><th>${T('Name', '名称')}</th><th>${T('What it is', '是什么')}</th><th>${T('Links', '链接')}</th></tr></thead><tbody>${list.map(row).join('')}</tbody></table></div>`;
  const chip = (label, val, href) => (href ? `<a class="aw-chip" href="${href}"><span>${esc(label)}</span><b>${val}</b></a>` : `<span class="aw-chip"><span>${esc(label)}</span><b>${val}</b></span>`);
  const summary = (list) => {
    const cur = list.filter(hasPage).length, reg = list.length - cur;
    const tr = {}; for (const a of list) tr[a.keys?.transport] = (tr[a.keys?.transport] || 0) + 1;
    const top = Object.entries(tr).filter(([k]) => vocab.transport[k]).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const ft = list.filter((a) => tool(a)).length;
    return `<p class="aw-summary">${chip(T('curated', '人工收录'), cur)}${reg ? chip(T('from MCP registry', '官方 MCP 注册表'), reg) : ''}${ft ? chip(T('with a free-tier record here', '有本站免费额度记录'), ft) : ''}${top.map(([k, v]) => chip(vocab.transport[k][zh ? 'zh' : 'en'], v)).join('')}</p>`;
  };
  // Dated capsule (GEO: a dated first-party statement above the fold) — the registry's own last-check date, never today's clock.
  const asOf = () => `<p class="aw-asof">${T(`Data as of ${registry.checked} (last URL re-check). `, `数据截至 ${registry.checked}（最近一次 URL 重核）。`)}${T('Re-checked in rotation; a stale URL is marked, never silently removed.', '轮询重核；失效 URL 只标记，绝不静默删除。')}</p>`;
  const machine = () => `<section class="aw-machine" id="machine"><h2 class="group-title">${T('For agents and AI search', '给智能体与 AI 搜索用的入口')}</h2><p>${T('The whole list is machine-readable and citable with its check dates:', '整份清单机器可读，引用时请带核验日期：')}</p><ul><li><code>${site.base_url}${zh ? '' : '/en'}/agents.json</code> — ${T('every record with first-seen date, per-URL check dates, vocabulary keys and audiences', '每条记录带首见日、每条 URL 的核验日、词表键与受众')}</li><li>MCP <code>monitor_new_agents</code> (${T('filters: category, audience, status, transport, origin, since, query; paginate with offset/limit', '过滤：category / audience / status / transport / origin / since / query；offset+limit 翻页')}) · <code>get_agent</code> — <a href="${BASE}/mcp.html">${T('server docs', '服务器文档')}</a>${serverJson ? ` · ${T('listed in the official MCP registry as', '官方 MCP 注册表登记名')} <code>${esc(serverJson.name)}</code> v${esc(serverJson.version)}` : ''}</li><li><a href="${site.base_url}/llms.txt">llms.txt</a> · <a href="${site.base_url}/.well-known/mcp.json">.well-known/mcp.json</a> · <a href="${site.base_url}/openapi.json">openapi.json</a> · <a href="${feedRef.href}" type="application/rss+xml">RSS</a> ${T('(newest records)', '（最新收录）')}</li></ul><p class="aw-meta">${T('Cite as “Baipiaoji (baipiaoji.com)” with the check date. Discovery is separated from verification: a listing is not a security, performance or revenue claim.', '引用请注明「白嫖计（baipiaoji.com）」并带核验日期。发现与核验分开：收录不等于安全、性能或盈利承诺。')}</p></section>`;
  // Visible FAQ and FAQPage JSON-LD are generated from the same array, so they cannot drift (GEO rule ④).
  const FAQ = [
    { q: T('What does “verified” mean here?', '这里的「已核验」是什么意思？'), a: T('Only that the official URL and, when there is one, the repository URL answered when we fetched them on the date shown. It is not a review, a security audit or an endorsement. A URL that stops answering is marked stale, never silently removed.', '只表示官方 URL（以及有公开仓库时的仓库 URL）在所示日期被我们抓取时有应答。它不是评测、不是安全审计、也不是背书。停止应答的 URL 会标为待复核，绝不会被静默删除。') },
    { q: T('Where do records come from?', '记录从哪里来？'), a: T('Two sources, kept apart: a hand-curated seed list (every entry has an English and a Chinese one-line description written here, plus vocabulary labels), and the official MCP registry, whose listings are published by whoever controls the namespace. Registry records show the publisher’s own description and link straight to the repository.', '两个来源，分开标注：人工种子清单（每条都有本站写的中英文一句话描述与词表标签），以及官方 MCP 注册表——那里的条目由控制该命名空间的人发布。注册表记录展示发布者自己的描述，并直接链接到仓库。') },
    { q: T('Why are there no star counts, user numbers or prices?', '为什么没有星数、用户数和价格？'), a: T('Because we did not verify them. Pricing is described only as a shape (open-source, free tier, paid, usage-billed) and always points to the official site. Where this site has a verified free-tier record for the same product, the card says so and links to it.', '因为我们没有核实过。价格只以形态描述（开源、免费档、付费、按用量计费）并一律指向官网。若本站对同一产品有已核实的免费额度记录，卡片会标出并链接过去。') },
    { q: T('How do I use this from an agent?', '在智能体里怎么用？'), a: T(`Call the no-auth MCP server at ${site.base_url}/api/mcp (tools monitor_new_agents and get_agent), or fetch ${site.base_url}/agents.json. The server is listed in the official MCP registry${serverJson ? ` as ${serverJson.name}` : ''}.`, `调用无鉴权的 MCP 服务器 ${site.base_url}/api/mcp（工具 monitor_new_agents 与 get_agent），或直接取 ${site.base_url}/agents.json。该服务器已登记在官方 MCP 注册表${serverJson ? `，名为 ${serverJson.name}` : ''}。`) },
  ];
  const faqHtml = () => `<section class="faq" id="faq"><h2 class="group-title">${T('How this list works', '这份清单怎么运作')}</h2>${FAQ.map((f, i) => `<details${i === 0 ? ' open' : ''}><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}</section>`;
  const datasetLd = () => ({ '@context': 'https://schema.org', '@type': 'Dataset', name: T('Baipiaoji agents and MCP directory', '白嫖计 Agent 与 MCP 目录数据集'), description: T(`${agents.length} AI agents, MCP servers and agent platforms with official source URLs, first-seen dates and per-URL check dates. Own fields are CC BY 4.0; descriptions of registry-origin records are the publishers’ own words.`, `${agents.length} 条 AI Agent、MCP 服务器与 Agent 平台记录，带官方来源 URL、首见日期与每条 URL 的核验日期。本站字段 CC BY 4.0；注册表来源记录的描述为发布者原文。`), url: url('/agents/'), dateModified: registry.checked, isAccessibleForFree: true, creator: { '@type': 'Organization', name: 'Baipiaoji', url: site.base_url }, distribution: [{ '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: `${site.base_url}${zh ? '' : '/en'}/agents.json` }, { '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: `${site.base_url}/api/mcp`, name: 'MCP server (monitor_new_agents, get_agent)' }] });
  const doorsNav = (except) => `<p class="coverage aw-doors-inline">${AUDIENCES.filter((x) => x !== except).map((x) => `<a href="${url(`/agents/for/${x}.html`)}">${esc(audLabel(x))} (${byAud.get(x).length})</a>`).join(' · ')}</p>`;

  // ── hub ───────────────────────────────────────────────────────────────
  {
    const path = '/agents/';
    const h1 = T(`${n(agents.length)} AI agents, MCP servers and agent platforms — each with an official source and a check date`, `${n(agents.length)} 个 AI Agent、MCP 服务器与 Agent 平台，每条带官方来源与核验日期`);
    const answer = T(`${n(curated.length)} records are curated by hand and ${n(fromRegistry.length)} come from the official MCP registry. A record is admitted only after its official page answered on the day it was added, and both of its URLs are re-checked in rotation afterwards. Search, pick a door by who you are, or browse by category.`, `其中 ${n(curated.length)} 条人工收录、${n(fromRegistry.length)} 条来自官方 MCP 注册表。一条记录只在它的官方页面当天有应答时才会被收录，之后两条 URL 轮询重核。直接搜，按你是谁选一扇门，或按类目浏览。`);
    const featured = curated.filter((a) => tool(a)).sort((a, b) => String(a.name).localeCompare(String(b.name)));
    const body = `${railOf()}
<main class="stage aw">
  ${crumb([{ name: T('Agents & MCP', 'Agent 与 MCP') }])}
  <header class="hero"><div class="hero-inner">
    <h1>${esc(h1)}</h1>
    <p class="answer">${esc(answer)}</p>
    ${asOf()}
    ${searchBox(true)}
    <dl class="stats">
      <div><dt>${T('Records', '记录')}</dt><dd class="num">${agents.length}</dd></div>
      <div><dt>${T('Curated', '人工收录')}</dt><dd class="num">${curated.length}</dd></div>
      <div><dt>${T('From MCP registry', '来自 MCP 注册表')}</dt><dd class="num">${fromRegistry.length}</dd></div>
      <div><dt>${T('With a free-tier record', '有免费额度记录')}</dt><dd class="num">${featured.length}</dd></div>
      <div><dt>${T('Categories', '类目')}</dt><dd class="num">${cats.length}</dd></div>
      <div><dt>${T('Last check', '最近核验')}</dt><dd class="num aw-date">${esc(registry.checked)}</dd></div>
    </dl>
  </div></header>
  <section class="aw-doors" id="for">
    <h2 class="group-title">${T('Who are you?', '你是谁？')}<span>${AUDIENCES.length}</span></h2>
    <div class="aw-doorgrid">${AUDIENCES.map((k) => `<a class="aw-door" href="${url(`/agents/for/${k}.html`)}"><b>${esc(audLabel(k))}</b><i>${byAud.get(k).length}</i><span>${esc(audLede(k))}</span></a>`).join('')}</div>
  </section>
  <section id="featured">
    <h2 class="group-title">${T('Agents that also have a verified free-tier record here', '同时有本站免费额度记录的 Agent')}<span>${featured.length}</span></h2>
    <p class="aw-lede">${T('The one thing no other agent directory has: for these, the “still free?” question is answered on this site with an official source and a check date.', '别的 Agent 目录都没有的一层：这些项目「还免费吗」这个问题，本站有带官方出处与核实日期的答案。')}</p>
    ${cards(featured)}
  </section>
  <section id="categories">
    <h2 class="group-title">${T('By category', '按类目')}<span>${cats.length}</span></h2>
    <div class="aw-catlist">${cats.map((k) => { const xs = byCat.get(k); const cur = xs.filter(hasPage).length; return `<a class="aw-catrow" href="${url(`/agents/c/${k}.html`)}"><b>${esc(catLabel(k))}</b><i>${xs.length}</i><span>${esc(catLede(k))}</span><em>${cur === xs.length ? T(`${cur} curated`, `${cur} 条人工收录`) : T(`${cur} curated + ${xs.length - cur} from the registry`, `${cur} 条人工收录 + ${xs.length - cur} 条注册表`)}</em></a>`; }).join('')}</div>
  </section>
  <section id="census">
    <h2 class="group-title">${T('MCP census', 'MCP 普查')}</h2>
    <p class="aw-lede">${T('The official MCP registry lists thousands of remote servers and grows every day. This site checks them read-only every day: which ones actually answer, how many tools they expose, and when a tool list changes.', '官方 MCP 注册表登记了成千上万个远程服务器，而且每天都在增加。本站每天只读抽查：哪些真的能连上、各自暴露多少工具、工具列表什么时候变了。')} <a href="${url('/agents/mcp-census.html')}">${T('Open the census →', '看普查 →')}</a></p>
  </section>
  ${faqHtml()}
  ${machine()}
  ${subscribeOf ? subscribeOf(path) : ''}
</main>`;
    write(`agents/index.html`, lay({ title: T('AI agents, MCP servers & agent platforms — verified directory | Baipiaoji', 'AI Agent 与 MCP 目录：带官方来源与核验日期 | 白嫖计'), description: answer, path, body, wide: true, schema: [ld([{ name: T('Agents & MCP', 'Agent 与 MCP'), url: url(path) }]), { '@context': 'https://schema.org', '@type': 'CollectionPage', name: h1, url: url(path), description: answer, dateModified: registry.checked }, itemList(featured, T('Agents with a verified free-tier record', '有已核实免费额度记录的 Agent')), faqLd(FAQ), datasetLd()] }));
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
  <header class="hero"><div class="hero-inner"><h1>${esc(h1)}</h1><p class="answer">${esc(audLede(k))} ${esc(T('Curated records are shown as cards, grouped by category; registry-origin ones are counted with a link to the complete category table.', '人工收录的记录按类目以卡片展示；来自注册表的只计数并链接到完整类目表。'))}</p>
  ${asOf()}
  ${summary(list)}
  ${doorsNav(k)}
  <div class="aw-tools">${searchBox(false)}${filterBox(list.filter(hasPage).length)}</div></div></header>
  ${groups.map(([c, xs]) => { const cur = xs.filter(hasPage), reg = xs.filter((a) => !hasPage(a)); return `<section id="${esc(c)}" data-aw-sec><h2 class="group-title">${esc(catLabel(c))}<span>${xs.length}</span></h2><p class="aw-lede">${esc(catLede(c))}</p>${cur.length ? cards(cur) : ''}${reg.length ? `<p class="coverage"><a href="${url(`/agents/c/${c}.html`)}">${T(`${n(reg.length)} more from the official MCP registry in the full ${catLabel(c)} table →`, `另有 ${n(reg.length)} 条来自官方 MCP 注册表，见完整的「${catLabel(c)}」表 →`)}</a></p>` : `<p class="coverage"><a href="${url(`/agents/c/${c}.html`)}">${T('Full category table →', '完整类目表 →')}</a></p>`}</section>`; }).join('\n')}
  ${machine()}
</main>${filterScript}`;
    write(`agents/for/${k}.html`, lay({ title: T(`${audLabel(k)} — agents & MCP tools with sources | Baipiaoji`, `${audLabel(k)}：带来源的 Agent 与 MCP 工具 | 白嫖计`), description: `${audLede(k)} ${T(`${n(list.length)} records with official sources and check dates.`, `${n(list.length)} 条记录，带官方来源与核验日期。`)}`, path, body, wide: true, schema: [ld([{ name: T('Agents & MCP', 'Agent 与 MCP'), url: url('/agents/') }, { name: audLabel(k), url: url(path) }]), { '@context': 'https://schema.org', '@type': 'CollectionPage', name: h1, url: url(path), dateModified: registry.checked }, itemList(list.filter(hasPage), h1)] }));
    pushPage(url(path), '0.8');
  }

  // ── category pages: curated cards first, registry table second ────────
  for (const c of cats) {
    const list = byCat.get(c); const path = `/agents/c/${c}.html`;
    const cur = list.filter(hasPage), reg = list.filter((a) => !hasPage(a));
    const h1 = T(`${catLabel(c)}: ${n(list.length)} records with official sources`, `${catLabel(c)}：${n(list.length)} 条记录，带官方来源`);
    const auds = AUDIENCES.filter((k) => list.some((a) => audiencesOf(a).includes(k)));
    const body = `${railOf()}
<main class="stage aw">
  ${crumb([{ name: T('Agents & MCP', 'Agent 与 MCP'), href: url('/agents/') }, { name: catLabel(c) }])}
  <header class="hero"><div class="hero-inner"><h1>${esc(h1)}</h1><p class="answer">${esc(catLede(c))} ${esc(T('Curated records come first; listings from the official MCP registry follow in a table and link straight to the repository. Each entry carries the date its official URL last answered.', '人工收录的记录在前；官方 MCP 注册表的条目在后以表格列出并直接链接仓库。每条带官方 URL 最近一次应答的日期。'))}</p>
  ${asOf()}
  ${summary(list)}
  <p class="coverage">${T('Doors', '入口')}: ${auds.map((k) => `<a href="${url(`/agents/for/${k}.html`)}">${esc(audLabel(k))}</a>`).join(' · ')} · ${T('Other categories', '其它类目')}: ${cats.filter((x) => x !== c).map((x) => `<a href="${url(`/agents/c/${x}.html`)}">${esc(catLabel(x))} (${byCat.get(x).length})</a>`).join(' · ')}</p>
  <div class="aw-tools">${searchBox(false)}${filterBox(list.length)}</div></div></header>
  ${cur.length ? `<section id="curated" data-aw-sec><h2 class="group-title">${T('Curated', '重点：人工收录')}<span>${cur.length}</span></h2>${cards(cur)}</section>` : ''}
  ${reg.length ? `<section id="registry" data-aw-sec><h2 class="group-title">${T('From the official MCP registry', '来自官方 MCP 注册表')}<span>${reg.length}</span></h2><p class="aw-lede">${T('Published by whoever controls each namespace; the description is the publisher’s own. Verified here only as “the repository answered on the date shown”.', '由控制各命名空间的发布者自行登记，描述是发布者原文。本站只核验到「仓库在所示日期有应答」。')}</p>${table(reg)}</section>` : ''}
  ${machine()}
</main>${filterScript}`;
    write(`agents/c/${c}.html`, lay({ title: T(`${catLabel(c)} — ${n(list.length)} agents & MCP tools, verified sources | Baipiaoji`, `${catLabel(c)}：${n(list.length)} 个 Agent 与 MCP 工具，来源已核验 | 白嫖计`), description: `${catLede(c)} ${T(`${n(list.length)} records, each with an official source URL and the date it last answered.`, `${n(list.length)} 条记录，每条带官方来源 URL 与最近应答日期。`)}`, path, body, wide: true, schema: [ld([{ name: T('Agents & MCP', 'Agent 与 MCP'), url: url('/agents/') }, { name: catLabel(c), url: url(path) }]), { '@context': 'https://schema.org', '@type': 'CollectionPage', name: h1, url: url(path), dateModified: registry.checked }, itemList(list, h1)] }));
    pushPage(url(path), '0.8');
  }

  // ── curated detail pages (noindex,follow — usable, not indexed) ───────
  for (const a of curated) {
    const x = L(a); const o = official(a); const path = `/agents/${a.slug}.html`;
    const sib = agents.filter((b) => b.category === a.category && b.slug !== a.slug && hasPage(b)).slice(0, 8);
    const auds = audiencesOf(a);
    const t = tool(a);
    const body = `${railOf()}
<main class="stage aw">
  ${crumb([{ name: T('Agents & MCP', 'Agent 与 MCP'), href: url('/agents/') }, { name: x.cat, href: url(`/agents/c/${a.category}.html`) }, { name: a.name }])}
  <article class="aw-record">
    <p class="aw-meta"><span class="aw-st aw-st-${esc(a.status)}">${esc(x.status)}</span> · ${esc(x.cat)} · ${T('first seen', '首见')} ${esc(a.first_seen)} · ${T('last verified', '最近核验')} ${esc(a.last_verified)}</p>
    <h1>${esc(a.name)}</h1>
    <p class="aw-desc-lead">${esc(x.desc)}</p>
    ${t ? `<p class="aw-ftline"><a href="${BASE}/tools/${esc(t.slug)}.html">${T(`Still free? This site keeps a verified free-tier record for ${t.name} →`, `还免费吗？本站有 ${t.name} 的已核实免费额度记录 →`)}</a></p>` : ''}
    ${o ? `<blockquote class="aw-official"><p>${o.title ? `<b>${esc(o.title)}</b>` : ''}${o.title && o.desc ? '<br>' : ''}${esc(o.desc)}</p><footer>${T('The official page’s own title and description, fetched', '官方页面自己的标题与描述，抓取于')} ${esc(o.checked)}</footer></blockquote>` : ''}
    <dl class="aw-facts">
      <div><dt>${T('For', '适合')}</dt><dd>${auds.map((k) => `<a href="${url(`/agents/for/${k}.html`)}">${esc(audLabel(k))}</a>`).join(' · ')}</dd></div>
      <div><dt>${T('Capabilities', '能力')}</dt><dd>${x.caps.map((c) => `<span class="tag">${esc(c)}</span>`).join(' ')}</dd></div>
      <div><dt>${T('Access', '接入方式')}</dt><dd>${esc(x.transport)}</dd></div>
      <div><dt>${T('Pricing shape', '价格形态')}</dt><dd>${esc(x.pricing)}</dd></div>
      <div><dt>${T('Evidence', '证据')}</dt><dd>${esc(x.evidence)}</dd></div>
      <div><dt>${T('URL checks', 'URL 核验')}</dt><dd>${checks(a)}</dd></div>
    </dl>
    <p class="aw-actions">${goLink(a, 'source', T('Official source →', '官方来源 →'), 'go')}${a.repo_url ? goLink(a, 'repo', T('Repository →', '代码仓库 →'), 'go alt') : ''}</p>
    <p class="aw-meta">${T('“Not yet checked” means the URL was not yet reached from a network that can fetch it; both URLs are re-checked in rotation. This record separates a discovery signal from verified facts: it says the project exists at these URLs and what its own page says — not that it is safe, fast, profitable or endorsed. Read the project’s licence, privacy terms and status page before adopting it.', '「未核验」表示尚未从能访问它的网络核过；两条 URL 轮询重核。本记录把发现信号与已核验事实分开：它只说明项目存在于这些 URL、以及它自己的页面怎么说，不代表安全、快速、盈利或背书。接入前请读项目自己的许可证、隐私条款与服务状态页。')}</p>
    ${sib.length ? `<section class="aw-sib"><h2 class="group-title">${T('Same category', '同类目')}</h2><ul>${sib.map((b) => `<li><a href="${pageOf(b)}">${esc(b.name)}</a> <span>${esc(L(b).desc)}</span></li>`).join('')}</ul></section>` : ''}
    <section class="aw-machine"><h2 class="group-title">${T('Fetch this record', '取这条记录')}</h2><pre>MCP get_agent {"slug":"${esc(a.slug)}"}\n${site.base_url}${zh ? '' : '/en'}/agents.json</pre></section>
  </article>
</main>`;
    write(`agents/${a.slug}.html`, lay({ title: T(`${a.name} — ${x.cat} | Agent watch | Baipiaoji`, `${a.name}：${x.cat} | Agent 监控 | 白嫖计`), description: x.desc, path, body, wide: true, noindex: true, schema: [{ '@context': 'https://schema.org', '@type': 'WebPage', name: a.name, url: url(path), description: x.desc, dateModified: a.last_verified, about: { '@type': 'SoftwareApplication', name: a.name, url: a.source_url, applicationCategory: x.cat } }] }));
  }

  // ── machine-readable list + search index for this locale ──────────────
  const strip = (a) => { const o = { ...a, audiences: audiencesOf(a), page: hasPage(a) ? pageOf(a) : null }; if (!zh) for (const k of Object.keys(o)) if (k.startsWith('zh_')) delete o[k]; return o; };
  write('agents.json', JSON.stringify({ title: zh ? 'Baipiaoji Agent Watch' : 'Baipiaoji Agent Watch (English)', generated: registry.checked, policy: registry.policy, vocab_version: vocab.version, count: agents.length, curated: curated.length, from_registry: fromRegistry.length, categories: Object.fromEntries(cats.map((c) => [c, byCat.get(c).length])), audiences: Object.fromEntries(AUDIENCES.map((k) => [k, byAud.get(k).length])), agents: agents.map(strip) }, null, 1) + '\n');
  // Same {u,n,k,q} shape as /search-index.json so /bpj.js's search component reads it unchanged. Curated first (they
  // have pages and hand-written text), registry rows after; the component's two-pass match (name, then body) keeps the
  // exact-name hit on top either way.
  const idx = [...curated, ...fromRegistry].map((a) => ({ u: hasPage(a) ? pageOf(a) : a.source_url, n: nm(a), k: hasPage(a) ? catLabel(a.category) : `${catLabel(a.category)} · ${T('registry', '注册表')}`,
    q: `${a.name} ${zh ? (a.zh_name || '') : ''} ${a.slug} ${zh ? a.zh_description : a.description} ${(zh ? a.zh_capabilities : a.capabilities).join(' ')} ${zh ? a.zh_transport : a.transport} ${catLabel(a.category)} ${audiencesOf(a).map(audLabel).join(' ')}`.toLowerCase() }));
  write('agents-index.json', JSON.stringify(idx));
  // RSS 2.0, newest 50 by first-seen. Curated records link to their record page, registry rows to their official page.
  const rfc822 = (d) => new Date(`${d}T00:00:00Z`).toUTCString();
  const x = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const items = agents.slice(0, 50).map((a) => `<item><title>${x(nm(a))}</title><link>${x(hasPage(a) ? pageOf(a) : a.source_url)}</link><guid isPermaLink="false">baipiaoji-agent-${x(a.slug)}</guid><pubDate>${rfc822(a.first_seen)}</pubDate><category>${x(catLabel(a.category))}</category><description>${x(L(a).desc)}</description></item>`).join('');
  write('agents/feed.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${x(feedRef.title)}</title><link>${url('/agents/')}</link><atom:link href="${feedRef.href}" rel="self" type="application/rss+xml"/><description>${x(T('Newly admitted AI agents, MCP servers and agent platforms. A record is admitted only after its official page answered on that day.', '新收录的 AI Agent、MCP 服务器与 Agent 平台。一条记录只在它的官方页面当天有应答时才会被收录。'))}</description><language>${zh ? 'zh-CN' : 'en'}</language><lastBuildDate>${rfc822(registry.checked)}</lastBuildDate>${items}</channel></rss>\n`);
  return { total: agents.length, curated: curated.length, registry: fromRegistry.length, categories: cats, audiences: Object.fromEntries(AUDIENCES.map((k) => [k, byAud.get(k).length])) };
}
