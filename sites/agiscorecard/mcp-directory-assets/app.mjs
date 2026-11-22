import {searchCatalog} from './query.mjs';

const byId = id => document.getElementById(id);
const form = byId('catalog-filters');
const results = byId('catalog-results');
const status = byId('catalog-status');
const pages = byId('catalog-pages');
const pageLabel = byId('catalog-page');
const dateLabel = byId('catalog-date');
const previous = byId('catalog-previous');
const next = byId('catalog-next');
const zh = document.documentElement.lang.startsWith('zh');
const number = new Intl.NumberFormat(zh ? 'zh-CN' : 'en');
const showNumber = value => number.format(value);
const pageSize = 12;
const catalogUrl = '/mcp-directory-assets/catalog.json';

const text = zh ? {
  loading: '正在加载目录…',
  unavailable: '筛选暂不可用。可浏览下方已有文档的条目，或打开完整 JSON 目录。',
  noMatch: '没有匹配项。试试更短的关键词、英文产品名称，或清空筛选。',
  pagination: (page, total) => `第 ${showNumber(page)} 页，共 ${showNumber(total)} 页`,
  match: (start, end, count) => `显示第 ${showNumber(start)}–${showNumber(end)} 条，共 ${showNumber(count)} 条匹配`,
  sizes: (all, featured) => `目录收录 ${showNumber(all)} 条，其中 ${showNumber(featured)} 条已核对文档`,
  reviewed: '已核对文档',
  registered: '发布方登记',
  remote: '远程托管',
  local: '本地安装',
  docs: '接入文档',
  source: '条目来源',
  copied: '已复制'
} : {
  loading: 'Loading the catalog…',
  unavailable: 'Filters are temporarily unavailable. Browse the documented entries below or open the full JSON catalog.',
  noMatch: 'No matching servers. Try a shorter keyword or clear a filter.',
  pagination: (page, total) => `Page ${showNumber(page)} of ${showNumber(total)}`,
  match: (start, end, count) => `Showing ${showNumber(start)}–${showNumber(end)} of ${showNumber(count)} matches`,
  sizes: (all, featured) => `${showNumber(all)} catalog entries · ${showNumber(featured)} docs checked`,
  reviewed: 'Docs checked',
  registered: 'Publisher listing',
  remote: 'Hosted',
  local: 'Local',
  docs: 'Setup guide',
  source: 'Entry source',
  copied: 'Copied'
};

let entries = [];
let matches = [];
let page = 1;
let checked = 0;
const sent = new Set();
const categoryLabels = new Map([...form.elements.category.options].map(option => [option.value, option.textContent]));

function track(name, label, key) {
  const params = new URLSearchParams(location.search);
  if (sent.has(key) || navigator.webdriver || navigator.doNotTrack === '1' || navigator.globalPrivacyControl ||
      ['__ci', '__qa', '__probe', 'ci', 'qa'].some(flag => params.has(flag)) ||
      params.get('utm_source') === 'verify') return;

  try {
    if (localStorage.getItem('fleet_ga4_choice_v1') === 'denied') return;
  } catch {
    return;
  }

  sent.add(key);
  const route = zh ? '/zh/agents/' : '/agents/';
  const loc = zh ? 'mcp_catalog_zh' : 'mcp_catalog_en';
  window.dispatchEvent(new CustomEvent('fleet:business', {detail: {name}}));
  fetch('/api/e', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    keepalive: true,
    body: JSON.stringify({n: name, l: loc, b: label, p: route})
  }).catch(() => {});
}

function element(tag, value, className) {
  const node = document.createElement(tag);
  if (value) node.textContent = value;
  if (className) node.className = className;
  return node;
}

function httpsLink(value) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && !url.username && !url.password) return url.href;
  } catch {}
  return null;
}

function link(label, url, action) {
  const node = element('a', label);
  node.href = url;
  node.rel = 'noreferrer';
  node.dataset.catalogAction = action;
  return node;
}

