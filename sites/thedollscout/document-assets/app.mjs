import { LIMITS, validateFiles, compareDocuments, csv, auditExport } from './core.mjs?v=2026-09-25.6';
import { shareUrl, summaryText } from './sharing.mjs?v=2026-09-25.6';
const c = JSON.parse(document.getElementById('document-copy').textContent);
const mode = document.body.dataset.documentMode || 'audit';
const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
let files = [], reports = [], failures = [], reviews = {}, comparison = null, busy = false, controller, epoch = 0, sample = false;
const sent = new Set();
const downloadUrls = new Set();
const isProbe = new URLSearchParams(location.search).has('ci');
// Keep a navigation check isolated when following links to another TDS page.
// Canonical URLs and the public sharing payload are left untouched.
if (isProbe) for (const link of document.querySelectorAll('a[href]')) {
  const url = new URL(link.href, location.href);
  if (url.origin !== location.origin || link.getAttribute('href').startsWith('#')) continue;
  url.searchParams.set('ci', '1');
  link.href = url.pathname + url.search + url.hash;
}
function track(event) {
  if (location.hostname !== 'thedollscout.com' || isProbe || navigator.webdriver || navigator.doNotTrack === '1' || sent.has(event)) return;
  sent.add(event);
  let ref = '';
  try { ref = new URL(document.referrer).origin; } catch {}
  const body = JSON.stringify({ p: location.pathname, e: event, r: ref });
  try { if (navigator.sendBeacon) navigator.sendBeacon('/api/doc-events', body); else fetch('/api/doc-events', { method: 'POST', body, keepalive: true }).catch(() => {}); } catch {}
}
track('doc_view');
if (new URLSearchParams(location.search).get('via') === 'share') track('doc_share_visit');
function status(message, error = false) { $('status').textContent = message; $('status').classList.toggle('error', error); }
function setBusy(value) {
  busy = value;
  for (const el of document.querySelectorAll('[data-busy-disable], input[type=file]')) el.disabled = value;
  if ($('cancel')) $('cancel').hidden = !value;
  if ($('run')) $('run').disabled = value || !files.filter(Boolean).length;
  $('workspace')?.setAttribute('aria-busy', String(value));
}
function resetResults() {
  for (const url of downloadUrls) URL.revokeObjectURL(url);
  downloadUrls.clear();
  reports = []; failures = []; reviews = {}; comparison = null;
  if ($('results')) { $('results').hidden = true; $('results').replaceChildren(); }
}
function renderFiles() {
  if (mode === 'compare') {
    $('before-name').textContent = files[0]?.name || c.noFile;
    $('after-name').textContent = files[1]?.name || c.noFile;
  } else if ($('file-list')) {
    $('file-list').innerHTML = files.map((file, index) => `<li><span>${esc(file.name)} <small>${(file.size / 1024 / 1024).toFixed(2)} MB</small></span><button type="button" class="remove-file" data-remove="${index}" aria-label="${esc(c.remove + ' ' + file.name)}" ${busy ? 'disabled' : ''}>×</button></li>`).join('');
  }
  $('run').disabled = busy || !files.filter(Boolean).length;
}
function selectFiles(next, slot) {
  if (busy) return;
  epoch++; resetResults(); sample = false;
  if (mode === 'compare') files[slot] = next[0]; else files = [...next];
  renderFiles(); status(c.ready);
}
for (const input of document.querySelectorAll('input[type=file]')) input.addEventListener('change', () => selectFiles(input.files, Number(input.dataset.slot || 0)));
$('file-list')?.addEventListener('click', event => {
  const button = event.target.closest('[data-remove]');
  if (!button || busy) return;
  files.splice(Number(button.dataset.remove), 1); resetResults(); renderFiles(); status(c.ready);
});
const drop = $('drop-zone');
drop?.addEventListener('dragover', event => { event.preventDefault(); if (!busy) drop.classList.add('dragging'); });
drop?.addEventListener('dragleave', () => drop.classList.remove('dragging'));
drop?.addEventListener('drop', event => { event.preventDefault(); drop.classList.remove('dragging'); if (!busy) selectFiles(event.dataTransfer.files, 0); });
$('clear')?.addEventListener('click', () => {
  epoch++; controller?.abort(); files = []; sample = false; resetResults();
  for (const input of document.querySelectorAll('input[type=file]')) input.value = '';
  setBusy(false); renderFiles(); status(c.ready);
});
$('cancel')?.addEventListener('click', () => { epoch++; controller?.abort(); resetResults(); setBusy(false); renderFiles(); status(c.cancelled); });

