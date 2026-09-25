const data = document.getElementById('eco-chrome-copy');
if (data) {
  const t = JSON.parse(data.textContent), lang = document.documentElement.lang;
  const $ = id => document.getElementById(id);
  const toggle = $('eb-search-toggle'), panel = $('eb-search-panel');
  const query = $('eb-search-query'), results = $('eb-search-results'), status = $('eb-search-status');
  let indexPromise, timer;
  const norm = value => value.toLowerCase().replace(/ß/g, 'ss').normalize('NFD').replace(/\p{Diacritic}/gu, '');
  function close(restoreFocus = false) {
    panel.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    if (restoreFocus) toggle.focus();
  }
  async function search() {
    const term = query.value.trim();
    results.replaceChildren();
    if (term.length < 2) { status.textContent = t.searchHint; return; }
    status.textContent = t.searchLoading;
    try {
      indexPromise ??= fetch('/search-index.json').then(response => {
        if (!response.ok) throw Error('Search unavailable');
        return response.json();
      }).then(index => { if (!Array.isArray(index)) throw Error('Invalid index'); return index; });
      const index = await indexPromise;
      if (query.value.trim() !== term) return;
      const words = norm(term).split(/\s+/);
      const hits = index.filter(e => e.l === lang && typeof e.t === 'string' && typeof e.u === 'string' && e.u.startsWith('/') && !e.u.startsWith('//'))
        .map(e => {
          const title = norm(e.t), description = norm(e.d || '');
          const scores = words.map(word => title.includes(word) ? 3 : description.includes(word) ? 1 : 0);
          return {entry: e, score: scores.every(Boolean) ? scores.reduce((a, b) => a + b, 0) : 0};
        }).filter(hit => hit.score > 0).sort((a, b) => b.score - a.score).slice(0, 6);
      for (const {entry} of hits) {
        const url = new URL(entry.u, location.origin);
        if (url.origin !== location.origin) continue;
        const li = document.createElement('li'), a = document.createElement('a'), title = document.createElement('strong');
        a.href = url.pathname + url.search + url.hash;
        a.hreflang = lang;
        title.textContent = entry.t;
        a.append(title);
        if (entry.d) {
          const description = document.createElement('span');
          description.textContent = entry.d.slice(0, 120) + (entry.d.length > 120 ? '…' : '');
          a.append(description);
        }
        li.append(a); results.append(li);
      }
      status.textContent = results.children.length ? t.searchFound.replace('{n}', results.children.length) : t.searchEmpty;
    } catch {
      indexPromise = undefined;
      if (query.value.trim() === term) status.textContent = t.searchError;
    }
  }
  toggle.addEventListener('click', () => {
    if (!panel.hidden) { close(); return; }
    panel.hidden = false; toggle.setAttribute('aria-expanded', 'true'); query.focus();
  });
  query.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(search, 150); });
  $('eb-search-form').addEventListener('submit', event => { event.preventDefault(); clearTimeout(timer); search(); });
  document.addEventListener('click', event => { if (!event.target.closest('.eb-search')) close(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !panel.hidden) close(true); });
}
