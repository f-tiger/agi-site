// Explicit allowlist: document strings must never enter a public share payload.
const ORIGIN = 'https://thedollscout.com';
const PAGE = /^\/(?:(?:de|zh)\/)?(?:(?:delivery-evidence|pdf-accessibility-checker|pdf-batch-audit|pdf-to-text|compare-pdf-text|methodology|document-privacy|collectors)|learn\/(?:pdf-accessibility-checklist|scanned-pdf-vs-text-pdf|pdf-reading-order))?$/;
export function shareUrl(canonical) {
  const url = new URL(canonical, ORIGIN);
  if (url.origin !== ORIGIN || !PAGE.test(url.pathname)) throw new Error('Unrecognized public page');
  return ORIGIN + url.pathname + '?via=share';
}
const count = value => Number.isSafeInteger(value) && value >= 0 ? value : 0;
export function summaryText({ reports = [], failures = [], comparison = null, sample = false, canonical }, c) {
  const total = key => reports.reduce((n, r) => n + count(r.counts?.[key]), 0);
  const lines = [c.summaryTitle];
  if (sample) lines.push(c.summarySample);
  lines.push(reports.length && !failures.length && reports.every(r => r.complete) ? c.summaryComplete : c.summaryPartial);
  lines.push(`${c.documents}: ${reports.length}`, `${c.pages}: ${reports.reduce((n,r) => n + (Array.isArray(r.pages) ? r.pages.length : 0), 0)}`,
    `${c.issueCount}: ${total('attention')}`, `${c.reviewCount}: ${total('review')}`, `${c.summaryUnknown}: ${total('unknown')}`, `${c.summaryFailures}: ${failures.length}`);
  if (comparison) {
    const changes = ['changed','added','removed','unknown'].map(kind => comparison.changes.filter(v => v.kind === kind).length);
    lines.push(`${c.summaryDiff} · ${c.same}: ${count(comparison.same)}`, `${c.summaryChanges}: ${changes.join(' / ')}`, c.diffScope);
  }
  lines.push('', c.resultScope, shareUrl(canonical));
  return lines.join('\n');
}
