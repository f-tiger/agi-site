import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { fixture } from './fixtures.mjs';
import { readPdf } from '../../document-assets/pdf-reader.mjs';
import { auditDocument, compareDocuments, structureFacts, validateFiles, csvCell, auditExport, LIMITS } from '../../document-assets/core.mjs';
import { onRequestPost, safeRef } from '../../functions/api/doc-events.js';
import { onRequestGet } from '../../functions/api/document-stats.js';
import { copy } from './copy.mjs';
const parse = async (kind, options = {}) => readPdf(await fixture(kind), { library:pdfjs, ...options });
test('compressed real PDF: text, title and /Lang are actually parsed', async () => {
  const report = await parse('after');
  assert.equal(report.pageCount, 3); assert.equal(report.language, 'en-US');
  assert.equal(report.title, 'Fictional workshop handout');
  assert.match(report.pages[0].text, /10:30/); assert.equal(report.complete, true);
  assert.ok(report.findings.some(f => f.code === 'noStructure' && f.status === 'attention'));
  assert.ok(report.findings.some(f => f.code === 'readingOrder' && f.status === 'review'));
  assert.ok(!report.findings.some(f => f.status === 'pass'));
});
test('tagged fixture exposes a Figure without an alternative', async () => {
  const report = await parse('tagged');
  assert.equal(report.marked, true);
  assert.equal(report.pages[0].structure.figures, 1);
  assert.ok(report.findings.some(f => f.code === 'missingAlt' && f.page === 1));
});
test('image-only or blank pages never become a text equality result', async () => {
  const a = await parse('image'), b = await parse('image');
  assert.equal(a.pages[0].characters, 0);
  assert.ok(a.findings.some(f => f.code === 'noText'));
  const diff = compareDocuments(a, b); assert.equal(diff.same, 0); assert.equal(diff.changes[0].kind, 'unknown');
});
test('page cap is explicit and surviving findings do not imply a complete audit', async () => {
  const a = await parse('long', { pageLimit:2 });
  assert.equal(a.pageCount, 203); assert.equal(a.pages.length, 2); assert.equal(a.complete, false);
  assert.equal(a.findings.find(f => f.code === 'partial').count, 201);
  const diff = compareDocuments(a, a); assert.equal(diff.complete, false);
});
test('invalid, oversized, password-protected and cancelled inputs fail explicitly', async () => {
  await assert.rejects(readPdf(new TextEncoder().encode('not PDF'), { library:pdfjs }), /invalidPdf/);
  await assert.rejects(readPdf(new TextEncoder().encode('%PDF-1.7\nBROKEN'), { library:pdfjs }));
  await assert.rejects(readPdf(new Uint8Array(LIMITS.fileBytes + 1), { library:pdfjs }), /tooLarge/);
  const locked = new Uint8Array(fs.readFileSync(new URL('./fixtures/password.pdf', import.meta.url)));
  await assert.rejects(readPdf(locked, { library:pdfjs }), /passwordPdf/);
  await assert.rejects(parse('before', { signal:AbortSignal.abort() }), { name:'AbortError' });
});
const document = texts => auditDocument({ name:'fixture.pdf', title:'', language:'', marked:false, pageCount:texts.length, pages:texts.map((text, i) => ({ number:i+1, text, characters:text.length, structure:structureFacts(null), forms:0 })) });
test('inserting a page preserves unchanged pages rather than shifting the diff', () => {
  const result = compareDocuments(document(['A first page', 'B second page']), document(['Inserted', 'A first page', 'B second page']));
  assert.equal(result.same, 2); assert.equal(result.changes.length, 1);
  assert.deepEqual([result.changes[0].kind,result.changes[0].before,result.changes[0].after], ['added',null,1]);
  assert.equal(compareDocuments(document(['Same\ntext']), document(['Same  text'])).same, 1);
});
test('real sample: revisions on both pages plus an insertion keep the insertion in place', async () => {
  const before = await parse('before'), after = await parse('after');
  const result = compareDocuments(before,after);
  assert.deepEqual(result.changes.map(c => [c.kind,c.before,c.after]), [['changed',1,1],['added',null,2],['changed',2,3]]);
});
test('tree reading preserves heading order, supports actualText, and treats tables as review', () => {
  const f = structureFacts({ role:'Document', children:[{ role:'H1' }, { role:'H3' }, { role:'Figure', actualText:'Text equivalent' }, { role:'Formula', alt:' ' }, { role:'Table' }] });
  assert.deepEqual(f.headings,[1,3]); assert.equal(f.missingAlt,1); assert.equal(f.tables,1);
});
test('limits and exports handle hostile filenames without formulas or implicit review', () => {
  assert.equal(validateFiles(Array(11).fill({ size:1, name:'a.pdf' })), 'tooMany');
  assert.equal(validateFiles([{ size:1, name:'not.txt' }]), 'notPdf');
  assert.equal(validateFiles(Array(6).fill({ size:20*1024*1024, name:'a.pdf' })), 'batchLarge');
  assert.equal(csvCell('=HYPERLINK("evil")'), '"\'=HYPERLINK(""evil"")"');
  const a = document(['PRIVATE DOCUMENT TEXT']);
  const exported = auditExport([a]);
  assert.ok(!JSON.stringify(exported).includes('PRIVATE DOCUMENT TEXT'));
  assert.deepEqual(exported.documents[0].manualReview, {});
});
test('all three locales have the same UI and finding keys', () => {
  for (const lang of ['de','zh']) {
    assert.deepEqual(Object.keys(copy[lang]).sort(),Object.keys(copy.en).sort());
    assert.deepEqual(Object.keys(copy[lang].checkCopy).sort(),Object.keys(copy.en.checkCopy).sort());
    assert.deepEqual(Object.keys(copy[lang].errors).sort(),Object.keys(copy.en.errors).sort());
  }
});
async function event(body, extra = {}) {
  const bound = [];
  const env = { HITS:{ prepare:() => ({ bind:(...args) => ({ run:async () => bound.push(args) }) }) } };
  const request = new Request('https://thedollscout.com/api/doc-events', { method:'POST', headers:{ origin:'https://thedollscout.com', 'user-agent':'Browser fixture', ...extra }, body:JSON.stringify(body) });
  const response = await onRequestPost({ request, env }); return { response, bound };
}
test('events store only bounded metadata and strip referrer paths', async () => {
  const { response, bound } = await event({ p:'/de/pdf-batch-audit', e:'doc_complete', r:'https://www.google.com/search?q=private' });
  assert.equal(response.status,204); assert.equal(bound.length,1);
  assert.equal(bound[0][2],'de'); assert.equal(bound[0][4],'www.google.com');
  assert.equal(safeRef('file:///private/document.pdf'),'');
  for (const body of [{ p:'/', e:'arbitrary' }, { p:'/private-filename.pdf', e:'doc_view' }, { p:'/', e:'doc_view', text:'private' }]) assert.equal((await event(body)).bound.length,0);
});
test('CI, bots, cross-site posts, opt-outs and samples cannot inflate real completion', async () => {
  const body = { p:'/', e:'doc_complete' };
  for (const headers of [{ origin:'https://elsewhere.example' }, { 'user-agent':'HeadlessChrome' }, { dnt:'1' }, { 'x-probe':'1' }]) assert.equal((await event(body, headers)).bound.length,0);
  const ci = await event({ p:'/__ci/documents', e:'doc_ci' }, { 'user-agent':'document-probe' });
  assert.equal(ci.bound[0][5],'doc_ci'); assert.equal(ci.bound[0][1],'/__ci/documents');
  const sql = [];
  const res = await onRequestGet({ env:{ HITS:{ prepare:s => { sql.push(s); return { all:async () => ({ results:[] }) }; } } } });
  assert.equal(res.status,200);
  for (const s of sql.slice(0,4)) assert.match(s,/NOT IN \('doc_ci','doc_sample'\)/);
  assert.match((await res.json()).unit,/Not unique users/);
});
