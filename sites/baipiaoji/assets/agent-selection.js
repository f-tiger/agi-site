// Progressive search over the selected directory. Static links serve the complete list by page.
const root = document.querySelector('[data-agent-selection]');

if (root) {
  const form = root.querySelector('#aw-selected-filters');
  const query = form.elements.q;
  const task = form.elements.task;
  const access = form.elements.access;
  const results = root.querySelector('#aw-selected-list');
  const count = root.querySelector('#aw-selected-count');
  const staticPages = root.querySelector('#aw-selected-pages');
  const resultPages = root.querySelector('#aw-selected-search-pages');
  const previous = resultPages.querySelector('[data-selected-direction="-1"]');
  const next = resultPages.querySelector('[data-selected-direction="1"]');
  const locale = document.documentElement.lang.startsWith('zh') ? 'zh' : 'en';
  const T = (en, zh) => locale === 'zh' ? zh : en;
  const formatter = new Intl.NumberFormat(locale);
  const original = { rows: [...results.children], count: count.textContent, start: results.start };
  let key = 0;
  let pending;
  let result = null;
  let page = 0;

  const searchText = (value) => String(value ?? '').normalize('NFKC').toLowerCase();
  const node = (tag, text, className) => {
    const element = document.createElement(tag);
    if (text) element.textContent = text;
    if (className) element.className = className;
    return element;
  };
  function link(text, href, agent, kind) {
    const anchor = node('a', text);
    const destination = new URL(href, location.href);
    if (destination.protocol !== 'https:' || destination.username || destination.password) {
      return node('span', text);
    }
    anchor.href = destination.href;
    if (kind) {
      anchor.target = '_blank';
      anchor.rel = 'noopener nofollow';
      anchor.dataset.tool = `agents/${agent.slug}/${kind}`;
      anchor.dataset.cat = 'agents';
      anchor.dataset.place = kind;
    }
    return anchor;
  }
  function row(agent, labels) {
    const entry = node('li', '', 'aw-selection-item');
    entry.dataset.selectedSlug = agent.slug;
    const title = node('div', '', 'aw-selection-title');
    const heading = node('h3');
    heading.append(agent.recordUrl
      ? link(agent.name, agent.recordUrl)
      : link(agent.name, agent.sourceUrl, agent, 'source'));
    title.append(heading, node('p', [agent.categoryLabel, agent.transportLabel, agent.sourceLabel].join(' · '), 'aw-meta'));
    const links = node('div', '', 'aw-selection-links');
    const shortcuts = node('p', '', 'aw-links');
    shortcuts.append(link(labels.official, agent.sourceUrl, agent, 'source'));
    if (agent.repoUrl && agent.repoUrl !== agent.sourceUrl) shortcuts.append(link(labels.repository, agent.repoUrl, agent, 'repo'));
    if (agent.freeTierUrl) shortcuts.append(link(labels.freeTier, agent.freeTierUrl));
    const proof = node('p', `${labels.checked} `, 'aw-meta');
    const time = node('time', agent.sourceChecked);
    time.dateTime = agent.sourceChecked;
    proof.append(time);
    links.append(shortcuts, proof);
    const description = node('p', agent.description, 'aw-selection-description');
    description.lang = agent.descriptionLanguage;
    entry.append(title, description, links);
    return entry;
  }
  function draw() {
    const start = page * result.pageSize;
    const shown = result.matches.slice(start, start + result.pageSize);
    const hits = result.matches.length;
    results.start = start + 1;
    results.replaceChildren(...shown.map((agent) => row(agent, result.labels)));
    count.textContent = hits
      ? T(`${start + 1}–${start + shown.length} of ${formatter.format(hits)} tools`, `第 ${start + 1}–${start + shown.length} 条，共 ${formatter.format(hits)} 个工具`)
      : result.labels.noResults;
    staticPages.hidden = true;
    resultPages.hidden = hits <= result.pageSize;
    previous.disabled = page === 0;
    next.disabled = start + shown.length >= hits;
  }
  function restore() {
    results.start = original.start;
    results.replaceChildren(...original.rows);
    count.textContent = original.count;
    staticPages.hidden = false;
    resultPages.hidden = true;
    result = null;
  }
  function loadDirectory() {
    if (!pending) pending = fetch(root.dataset.source, { headers: { Accept: 'application/json' }, credentials: 'omit' }).then(async (response) => {
      if (!response.ok) throw Error('Directory unavailable');
      const data = await response.json();
      if (!Array.isArray(data.agents) || data.agents.length !== data.count || data.pageSize !== 40) throw Error('Directory incomplete');
      return data;
    }).catch((error) => {
      pending = null;
      throw error;
    });
    return pending;
  }
  async function search() {
    const epoch = ++key;
    const terms = searchText(query.value).trim().split(/\s+/).filter(Boolean);
    const selectedTask = task.value;
    const selectedAccess = access.value;
    if (!terms.length && !selectedTask && !selectedAccess) {
      restore();
      return;
    }
    count.textContent = T('Loading the selected directory…', '正在加载精选目录…');
    try {
      const data = await loadDirectory();
      if (key !== epoch) return;
      const matches = data.agents.filter((agent) => {
        if (selectedTask && !agent.audience.includes(selectedTask)) return false;
        if (selectedAccess && agent.transport !== selectedAccess) return false;
        const text = searchText([agent.name, agent.slug, agent.description, agent.categoryLabel, agent.transportLabel, ...agent.capabilities, ...agent.audienceLabels].join(' '));
        return terms.every((term) => text.includes(term));
      });
      result = { matches, pageSize: data.pageSize, labels: data.labels };
      page = 0;
      draw();
    } catch {
      if (key !== epoch) return;
      restore();
      count.textContent = T('Search is unavailable. Use the page links to browse the directory.', '暂时无法搜索，可以用分页链接继续浏览。');
    }
  }
  form.hidden = false;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    search();
  });
  query.addEventListener('input', search);
  task.addEventListener('change', search);
  access.addEventListener('change', search);
  form.addEventListener('reset', (event) => {
    event.preventDefault();
    for (const field of [query, task, access]) field.value = '';
    search();
  });
  resultPages.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-selected-direction]');
    if (!result || !button || button.disabled) return;
    page += Number(button.dataset.selectedDirection);
    draw();
    results.scrollIntoView({ block: 'start' });
  });

  const params = new URLSearchParams(location.search);
  query.value = (params.get('q') || '').slice(0, 100);
  for (const field of [task, access]) {
    if ([...field.options].some(option => option.value === params.get(field.name))) {
      field.value = params.get(field.name);
    }
  }
  if (query.value || task.value || access.value) search();
}