async function analyze() {
  if (busy) return;
  const chosen = files.filter(Boolean);
  const error = mode === 'compare' && chosen.length !== 2 ? 'twoFiles' : validateFiles(chosen);
  if (error) { status(c.errors[error], true); return; }
  const current = ++epoch;
  controller = new AbortController();
  resetResults(); setBusy(true); renderFiles(); status(c.working);
  track(sample ? 'doc_sample' : 'doc_start');
  let reader;
  try { reader = await import('./pdf-reader.mjs?v=2026-09-25.6'); }
  catch { setBusy(false); status(c.errors.loadFailed, true); return; }
  if (current !== epoch) return;
  let remaining = LIMITS.batchPages;
  for (let index = 0; index < chosen.length; index++) {
    if (current !== epoch) return;
    const file = chosen[index];
    if (!remaining) { failures.push({ name: file.name, message: c.errors.noBudget }); continue; }
    try {
      const result = await reader.readPdf(await file.arrayBuffer(), { name: file.name, signal: controller.signal, pageLimit: Math.min(LIMITS.pages, remaining),
        onProgress: (page, total) => { if (current === epoch) status(`${c.working} ${index + 1}/${chosen.length} · ${c.page} ${page} ${c.of} ${total}`); },
      });
      if (current !== epoch) return;
      reports.push(result); remaining -= result.pages.length;
    } catch (error) {
      if (current !== epoch || error.name === 'AbortError') return;
      failures.push({ name: file.name, message: c.errors[error.message] || c.errors.readFailed });
    }
  }
  if (current !== epoch) return;
  if (mode === 'compare' && reports.length === 2) comparison = compareDocuments(...reports);
  setBusy(false); renderFiles(); renderResults();
  status(reports.length ? c.finished : c.errors.readFailed, !reports.length);
  if (!sample && reports.length === chosen.length && !failures.length && reports.every(r => r.complete)) {
    track('doc_complete');
    if (mode === 'batch') track('doc_batch_complete');
    if (comparison) track('doc_compare_complete');
    if (mode === 'text') track('doc_text_complete');
  } else if (!sample && reports.length) track('doc_partial');
  if (!sample && failures.length) track('doc_error');
  $('results').focus({ preventScroll: true });
}
$('run')?.addEventListener('click', analyze);
$('sample')?.addEventListener('click', async () => {
  if (busy) return;
  const current = ++epoch;
  setBusy(true); status(c.working);
  try {
    const names = mode === 'compare' ? ['sample-before.pdf', 'sample-after.pdf'] : mode === 'batch' ? ['sample-before.pdf', 'sample-image.pdf'] : ['sample-before.pdf'];
    const next = [];
    for (const name of names) {
      const res = await fetch('/document-assets/samples/' + name);
      if (!res.ok) throw new Error('sample');
      next.push(new File([await res.arrayBuffer()], name, { type: 'application/pdf' }));
    }
    if (current !== epoch) return;
    files = next; sample = true; setBusy(false); renderFiles(); await analyze();
  } catch { if (current === epoch) { setBusy(false); status(c.errors.loadFailed, true); } }
});

