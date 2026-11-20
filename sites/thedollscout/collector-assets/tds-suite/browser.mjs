const one = (selector, root = document) => root.querySelector(selector);
const data = (selector) => {
  const entry = one(selector);
  return entry ? JSON.parse(entry.textContent) : null;
};
const create = (type, value, css) => {
  const el = document.createElement(type);
  if (value) el.textContent = value;
  if (css) el.className = css;
  return el;
};
const copyToClipboard = async (text, target) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const range = document.createRange();
    range.selectNodeContents(target);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    return false;
  }
};
const message = (name) => {
  window.dispatchEvent(new CustomEvent('fleet:business', {detail:{name}}));
};
const mcp = one('[data-tds-copy-mcp]');
if (mcp) {
  mcp.hidden = false;
  mcp.addEventListener('click', () => {
    const docs = one('[data-tds-mcp]');
    copyToClipboard(docs.textContent, docs);
  });
}
const form = one('[data-tds-tool]');
if (form) {
  const {name, locale, inputSchema, example, ui} = data('[data-tds-config]');
  const status = one('[data-tds-status]');
  const result = one('[data-tds-result]');
  const summary = one('[data-tds-summary]');
  const run = one('button[type=submit]', form);
  const sample = one('[data-tds-example]', form);
  const copy = one('[data-tds-copy]');
  const save = one('[data-tds-export]');
  let resultText = '';
  let exportText = '';
  let exampleLoaded = false;
  let exampleResult = false;
  let running = false;

  const props = Object.entries(inputSchema.properties);
  function setInputs(values) {
    form.reset();
    for (const [key, schema] of props) {
      if (!Object.hasOwn(values, key)) continue;
      const input = form.elements.namedItem(key);
      if (schema.type === 'boolean') input.checked = Boolean(values[key]);
      else input.value = String(values[key]);
    }
  }
  function readInputs() {
    const args = {};
    for (const [key, schema] of props) {
      const input = form.elements.namedItem(key);
      if (schema.type === 'boolean') args[key] = input.checked;
      else if (input.value !== '' || (schema.type === 'string' && inputSchema.required?.includes(key))) {
        if (schema.enum) args[key] = schema.enum.find(value => String(value) === input.value);
        else if (['number','integer'].includes(schema.type)) args[key] = input.valueAsNumber;
        else args[key] = input.value;
      }
    }
    return args;
  }
  run.disabled = false;
  sample.disabled = false;
  sample.addEventListener('click', () => {
    setInputs(example);
    exampleLoaded = true;
  });
  form.addEventListener('input', () => { exampleLoaded = false; });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (running || !form.reportValidity()) return;
    running = true;
    run.disabled = true;
    sample.disabled = true;
    status.textContent = ui.process;
    result.textContent = '';
    summary.textContent = '';
    summary.hidden = true;
    copy.disabled = true;
    save.disabled = true;
    resultText = '';
    exportText = '';
    try {
      const args = readInputs();
      const wasExample = exampleLoaded;
      const { runTdsTool } = await import('./index.mjs');
      const value = await runTdsTool(name, args, locale);
      if (value === undefined) throw Error('Missing execution result');
      exportText = JSON.stringify(value, null, 2);
      resultText = typeof value === 'string' ? value : exportText;
      result.textContent = resultText;
      const head = typeof value?.message === 'string' ? value.message : value?.summary;
      summary.textContent = typeof head === 'string' ? head : '';
      summary.hidden = !summary.textContent;
      status.textContent = wasExample ? ui.exampleResult : ui.result;
      copy.disabled = false;
      save.disabled = false;
      exampleResult = wasExample;
      message(wasExample ? 'tds_suite_example' : 'tds_suite_complete');
    } catch {
      status.textContent = ui.failed;
    } finally {
      running = false;
      run.disabled = false;
      sample.disabled = false;
    }
  });
  copy.addEventListener('click', async () => {
    if (resultText && await copyToClipboard(resultText, result)) status.textContent = ui.copied;
  });
  save.addEventListener('click', () => {
    if (!exportText) return;
    const url = URL.createObjectURL(new Blob([exportText], {type:'application/json'}));
    const download = create('a');
    download.href = url;
    download.download = `${name}-result.json`;
    document.body.append(download);
    download.click();
    download.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
    if (!exampleResult) message('tds_suite_export');
  });
}

const directory = one('[data-tds-directory]');
if (directory) {
  const ui = data('[data-tds-ui]');
  const filters = one('[data-tds-filters]', directory);
  const list = one('[data-tds-results]', directory);
  const status = one('[data-tds-list-count]', directory);
  const more = one('[data-tds-more]', directory);
  const original = [...list.children];
  const total = status.textContent;
  const fmt = new Intl.NumberFormat(document.documentElement.lang);
  let pool;
  let matches = [];
  let limit = 24;
  let request = 0;
  let active = false;
  const normalized = (text) => String(text).normalize('NFKC').toLowerCase();
  const makeTile = (tool) => {
    const li = create('li', '', 'tds-suite-card');
    const a = create('a', tool.title);
    const url = new URL(tool.path, location.origin);
    if (url.origin === location.origin && /^\/(?:de\/|zh\/)?ai-tools\/[a-z0-9-]+$/.test(url.pathname)) a.href = url.href;
    li.append(a, create('p',tool.description), create('span',tool.categoryLabel));
    return li;
  };
  function cache() {
    if (!pool) pool = fetch(directory.dataset.source, {credentials:'omit'}).then(async (response) => {
      if (!response.ok) throw Error('Tool directory unavailable');
      const payload = await response.json();
      if (!Array.isArray(payload.tools) || payload.count !== payload.tools.length) throw Error('Tool directory incomplete');
      return payload.tools;
    }).catch((error) => {
      pool = undefined;
      throw error;
    });
    return pool;
  }
  function draw() {
    list.replaceChildren(...matches.slice(0,limit).map(makeTile));
    status.textContent = matches.length ? `${fmt.format(matches.length)} ${ui.count}` : ui.zero;
    more.hidden = limit >= matches.length;
  }
  async function search(showAll = false) {
    const token = ++request;
    const terms = normalized(filters.elements.q.value).trim().split(/\s+/).filter(Boolean);
    const category = filters.elements.category.value;
    const empty = !terms.length && !category && !showAll;
    limit = showAll && !active ? 48 : 24;
    if (empty) {
      active = false;
      list.replaceChildren(...original);
      status.textContent = total;
      more.hidden = false;
      return;
    }
    try {
      const tools = await cache();
      if (token !== request) return;
      active = true;
      matches = tools.filter(tool => {
        const text = normalized([tool.title,tool.slug,tool.categoryLabel,tool.description].join(' '));
        return (!category || tool.category === category) && terms.every(term => text.includes(term));
      });
      draw();
    } catch {
      if (token !== request) return;
      active = false;
      list.replaceChildren(...original);
      more.hidden = true;
      status.textContent = ui.load;
    }
  }
  filters.hidden = false;
  more.hidden = false;
  filters.addEventListener('submit',(event) => { event.preventDefault(); search(); });
  filters.elements.q.addEventListener('input',() => search());
  filters.elements.category.addEventListener('change',() => search());
  more.addEventListener('click',() => {
    if (!active) search(true);
    else {
      limit += 24;
      draw();
    }
  });
}