function card(entry) {
  const title = entry.title || entry.id;
  const node = element('li', '', 'directory-result');
  const meta = element('div', '', 'directory-meta');
  meta.append(element('span', entry.featured ? text.reviewed : text.registered,
    entry.featured ? 'directory-chip directory-chip-reviewed' : 'directory-chip directory-chip-registered'));
  const category = categoryLabels.get(entry.category);
  if (category) meta.append(element('span', category, 'directory-chip'));
  for (const transport of ['remote', 'local']) {
    if (entry.transports.includes(transport)) meta.append(element('span', text[transport], 'directory-chip'));
  }

  node.append(meta, element('h3', title));
  const identifier = entry.registryId || entry.id;
  if (title !== identifier) node.append(element('p', identifier, 'directory-entry-id'));
  const note = zh ? entry.noteZh || entry.note : entry.note;
  const description = note || entry.description;
  if (description) node.append(element('p', description));

  const docs = httpsLink(entry.documentationUrl);
  const source = httpsLink(entry.sourceUrl);
  if (docs || source) {
    const links = element('div', '', 'directory-links');
    if (docs && docs !== source) links.append(link(text.docs, docs, 'docs'));
    if (source) links.append(link(text.source, source, 'source'));
    node.append(links);
  }
  return node;
}

function render(focus = false) {
  const count = matches.length;
  const totalPages = Math.ceil(count / pageSize);
  const start = (page - 1) * pageSize;
  const end = Math.min(start + pageSize, count);
  results.replaceChildren(...matches.slice(start, end).map(card));
  const total = text.sizes(entries.length, checked);
  status.textContent = count ? `${text.match(start + 1, end, count)} · ${total}` : `${text.noMatch} ${total}`;
  pages.hidden = totalPages < 2;
  pageLabel.textContent = totalPages ? text.pagination(page, totalPages) : '';
  previous.disabled = page === 1;
  next.disabled = page >= totalPages;
  if (focus) byId('browse-title').focus();
}

function applyFilters(measure = true) {
  const data = new FormData(form);
  matches = searchCatalog(entries, {
    query: data.get('q').trim(),
    category: data.get('category'),
    transport: data.get('transport'),
    featured: data.get('featured') === 'yes'
  });
  page = 1;
  render();
  if (measure) track('mcp_catalog_search', 'search', 'search');
}

form.addEventListener('submit', event => {
  event.preventDefault();
  applyFilters();
});
form.addEventListener('reset', () => {
  // The reset event is dispatched before the controls restore their defaults.
  window.setTimeout(() => applyFilters(false), 0);
});
form.addEventListener('change', event => {
  if (event.target instanceof HTMLSelectElement) applyFilters();
});
previous.addEventListener('click', () => {
  if (page <= 1) return;
  page--;
  render(true);
});
next.addEventListener('click', () => {
  if (page * pageSize >= matches.length) return;
  page++;
  render(true);
});
function trackLink(event) {
  const anchor = event.target.closest('a[data-catalog-action]');
  if (!anchor) return;
  track('mcp_catalog_open', anchor.dataset.catalogAction, anchor.href);
}
results.addEventListener('click', trackLink);
results.addEventListener('auxclick', event => {
  if (event.button === 1) trackLink(event);
});

const copyButton = byId('copy-endpoint');
const endpoint = byId('native-endpoint');
const copyLabel = copyButton.textContent;
if (navigator.clipboard?.writeText) {
  copyButton.hidden = false;
  copyButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(endpoint.textContent);
      copyButton.textContent = text.copied;
      window.setTimeout(() => { copyButton.textContent = copyLabel; }, 1800);
    } catch {
      const selection = getSelection();
      const range = document.createRange();
      range.selectNodeContents(endpoint);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  });
}

status.textContent = text.loading;
try {
  const response = await fetch(catalogUrl);
  if (!response.ok) throw new Error('Catalog unavailable');
  const catalog = await response.json();
  if (!Array.isArray(catalog.entries) || !catalog.entries.length ||
      !catalog.entries.every(entry => entry && typeof entry.id === 'string' && Array.isArray(entry.transports))) {
    throw new Error('Catalog invalid');
  }
  entries = catalog.entries;
  matches = searchCatalog(entries);
  checked = entries.filter(entry => entry.featured === true).length;
  if (/^\d{4}-\d{2}-\d{2}$/.test(catalog.asOf)) {
    const date = dateLabel.querySelector('time');
    date.dateTime = catalog.asOf;
    date.textContent = catalog.asOf;
    dateLabel.hidden = false;
  }
  const source = httpsLink(catalog.source);
  if (source) {
    const item = byId('catalog-source');
    item.querySelector('a').href = source;
    item.querySelector('a').rel = 'noreferrer';
    item.hidden = false;
  }
  form.hidden = false;
  render();
} catch {
  status.textContent = text.unavailable;
}
