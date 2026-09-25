// Deterministic document triage. A detected signal is not a conformance verdict.
export const VERSION = '2026-09-25.1';
export const LIMITS = Object.freeze({ files: 10, fileBytes: 20 * 1024 * 1024, batchBytes: 100 * 1024 * 1024, pages: 200, batchPages: 600, pageChars: 100000, totalChars: 2000000 });
export const normalizeText = value => String(value || '').normalize('NFKC').replace(/\s+/gu, ' ').trim();

export function structureFacts(tree) {
  const facts = { hasTree: !!tree, figures: 0, missingAlt: 0, headings: [], tables: 0 };
  if (!tree) return facts;
  const pending = [tree];
  let visited = 0;
  while (pending.length && visited++ < 100000) {
    const item = pending.pop();
    if (!item || typeof item !== 'object') continue;
    const role = item.role || '';
    if (role === 'Figure' || role === 'Formula') {
      facts.figures++;
      if (!normalizeText(item.alt) && !normalizeText(item.actualText)) facts.missingAlt++;
    }
    if (/^H[1-6]$/.test(role)) facts.headings.push(Number(role.slice(1)));
    if (role === 'Table') facts.tables++;
    for (const child of [...(item.children || [])].reverse()) pending.push(child);
  }
  facts.truncated = pending.length > 0;
  return facts;
}

export function auditDocument(doc) {
  const findings = [];
  const add = (code, status, page = null, count = null) => findings.push({ code, status, page, count });
  add('title', normalizeText(doc.title) ? 'detected' : 'attention');
  // A language code is only a declaration. Its agreement with content is manual.
  add('language', normalizeText(doc.language) ? 'detected' : 'attention');
  add('marked', doc.marked === true ? 'detected' : 'attention');
  let lastHeading = 0;
  for (const page of doc.pages) {
    if (page.error) { add('pageUnreadable', 'unknown', page.number); continue; }
    if (!page.characters) add('noText', 'attention', page.number);
    if (!page.structure.hasTree && page.characters) add('noStructure', 'attention', page.number);
    if (page.structure.missingAlt) add('missingAlt', 'attention', page.number, page.structure.missingAlt);
    if (page.structure.truncated || page.textTruncated) add('limitedPage', 'unknown', page.number);
    for (const level of page.structure.headings) {
      if (level > lastHeading + 1) add('headingJump', 'review', page.number);
      lastHeading = level;
    }
    if (page.structure.tables) add('tables', 'review', page.number, page.structure.tables);
    if (page.forms) add('forms', 'review', page.number, page.forms);
  }
  if (doc.pageCount > doc.pages.length) add('partial', 'unknown', null, doc.pageCount - doc.pages.length);
  if (doc.pageCount > 20 && !doc.outlineCount) add('bookmarks', 'review');
  add('readingOrder', 'review');
  add('visualMeaning', 'review');
  if (doc.pages.some(p => p.structure?.figures)) add('altQuality', 'review');
  if (doc.language) add('languageAccuracy', 'review');
  return { ...doc, version: VERSION, findings,
    counts: Object.fromEntries(['attention', 'detected', 'review', 'unknown'].map(status => [status, findings.filter(f => f.status === status).length])),
    complete: doc.pages.length === doc.pageCount && doc.pages.every(p => !p.error && !p.textTruncated && !p.structure.truncated),
  };
}

export function validateFiles(files) {
  if (!files.length) return 'chooseFiles';
  if (files.length > LIMITS.files) return 'tooMany';
  if (files.some(f => f.size > LIMITS.fileBytes)) return 'tooLarge';
  if (files.reduce((sum, f) => sum + f.size, 0) > LIMITS.batchBytes) return 'batchLarge';
  if (files.some(f => !/\.pdf$/i.test(f.name) && f.type !== 'application/pdf')) return 'notPdf';
  return null;
}

// Page alignment preserves unchanged pages when pages are inserted or removed.
// No visual/layout identity claim is made from text equality.
export function compareDocuments(before, after) {
  const a = before.pages, b = after.pages;
  const ta = a.map(p => normalizeText(p.text)), tb = b.map(p => normalizeText(p.text));
  const match = (i, j) => !!ta[i] && ta[i] === tb[j] && !a[i].error && !b[j].error && !a[i].textTruncated && !b[j].textTruncated;
  const dp = Array.from({ length: a.length + 1 }, () => new Uint16Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) dp[i][j] = match(i, j) ? 1 + dp[i + 1][j + 1] : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const anchors = [];
  let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    if (match(i, j)) { anchors.push([i++, j++]); }
    else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++;
  }
  anchors.push([a.length, b.length]);
  const changes = [];
  let ai = 0, bi = 0, same = 0;
  for (const [an, bn] of anchors) {
    const span = Math.max(an - ai, bn - bi);
    for (let k = 0; k < span; k++) {
      const left = ai + k < an ? a[ai + k] : null;
      const right = bi + k < bn ? b[bi + k] : null;
      const unknown = [left, right].filter(Boolean).some(p => p.error || !normalizeText(p.text) || p.textTruncated);
      changes.push({ kind: unknown ? 'unknown' : !left ? 'added' : !right ? 'removed' : 'changed', before: left?.number ?? null, after: right?.number ?? null, beforeText: left?.text || '', afterText: right?.text || '' });
    }
    if (an < a.length && bn < b.length) same++;
    ai = an + 1; bi = bn + 1;
  }
  return { same, changes, complete: before.complete && after.complete,
    metadata: ['title', 'language', 'marked', 'pageCount'].filter(key => before[key] !== after[key]).map(key => ({ key, before: before[key], after: after[key] })),
  };
}

export function csvCell(value) {
  let text = String(value ?? '');
  if (/^[\s]*[=+@-]/.test(text) || /^[\t\r]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}
export function csv(rows) { return '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n'); }
export function auditExport(reports, reviews = {}) {
  return { schema: 'tds-document-review/v1', version: VERSION, generatedAt: new Date().toISOString(), scope: 'Automated preflight and user-recorded review. Not accessibility certification. Files and extracted text are not uploaded.',
    documents: reports.map(({ name, size, pageCount, title, language, marked, complete, counts, findings, pages }, index) => ({ name, size, pageCount, title, language, marked, complete, counts, findings,
      inspectedPages: pages.length, manualReview: reviews[index] || {},
      pages: pages.map(({ number, characters, structure, forms, error, textTruncated }) => ({ number, characters, structure, forms, error, textTruncated })),
    })),
  };
}
