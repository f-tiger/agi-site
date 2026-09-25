'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const t = JSON.parse($('checker-data').textContent);
  const form = $('evidence-check');
  let exportText = '';
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
  });
  $('download').addEventListener('click', () => {
    if (!exportText) return;
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
  clearResult();
})();