function findingHTML(finding) {
  const [name, action] = c.checkCopy[finding.code];
  return `<tr><td><span class="status-tag ${finding.status}">${esc(c[finding.status])}</span></td><th scope="row">${esc(name)}${finding.count ? ` <small>(${finding.count})</small>` : ''}</th><td>${finding.page ?? '—'}</td><td>${esc(action)}</td></tr>`;
}
function resultDocument(report, index) {
  const fields = `<dl class="properties"><div><dt>${esc(c.declaredTitle)}</dt><dd>${esc(report.title || c.notDeclared)}</dd></div><div><dt>${esc(c.declaredLanguage)}</dt><dd>${esc(report.language || c.notDeclared)}</dd></div><div><dt>${esc(c.pages)}</dt><dd>${report.pages.length} / ${report.pageCount}</dd></div></dl>`;
  const findings = `<details ${mode === 'audit' && index === 0 ? 'open' : ''}><summary>${esc(c.showFindings)} <span>${report.findings.length}</span></summary><div class="table-scroll" tabindex="0"><table><thead><tr><th>${esc(c.status)}</th><th>${esc(c.check)}</th><th>${esc(c.page)}</th><th>${esc(c.action)}</th></tr></thead><tbody>${report.findings.map(findingHTML).join('')}</tbody></table></div></details>`;
  const review = `<fieldset class="manual-review"><legend>${esc(c.manualTitle)}</legend><p>${esc(c.manualIntro)}</p>${c.manualLabels.map((label, n) => `<label><input type="checkbox" data-review-doc="${index}" data-review-item="${n}"> ${esc(label)}</label>`).join('')}</fieldset>`;
  const text = `<details ${mode === 'text' ? 'open' : ''}><summary>${esc(c.showText)}</summary>${report.pages.map(page => `<section class="extracted-page"><h4>${esc(c.page)} ${page.number}</h4><pre>${esc(page.text || c.emptyText)}</pre></section>`).join('')}</details>`;
  return `<article class="document-result"><header><h3>${esc(report.name)}</h3><span class="status-tag ${report.complete ? 'detected' : 'unknown'}">${esc(report.complete ? c.full : c.incomplete)}</span></header>${fields}${!report.complete ? `<p class="notice warning">${esc(c.partialWarning)}</p>` : ''}${mode === 'text' ? text + findings : findings + review + text}</article>`;
}
function comparisonHTML() {
  if (!comparison) return '';
  const diff = comparison;
  return `<section class="comparison"><h3>${esc(c.diffTitle)}</h3><p>${esc(c.diffScope)}</p><p><strong>${diff.same}</strong> ${esc(c.same)}</p>${!diff.complete ? `<p class="notice warning">${esc(c.partialWarning)}</p>` : ''}${diff.metadata.length ? `<h4>${esc(c.metadata)}</h4><ul>${diff.metadata.map(m => `<li>${esc(c[{ title:'declaredTitle', language:'declaredLanguage', marked:'marked', pageCount:'pages' }[m.key]] || c.checkCopy.marked[0])}: ${esc(m.before)} → ${esc(m.after)}</li>`).join('')}</ul>` : ''}${diff.changes.length ? diff.changes.map(change => `<details open class="diff-block"><summary>${esc(change.kind === 'unknown' ? c.noComparable : c[change.kind])} <small>${change.before || '—'} → ${change.after || '—'}</small></summary><div class="diff-columns"><section><h4>${esc(c.before)} · ${esc(c.page)} ${change.before || '—'}</h4><pre>${esc(change.beforeText || '—')}</pre></section><section><h4>${esc(c.after)} · ${esc(c.page)} ${change.after || '—'}</h4><pre>${esc(change.afterText || '—')}</pre></section></div></details>`).join('') : `<p class="notice">${esc(c.noChanges)}</p>`}</section>`;
}
function renderResults() {
  const target = $('results'); target.hidden = false;
  const total = key => reports.reduce((sum, report) => sum + report.counts[key], 0);
  target.innerHTML = `<div class="result-heading"><div><h2>${esc(c.results)}</h2><p>${esc(c.resultScope)}</p></div>${sample ? `<span class="sample-label">${esc(c.sample)}</span>` : ''}</div>${failures.map(f => `<p class="notice error"><strong>${esc(f.name)}</strong>: ${esc(f.message)}</p>`).join('')}${reports.length ? `<div class="result-metrics"><div><strong>${reports.length}</strong>${esc(c.documents)}</div><div><strong>${reports.reduce((sum, r) => sum + r.pages.length, 0)}</strong>${esc(c.pages)}</div><div><strong>${total('attention')}</strong>${esc(c.issueCount)}</div><div><strong>${total('review')}</strong>${esc(c.reviewCount)}</div></div><div class="actions export-actions"><button data-export="csv">${esc(c.exportCsv)}</button><button data-export="json">${esc(c.exportJson)}</button><button data-export="text">${esc(c.exportText)}</button><button data-export="print">${esc(c.print)}</button></div>${comparisonHTML()}${reports.map(resultDocument).join('')}` : ''}`;
  if (reports.length) {
    const panel = document.createElement('details');
    panel.className = 'summary-share';
    panel.innerHTML = `<summary>${esc(c.shareSummary)}</summary><p>${esc(c.summaryIntro)}</p><label for="summary-preview">${esc(c.summaryLabel)}</label><textarea id="summary-preview" rows="11" readonly></textarea><div class="actions"><button data-copy-share="summary">${esc(c.copySummary)}</button><button data-native-share="summary" hidden>${esc(c.nativeSummary)}</button></div><p id="summary-share-status" role="status" class="small"></p>`;
    target.querySelector('.export-actions').after(panel);
    $('summary-preview').value = summaryText({ reports, failures, comparison, sample, canonical:canonicalUrl() },c);
    enableNativeSharing(panel);
  }
}
$('results')?.addEventListener('change', event => {
  const el = event.target;
  if (!el.matches('[data-review-doc]')) return;
  const index = el.dataset.reviewDoc;
  reviews[index] ||= {};
  reviews[index][['readingOrder', 'alternativesTablesForms', 'textAndVisual'][Number(el.dataset.reviewItem)]] = el.checked;
  if (!sample) track('doc_review');
});
function download(name, data, type) {
  const blob = new Blob([data], { type }); const url = URL.createObjectURL(blob);
  downloadUrls.add(url);
  const a = document.createElement('a'); a.href = url; a.download = name;
  a.textContent = c.saveReport + ' · ' + name;
  let ready = $('download-ready');
  if (!ready) { ready = document.createElement('p'); ready.id = 'download-ready'; ready.className = 'notice'; $('results').querySelector('.export-actions').after(ready); }
  ready.replaceChildren(document.createTextNode(c.downloadReady + ' '), a);
  // A persistent, native link also works when automatic downloads are disabled.
  a.click();
}
$('results')?.addEventListener('click', event => {
  const button = event.target.closest('[data-export]'); if (!button) return;
  const type = button.dataset.export;
  const record = auditExport(reports, reviews); record.failedDocuments = failures;
  if (comparison) record.comparison = comparison;
  if (type === 'json') download('tds-document-review.json', JSON.stringify(record, null, 2), 'application/json');
  if (type === 'csv') download('tds-document-findings.csv', csv([[c.filename, c.status, c.page, c.check, c.action], ...reports.flatMap(r => r.findings.map(f => [r.name, c[f.status], f.page ?? '', ...c.checkCopy[f.code]])), ...failures.map(f => [f.name, c.unknown, '', '', f.message])]), 'text/csv;charset=utf-8');
  if (type === 'text') download('tds-extracted-text.txt', reports.map(r => `${r.name}\n${r.complete ? c.full : c.incomplete}\n\n` + r.pages.map(p => `--- ${c.page} ${p.number} ---\n${p.text || c.emptyText}`).join('\n\n')).join('\n\n==========\n\n'), 'text/plain;charset=utf-8');
  if (type === 'print') { for (const details of $('results').querySelectorAll('details')) details.open = true; window.print(); }
  if (!sample) track('doc_export');
});
function canonicalUrl() { return document.querySelector('link[rel=canonical]').href; }
function shareData(kind) {
  return kind === 'summary' ? { title:c.summaryTitle, text:$('summary-preview').value } : { title:document.title, url:shareUrl(canonicalUrl()) };
}
function enableNativeSharing(root = document) {
  for (const button of root.querySelectorAll('[data-native-share]')) {
    try { button.hidden = !navigator.share || (navigator.canShare && !navigator.canShare(shareData(button.dataset.nativeShare))); }
    catch { button.hidden = true; }
  }
}
enableNativeSharing();
document.addEventListener('click', async event => {
  const button = event.target.closest('[data-copy-share], [data-native-share]');
  if (!button) return;
  const kind = button.dataset.copyShare || button.dataset.nativeShare;
  const output = $(kind === 'summary' ? 'summary-preview' : 'page-share-url');
  const message = $(kind + '-share-status');
  try {
    if (button.hasAttribute('data-native-share')) {
      // Keep this directly inside the user's click: native share requires activation.
      await navigator.share(shareData(kind));
      message.textContent = c.shareOpened;
    } else {
      await navigator.clipboard.writeText(output.value);
      message.textContent = kind === 'summary' ? c.summaryCopied : c.shareCopied;
    }
    if (kind === 'page') track('doc_share');
    else if (!sample) track('doc_summary_share');
  } catch (error) {
    if (error.name === 'AbortError') return;
    message.textContent = c.shareUnavailable;
    output.focus(); output.select();
  }
});
