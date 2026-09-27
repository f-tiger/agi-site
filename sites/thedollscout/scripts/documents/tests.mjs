import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { fixture } from './fixtures.mjs';
import { readPdf } from '../../document-assets/pdf-reader.mjs';
import { auditDocument, compareDocuments, structureFacts, validateFiles, csvCell, auditExport, LIMITS } from '../../document-assets/core.mjs';
import { onRequestPost, safeRef, databaseFailure } from '../../functions/api/doc-events.js';
import { onRequestGet, aggregateDocuments, DOCUMENT_QUERY } from '../../functions/api/document-stats.js';
import { cachedAggregate } from '../../lib/aggregate-cache.js';
import { copy } from './copy.mjs';
import { shareUrl, summaryText } from '../../document-assets/sharing.mjs';
import { fingerprint, deliveryRecord, parseDeliveryRecord, compareInventory, recordHTML, validateDeliveryFiles } from '../../document-assets/delivery-core.mjs';
import { deliveryCopy } from './delivery-copy.mjs';
import { parseReference, referenceURL, referenceEmbed, compareReference } from '../../document-assets/verify-core.mjs';
import { verifyCopy } from './verify-copy.mjs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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
test('shared summaries never include file identifiers, contents, notes or comparison text', async () => {
  const a = await parse('before');
  a.name = 'PRIVATE-NAME.pdf'; a.title = 'PRIVATE-TITLE'; a.pages[0].text = 'PRIVATE-BODY';
  a.manualReview = { notes:'PRIVATE-NOTE' };
  const comparison = { same:1, changes:[{ kind:'changed', beforeText:'PRIVATE-BEFORE', afterText:'PRIVATE-AFTER' }] };
  for (const c of Object.values(copy)) {
    const text = summaryText({ reports:[a], failures:[{ name:'PRIVATE-FAILURE', message:'PRIVATE-ERROR' }], comparison, sample:true, canonical:'https://thedollscout.com/zh/compare-pdf-text?filename=PRIVATE-QUERY#PRIVATE-HASH' },c);
    assert.ok(!text.includes('PRIVATE-'));
    assert.ok(text.includes(c.summarySample));
    assert.ok(text.includes(c.summaryPartial));
    assert.ok(text.includes(c.resultScope));
    assert.ok(text.includes(c.diffScope));
    assert.ok(text.endsWith('https://thedollscout.com/zh/compare-pdf-text?via=share'));
  }
});
test('share URLs accept only public document routes and remove arbitrary query data', () => {
  assert.equal(shareUrl('https://thedollscout.com/de/?ci=1#secret'),'https://thedollscout.com/de/?via=share');
  assert.equal(shareUrl('/learn/pdf-reading-order'), 'https://thedollscout.com/learn/pdf-reading-order?via=share');
  for (const url of ['https://evil.example/zh/','/private.pdf','/api/doc-events','javascript:alert(1)']) assert.throws(() => shareUrl(url));
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
  for (const e of ['doc_share','doc_summary_share','doc_share_visit']) {
    assert.equal((await event({ p:'/zh/pdf-batch-audit', e })).bound.length,1);
    assert.equal((await event({ p:'/zh/pdf-batch-audit', e, summary:'private' })).bound.length,0);
  }
});
test('CI, bots, cross-site posts, opt-outs and samples cannot inflate real completion', async () => {
  const body = { p:'/', e:'doc_complete' };
  for (const headers of [{ origin:'https://elsewhere.example' }, { 'user-agent':'HeadlessChrome' }, { dnt:'1' }, { 'x-probe':'1' }]) assert.equal((await event(body, headers)).bound.length,0);
  const ci = await event({ p:'/__ci/documents', e:'doc_ci' }, { 'user-agent':'document-probe' });
  assert.equal(ci.bound[0][5],'doc_ci'); assert.equal(ci.bound[0][1],'/__ci/documents');
  const sql = [];
  const res = await onRequestGet({ env:{ HITS:{ prepare:s => { sql.push(s); return { all:async () => ({ results:[] }) }; } } } });
  assert.equal(res.status,200);
  assert.equal(sql.length,1); assert.equal(sql[0],DOCUMENT_QUERY);
  assert.match((await res.json()).unit,/Not unique users/);
});
test('single-query statistics preserve totals while separating samples, CI and crawlers',()=>{
 const rows=[['doc_view','/',2,'google.com'],['doc_view','/delivery-evidence',3,''],['doc_delivery_complete','/delivery-evidence',1,''],['doc_ci','/__ci/documents',7,''],['doc_delivery_sample','/delivery-evidence',9,''],['doc_complete','/__ci/other',11,''],['bot','/delivery-evidence',12,'Googlebot']].map(([ev,path,n,ref])=>({d:'2026-09-25',ev,path,n,ref}));
 const d=aggregateDocuments(rows);assert.equal(d.events.doc_view,5);assert.equal(d.tool_views,5);assert.equal(d.events.doc_delivery_complete,1);assert.equal(d.events.doc_complete,undefined);assert.equal(d.excluded.doc_ci,7);assert.equal(d.excluded.doc_delivery_sample,9);assert.equal(d.crawler_fetches[0].n,12);assert.equal(d.daily.reduce((n,r)=>n+r.n,0),6);
});
test('aggregate cache avoids duplicate reads, bypasses probes and never caches failures',async()=>{
 const saved=new Map();const cache={match:async r=>saved.get(r.url)?.clone(),put:async(r,s)=>{saved.set(r.url,s.clone());}};let calls=0;
 const compute=async()=>{calls++;return new Response('{"ok":true}',{headers:{'content-type':'application/json'}});};
 const ctx={request:new Request('https://thedollscout.com/api/document-stats?ignored=1')};
 assert.equal((await cachedAggregate(ctx,compute,cache)).headers.get('x-tds-aggregate-cache'),'miss');
 assert.equal((await cachedAggregate({...ctx,request:new Request('https://thedollscout.com/api/document-stats')},compute,cache)).headers.get('x-tds-aggregate-cache'),'hit');assert.equal(calls,1);
 await cachedAggregate({request:new Request(ctx.request,{headers:{'x-probe':'1'}})},compute,cache);assert.equal(calls,2);
 saved.clear();const failed=await cachedAggregate(ctx,async()=>new Response('{"ok":false}',{status:500}),cache);assert.equal(failed.status,500);assert.equal(saved.size,0);
});
test('actual SQLite query filters dates and unrelated legacy events without losing CI diagnostics',()=>{
 const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE hits(d TEXT, ev TEXT, path TEXT, ref TEXT)');
 const insert=db.prepare('INSERT INTO hits VALUES(?,?,?,?)');const today=new Date().toISOString().slice(0,10);
 for(const [d,ev,path] of [[today,'doc_view','/'],[today,'doc_view','/'],[today,'doc_ci','/__ci/documents'],[today,'bot','/delivery-evidence'],[today,'bot','/rarity'],[today,'','/'],['2026-01-01','doc_view','/']])insert.run(d,ev,path,'');
 const rows=db.prepare(DOCUMENT_QUERY).all();assert.equal(rows.length,3);const result=aggregateDocuments(rows);assert.equal(result.events.doc_view,2);assert.equal(result.excluded.doc_ci,1);assert.equal(result.crawler_fetches[0].n,1);db.close();
});
test('delivery fingerprints use known SHA-256 and distinguish changed, missing and extra files', async () => {
  const file = new File(['abc'],'client.txt');
  const f = await fingerprint(file);
  assert.equal(f.sha256,'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  const r = deliveryRecord([f],{project:'Original',acceptance:''});
  const parsed = parseDeliveryRecord(JSON.stringify({...r,attestation:{consentVerified:true}}));
  assert.equal(parsed.attestation,undefined);
  assert.equal(r.attestation.consentVerified,false); assert.equal(r.notes.acceptance,'');
  assert.equal(compareInventory(parsed,[f])[0].status,'match');
  const changed = await fingerprint(new File(['abd'],'client.txt'));
  assert.equal(compareInventory(parsed,[changed])[0].status,'changed');
  assert.deepEqual(compareInventory(parsed,[{...f,name:'renamed.txt'}]).map(x=>x.status),['missing','extra']);
});
test('delivery exports escape hostile notes; imports reject malformed hashes and duplicate names', async () => {
  const f=await fingerprint(new File(['abc'],'<script>alert(1)</script>.txt'));
  const r=deliveryRecord([f],{project:'<img src=x onerror=alert(1)>',delivery:'<script>sendSecrets()</script>'});
  const html=recordHTML(r);
  assert.ok(!html.includes('<script>')&&!html.includes('<img src=x'));
  assert.ok(html.includes('default-src')&&html.includes('&lt;script&gt;'));
  assert.throws(()=>parseDeliveryRecord(JSON.stringify({...r,files:[{...f,sha256:'x'}]})));
  assert.throws(()=>parseDeliveryRecord(JSON.stringify({...r,version:2})));
  assert.throws(()=>parseDeliveryRecord(JSON.stringify({...r,files:[f,f]})));
  assert.throws(()=>validateDeliveryFiles([{name:'same',size:1},{name:'same',size:2}]),/names/);
  assert.throws(()=>validateDeliveryFiles([{name:'large',size:21*1024*1024}]),/size/);
  for(const lang of ['de','zh'])assert.deepEqual(Object.keys(deliveryCopy[lang]).sort(),Object.keys(deliveryCopy.en).sort());
});
test('delivery demand stays categorical and samples stay separate; storage failure is not a bad request', async () => {
  assert.equal(shareUrl('/delivery-evidence?private=secret'),'https://thedollscout.com/delivery-evidence?via=share');
  assert.equal((await event({p:'/delivery-evidence',e:'doc_delivery_interest_repeat_team'})).bound.length,1);
  assert.equal((await event({p:'/delivery-evidence',e:'doc_delivery_interest_repeat_team',email:'private'})).bound.length,0);
  const request=new Request('https://thedollscout.com/api/doc-events',{method:'POST',headers:{origin:'https://thedollscout.com'},body:JSON.stringify({p:'/delivery-evidence',e:'doc_delivery_complete'})});
  const res=await onRequestPost({request,env:{HITS:{prepare:()=>({bind:()=>({run:async()=>{throw Error('Internal private error');}})})}}});
  assert.equal(res.status,503); assert.deepEqual(await res.json(),{ok:false,error:'storage_unavailable',reason:'unknown'});
  assert.equal(databaseFailure(Error('daily read quota exceeded')),'daily_limit');
  assert.equal(databaseFailure(Error('internal error; reference=PRIVATE')),'internal');
  assert.equal(databaseFailure(Error('no such column: PRIVATE')),'schema');
});
test('portable reference ignores names and notes, matches renamed bytes and rejects altered bytes',async()=>{
 const original=await fingerprint(new File(['abc'],'PRIVATE-CONTRACT.txt'));
 const url=referenceURL({...original,project:'SECRET'},'zh');
 assert.ok(!url.includes('PRIVATE')&&!url.includes('SECRET'));
 assert.equal(new URL(url).search,'?via=recipient');
 assert.equal(shareUrl(url),'https://thedollscout.com/zh/verify-file?via=share');
 const expected=parseReference(url);
 assert.equal(compareReference(expected,await fingerprint(new File(['abc'],'renamed.txt'))),true);
 assert.equal(compareReference(expected,await fingerprint(new File(['abc\n'],'PRIVATE-CONTRACT.txt'))),false);
 assert.equal(compareReference(expected,{...expected,bytes:4}),false);
 assert.ok(referenceEmbed(original).includes('Check this file with TDS'));
 assert.ok(recordHTML(deliveryRecord([original],{})).includes(referenceURL(original)));
});
test('reference parser rejects hostile origins, malformed hashes, versions and size overflow',()=>{
 const r={sha256:'a'.repeat(64),bytes:3},url=referenceURL(r);
 assert.deepEqual(parseReference(url),r);
 assert.deepEqual(parseReference(new URL(url).hash),r);
 for(const bad of [url.replace('thedollscout.com','evil.example'),url.replace('/verify-file','/not-a-tool'),url.replace('https:','javascript:'),url.replace('v1=','v2='),url.replace('.3','.03'),url.replace('.3','.20971521'),url.replace('.3','.-1'),url.replace('a'.repeat(64),'A'.repeat(64)),url+'%22><script>',url.replace('https://','https://user@')])assert.throws(()=>parseReference(bad));
 assert.throws(()=>referenceURL({sha256:'a'.repeat(64),bytes:NaN}));
 assert.throws(()=>referenceURL({sha256:'<script>',bytes:3}));
 assert.throws(()=>parseReference('x'.repeat(513)));
 assert.equal(parseReference(referenceURL({sha256:'a'.repeat(64),bytes:0})).bytes,0);
});
test('independent offline CLI agrees on match, mismatch and invalid reference',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'tds-verify-')),file=path.join(dir,'example.txt');
 try{
  const cli=fileURLToPath(new URL('../../document-assets/verify-file-cli.mjs',import.meta.url));
  const url=referenceURL({sha256:'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',bytes:3});
  fs.writeFileSync(file,'abc');let out=spawnSync(process.execPath,[cli,file,url],{encoding:'utf8'});
  assert.equal(out.status,0,out.stderr);assert.equal(JSON.parse(out.stdout).result,'match');
  fs.writeFileSync(file,'abd');out=spawnSync(process.execPath,[cli,file,url],{encoding:'utf8'});
  assert.equal(out.status,1);assert.equal(JSON.parse(out.stdout).result,'different');
  assert.equal(spawnSync(process.execPath,[cli,file,url.replace('v1','v2')]).status,2);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('recipient counters stay anonymous and never promote samples into completed checks',async()=>{
 for(const e of ['doc_verify_recipient','doc_verify_match','doc_verify_share','doc_verify_embed']){
  assert.equal((await event({p:'/verify-file',e})).bound.length,1);
  assert.equal((await event({p:'/verify-file',e,hash:'private'})).bound.length,0);
  assert.equal((await event({p:'/verify-file#private',e})).bound.length,0);
 }
 const result=aggregateDocuments([{d:'2026-09-25',ev:'doc_verify_sample',path:'/verify-file',ref:'',n:7},{d:'2026-09-25',ev:'doc_view',path:'/verify-file',ref:'',n:2}]);
 assert.equal(result.excluded.doc_verify_sample,7);assert.equal(result.events.doc_verify_sample,undefined);assert.equal(result.tool_views,2);
 for(const lang of ['de','zh'])assert.deepEqual(Object.keys(verifyCopy[lang]).sort(),Object.keys(verifyCopy.en).sort());
});
