import { AUDIENCES, audiencesOf } from '../functions/api/_agents.js';

const PAGE_SIZE = 40;
const BASE_PATH = '/agents/selected/';

export function buildAgentSelectionPages({
  selection, zh, site, url, vocab, lay, railOf, crumb, ld, esc, nm, L, hasPage, pageOf, tool, write, pushPage,
}) {
  const locale = zh ? 'zh' : 'en';
  const T = (en, local) => zh ? local : en;
  const labels = {
    noResults: T('No tools match these filters.', '没有符合筛选条件的工具。'),
    loading: T('Loading the selected directory…', '正在加载精选目录…'),
    unavailable: T('Search is unavailable. Use the page links to browse the directory.', '暂时无法搜索，可以用分页链接继续浏览。'),
    previous: T('Previous page', '上一页'),
    next: T('Next page', '下一页'),
    title: T('Tools', '工具'),
    official: T('Official source', '官方来源'),
    repository: T('Repository', '代码仓库'),
    freeTier: T('Free-tier record', '免费额度记录'),
    checked: T('Source checked', '来源核验日期'),
  };
  const agents = selection.selected.map((agent) => {
    const localized = L(agent).desc;
    const usePublisherText = zh && /^官方 MCP 注册表收录的 MCP 服务器；描述以发布者的英文原文为准/.test(localized);
    const description = usePublisherText ? agent.description : localized;
    const audience = audiencesOf(agent);
    const transport = agent.keys.transport;
    const freeTier = tool(agent);
    return {
      slug: agent.slug,
      name: nm(agent),
      description,
      descriptionLanguage: usePublisherText ? 'en' : locale,
      category: agent.category,
      categoryLabel: L(agent).cat,
      transport,
      transportLabel: L(agent).transport,
      capabilities: L(agent).caps,
      audience,
      audienceLabels: audience.map((key) => vocab.audiences[key][locale]),
      origin: hasPage(agent) ? 'curated' : 'mcp-registry',
      sourceLabel: hasPage(agent) ? T('Editorial listing', '编辑收录') : T('Official MCP registry', '官方 MCP 注册表'),
      sourceUrl: agent.source_url,
      sourceChecked: agent.source_checked,
      repoUrl: agent.repo_url || null,
      repoChecked: agent.repo_url ? agent.repo_checked : null,
      registry: agent.origin === 'mcp-registry' ? {
        name: agent.registry.name,
        version: agent.registry.version,
        packages: agent.registry.packages || [],
        remotes: agent.registry.remotes === true,
      } : null,
      recordUrl: hasPage(agent) ? pageOf(agent) : null,
      freeTierUrl: freeTier ? url(`/tools/${agent.tool_slug}.html`) : null,
    };
  });
  const total = agents.length;
  const number = new Intl.NumberFormat(zh ? 'zh-CN' : 'en-US');
  const title = T(`${number.format(total)} selected AI agents and MCP tools`, `${number.format(total)} 个 AI Agent 与 MCP 精选工具`);
  const explanation = T(
    'Find a tool by task, access method or name. Each entry includes a reachable official source and the date it was checked. Registry entries include publisher descriptions and documented MCP access.',
    '按任务、接入方式或名称查找工具。每条收录都附官方来源和核验日期。注册表条目保留发布者描述及其公开的 MCP 接入方式。',
  );
  const note = T(
    'Source checks establish that the published link answered on the date shown. Review the publisher’s setup, permissions and licence before connecting a tool.',
    '来源核验记录的是公开链接在所示日期的响应。接入工具前，请查看发布者的配置说明、权限与许可证。',
  );
  const selectedTitle = T('Selected tools', '精选工具');
  const dataUrl = url('/agents/selected.json');
  const firstUrl = url(BASE_PATH);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pagePath = (index) => index === 1 ? BASE_PATH : `${BASE_PATH}page-${index}.html`;
  const pageUrl = (index) => url(pagePath(index));
  const displayCount = (start, end, count) => T(`${start}–${end} of ${number.format(count)} tools`, `第 ${start}–${end} 条，共 ${number.format(count)} 个工具`);
  const countBy = (values, predicate) => Object.fromEntries(values.map((key) => [key, agents.filter((agent) => predicate(agent, key)).length]));
  const taskCounts = countBy(AUDIENCES, (agent, key) => agent.audience.includes(key));
  const transportCounts = countBy([...new Set(agents.map((a) => a.transport))], (agent, key) => agent.transport === key);
  const option = (key, label, count) => `<option value="${esc(key)}">${esc(label)}${count ? ` (${count})` : ''}</option>`;
  const link = (href, label, attrs = '') => `<a href="${esc(href)}"${attrs}>${esc(label)}</a>`;
  const sourceLink = (agent, kind, href, label) => link(href, label, ` target="_blank" rel="noopener nofollow" data-tool="agents/${esc(agent.slug)}/${kind}" data-cat="agents" data-place="${kind}"`);
  const tile = (agent) => `<li class="aw-selection-item" data-selected-slug="${esc(agent.slug)}"><div class="aw-selection-title"><h3>${agent.recordUrl ? link(agent.recordUrl, agent.name) : sourceLink(agent, 'source', agent.sourceUrl, agent.name)}</h3><p class="aw-meta">${esc(agent.categoryLabel)} · ${esc(agent.transportLabel)} · ${esc(agent.sourceLabel)}</p></div><p class="aw-selection-description" lang="${agent.descriptionLanguage}">${esc(agent.description)}</p><div class="aw-selection-links"><p class="aw-links">${sourceLink(agent, 'source', agent.sourceUrl, labels.official)}${agent.repoUrl && agent.repoUrl !== agent.sourceUrl ? sourceLink(agent, 'repo', agent.repoUrl, labels.repository) : ''}${agent.freeTierUrl ? link(agent.freeTierUrl, labels.freeTier) : ''}</p><p class="aw-meta">${esc(labels.checked)} <time datetime="${esc(agent.sourceChecked)}">${esc(agent.sourceChecked)}</time></p></div></li>`;
  const pager = (current) => `<nav class="aw-selection-pages" id="aw-selected-pages" aria-label="${T('Directory pages', '目录分页')}">${current > 1 ? link(pageUrl(current - 1), labels.previous, ' rel="prev"') : ''}<span>${esc(T('Page', '页码'))}</span><span id="aw-selected-page">${current} / ${pageCount}</span>${current < pageCount ? link(pageUrl(current + 1), labels.next, ' rel="next"') : ''}<details><summary>${esc(T('Jump to page', '跳到指定页'))}</summary><div>${Array.from({ length: pageCount }, (_, i) => link(pageUrl(i + 1), String(i + 1), current === i + 1 ? ' aria-current="page"' : '')).join('')}</div></details></nav>`;
  const filters = `<form class="aw-selection-filter" id="aw-selected-filters" role="search" hidden>
    <label><span>${T('Search names or capabilities', '搜索名称或能力')}</span><input type="search" name="q" id="aw-selected-q" maxlength="100" autocomplete="off" placeholder="${T('Search the selected directory', '搜索所有精选工具')}"></label>
    <label><span>${T('Task', '任务')}</span><select name="task" id="aw-selected-task">${option('', T('All tasks', '全部任务'))}${Object.entries(taskCounts).filter(([, count]) => count).map(([key, count]) => option(key, vocab.audiences[key][locale], count)).join('')}</select></label>
    <label><span>${T('Access', '接入方式')}</span><select name="access" id="aw-selected-access">${option('', T('Any method', '全部方式'))}${Object.entries(transportCounts).map(([key, count]) => option(key, vocab.transport[key]?.[locale] || key, count)).join('')}</select></label>
    <button type="reset">${T('Clear filters', '清除筛选')}</button>
  </form>`;
  const faq = {
    q: T('How are tools selected?', '工具如何入选？'),
    a: T(
      'Selection starts with editorial entries and adds qualifying projects from the official MCP registry. Source checks must be within 45 days of the directory snapshot. We remove duplicate sources and require documented access for registry entries.',
      '先从编辑收录记录中筛选，再补充符合证据要求的官方 MCP 注册表项目。来源核验日期距目录快照至多 45 天。入选时排除重复，并要求注册表项目提供公开的接入资料。',
    ),
  };
  const envelope = {
    title,
    checked: selection.checked,
    count: total,
    target: selection.target,
    counts: selection.counts,
    selection: faq.a,
    checkScope: note,
    pageSize: PAGE_SIZE,
    currentLanguage: locale,
    labels,
    tasks: taskCounts,
    accessMethods: transportCounts,
    agents,
  };
  write('agents/selected.json', JSON.stringify(envelope) + '\n');

  for (let current = 1; current <= pageCount; current++) {
    const path = pagePath(current);
    const start = (current - 1) * PAGE_SIZE;
    const page = agents.slice(start, start + PAGE_SIZE);
    const heading = current === 1 ? title : T(`Selected AI agents and MCP tools, page ${current}`, `AI Agent 与 MCP 精选工具第 ${current} 页`);
    const body = `${railOf()}
    <main class="stage aw aw-selection" data-agent-selection data-source="${esc(dataUrl)}">
      ${crumb([{ name: T('Agents & MCP', 'Agent 与 MCP'), href: url('/agents/') }, { name: selectedTitle, href: current > 1 ? firstUrl : undefined }, ...(current > 1 ? [{ name: T(`Page ${current}`, `第 ${current} 页`) }] : [])])}
      <header class="hero"><div class="hero-inner">
        <h1>${esc(heading)}</h1>
        <p class="answer">${esc(explanation)}</p>
        <p class="aw-asof">${esc(T(`Directory checked ${selection.checked}`, `目录核验日期 ${selection.checked}`))}</p>
      </div></header>
      <section class="aw-selection-results" aria-label="${esc(selectedTitle)}">
        ${filters}
        <p id="aw-selected-count" class="aw-meta" role="status" aria-live="polite">${esc(total ? displayCount(start + 1, start + page.length, total) : labels.noResults)}</p>
        <ol id="aw-selected-list" class="aw-selection-list" start="${start + 1}">${page.map(tile).join('')}</ol>
        ${pager(current)}
        <nav id="aw-selected-search-pages" class="aw-selection-pages" aria-label="${T('Search result pages', '搜索结果分页')}" hidden>
          <button type="button" data-selected-direction="-1">${esc(labels.previous)}</button>
          <button type="button" data-selected-direction="1">${esc(labels.next)}</button>
        </nav>
      </section>
      <section class="aw-machine" id="selection-method">
        <h2 class="group-title">${esc(faq.q)}</h2>
        <p>${esc(faq.a)}</p><p>${esc(note)}</p>
        <p>${link(dataUrl, T('Download all selected records (JSON)', '下载全部精选记录（JSON）'))} · ${link(url('/agents/'), T('Browse the full directory', '浏览完整目录'))}</p>
      </section>
    </main>
    <script type="module" src="${esc(site.base_url)}/agent-selection.js"></script>`;
    const storePath = current === 1 ? 'agents/selected/index.html' : `agents/selected/page-${current}.html`;
    const schema = [
      ld([{ name: T('Agents & MCP', 'Agent 与 MCP'), url: url('/agents/') }, { name: heading, url: url(path) }]),
      { '@context': 'https://schema.org', '@type': 'CollectionPage', name: heading, url: url(path), description: explanation, dateModified: selection.checked },
      { '@context': 'https://schema.org', '@type': 'ItemList', name: heading, numberOfItems: total, itemListElement: page.map((a, i) => ({
        '@type': 'ListItem', position: start + i + 1, name: a.name, url: a.recordUrl || a.sourceUrl,
      })) },
      { '@context': 'https://schema.org', '@type': 'Dataset', name: title, description: faq.a, url: firstUrl, dateModified: selection.checked, isAccessibleForFree: true,
        distribution: { '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: dataUrl } },
    ];
    write(storePath, lay({ title: `${heading} | ${T('Baipiaoji', '白嫖计')}`, description: explanation, path, body, wide: true, noindex: current > 1, schema }));
    if (current === 1) pushPage(firstUrl, '0.8');
  }
  return { count: total };
}
