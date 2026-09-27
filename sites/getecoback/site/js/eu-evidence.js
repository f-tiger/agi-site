'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const t = JSON.parse($('checker-data').textContent);
  const form = $('evidence-check');
  let exportText = '';
  // Usage counting (2026-09-25). Same cookieless first-party beacon as the rest
  // of EcoBack (/api/ev). It carries the event name, the tool and the language
  // and nothing else: no answers, no counts derived from answers, no text.
  // Without it "nobody used the checker" and "the checker never reports" read
  // the same, and nothing about this tool can be decided from data.
  function ping(name) {
    try {
      const body = JSON.stringify({n: name, p: location.pathname, r: document.referrer, m: {tool: t.topic, lang: t.lang}});
      if (navigator.sendBeacon) navigator.sendBeacon('/api/ev', new Blob([body], {type: 'text/plain'}));
    } catch (e) { /* counting must never break the checker */ }
  }
  function deadlineText() {
    if (t.topic !== 'eudr') return '';
    const scope = $('product-scope').value;
    if (scope === 'added') return t.deadlineAdded;
    if (scope !== 'existing') return t.deadlineUnknown;
    const size = $('size').value;
    return size === 'large' || size === 'small-eutr' ? t.deadline2026 : size === 'small' ? t.deadline2027 : t.deadlineUnknown;
  }
  function clearResult() {
    if ($('deadline')) $('deadline').textContent = deadlineText();
    $('summary').textContent = t.empty;
    $('gaps').replaceChildren();
    $('download').hidden = true;
    $('limit').hidden = true;
    exportText = '';
  }
  form.addEventListener('change', clearResult);
  form.addEventListener('reset', () => setTimeout(clearResult, 0));
  form.addEventListener('submit', event => {
    event.preventDefault();
    const entries = t.items.map(([id, question, next]) => ({question, next, value: $(id).value}));
    const open = entries.filter(item => item.value !== 'yes');
    $('summary').textContent = open.length ? `${open.length} ${t.count}` : t.done;
    $('gaps').replaceChildren();
    open.forEach(item => {
      const li = document.createElement('li');
      li.textContent = `${item.question} — ${item.value === 'no' ? t.no : t.unknown}: ${item.next}`;
      $('gaps').appendChild(li);
    });
    $('download').hidden = false;
    $('limit').hidden = false;
    const planning = t.topic === 'eudr' ? ['product-scope', 'size', 'commodity'].map(id => $(id).selectedOptions[0].text).concat(deadlineText()) : [];
    exportText = [t.title, t.checked, document.querySelector('link[rel="canonical"]').href, ...planning, ...entries.map(item => `${item.question}\n${item.value === 'yes' ? t.yes : item.value === 'no' ? t.no : t.unknown}${item.value !== 'yes' ? '\n' + item.next : ''}`), t.limit, t.disclaimer, ...t.sources.map(([url, label]) => label + '\n' + url)].join('\n\n');
    $('result').focus({preventScroll: true});
    ping('evidence_check');
  });
  $('download').addEventListener('click', () => {
    if (!exportText) return;
    ping('evidence_download');
    const url = URL.createObjectURL(new Blob([exportText], {type:'text/plain;charset=utf-8'}));
    const a = document.createElement('a');
    a.href = url;
    a.download = `ecoback-${t.topic}-checklist-${t.lang}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  $('share').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(document.querySelector('link[rel="canonical"]').href);
      $('share-status').textContent = t.copied;
    } catch {
      $('share-status').textContent = t.copyError;
    }
  });
  $('supplier-template')?.addEventListener('click', () => ping('evidence_download'));
  clearResult();
  ping('page_view');
})();
