import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {evaluate,compare,example,newQuote,newPolicy,parseTiers,parseCSV,csv,CSV_FIELDS,snapshot,restore,validDate,EDITION} from '../assets/studio/quote-core.mjs';
import {COPY} from '../assets/studio/quote-copy.mjs';
import {STUDIO_TOOLS} from './studio-pages.mjs';
import {renderResults} from '../assets/studio/quote-view.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const fixtures=JSON.parse(fs.readFileSync(new URL('./fixtures/quote-benchmark.json',import.meta.url),'utf8'));
let checks=0;
const test=(name,fn)=>{try{fn();checks++;}catch(e){throw Error(name+': '+e.message,{cause:e});}};
for(const f of fixtures.cases)test('Reference '+f.input.case_id,()=>{
  const x=f.input,q=newQuote(x.case_id),p={...newPolicy(),required_sku:x.required_sku,requested_units:String(x.requested_units),max_lead_days:String(x.max_lead_days),as_of:x.as_of};
  for(const k of Object.keys(q))if(k in x)q[k]=Array.isArray(q[k])?x[k]:typeof q[k]==='boolean'?x[k]:x[k]===null?'':String(x[k]);
  Object.assign(q,{supplier:'Synthetic '+x.case_id,source_name:x.source_file,source_text:x.source_text,evidence:x.evidence,reviewed:true,fx_rate:x.fx?.rate||'',fx_date:x.fx?.date||'',fx_confirmed:!!x.fx?.approved_by,fx_pair:x.fx?.pair||'',stated_quantity:x.stated_line_total!==null?String(x.requested_units):''});
  const r=evaluate(q,p);assert.equal(r.status,f.expected.status);assert.equal(r.total,f.expected.total_cny);assert.equal(r.ordered_units,f.expected.ordered_units);
  for(const code of f.expected.issue_codes)if(code!=='INVALID_INPUT')assert.ok(r.issues.some(i=>i.code===code),code);
});
const setup=()=>{const s=example('en','2026-09-25');return {p:s.policy,q:s.quotes[0]};};
test('Sample is one shared job; incomplete and unapproved quotes cannot win',()=>{const s=example();const r=compare(s.quotes,s.policy);assert.equal(r.ready.length,1);assert.equal(r.ready[0].total,'1080.00');assert.deepEqual(r.results.map(r=>r.status),['READY','NEEDS_APPROVAL','NEEDS_INPUT']);});
test('Decimal halfway rounding and explicit zero freight',()=>{const {q,p}=setup();p.requested_units='1';q.price_per_quoted_unit='1.005';q.shipping_gross_quote_currency='0';assert.equal(evaluate(q,p).total,'1.01');});
test('Currency conversion uses a confirmed rate and exact cents',()=>{const {q,p}=setup();q.currency='USD';q.price_per_quoted_unit='0.1';q.shipping_gross_quote_currency='0.2';q.fx_rate='7.1';q.fx_date=p.as_of;q.fx_confirmed=true;assert.equal(evaluate(q,p).total,'72.42');});
test('Expired and missing freight keeps exclusion and every issue',()=>{const {q,p}=setup();q.valid_until='2026-09-24';q.shipping_gross_quote_currency='';const r=evaluate(q,p);assert.equal(r.status,'EXCLUDED');assert.equal(r.total,null);assert.ok(r.issues.some(i=>i.code==='SHIPPING_UNKNOWN'));});
test('Wrong box order multiple is blocked',()=>{const {q,p}=setup();q.quoted_unit='box';q.units_per_box='24';q.order_multiple_units='20';assert.equal(evaluate(q,p).status,'BLOCKED');});
test('Extra units and changed SKU require separate approvals',()=>{const {q,p}=setup();q.sku='ALTERNATE';q.moq_units='120';q.order_multiple_units='20';q.overbuy_approved=true;assert.equal(evaluate(q,p).status,'NEEDS_APPROVAL');q.sku_approved=true;assert.equal(evaluate(q,p).status,'READY');});
test('Source subtotal must refer to the quantity being ordered',()=>{const {q,p}=setup();q.stated_line_total='900';q.stated_quantity='90';assert.equal(evaluate(q,p).status,'NEEDS_APPROVAL');q.stated_quantity='100';assert.equal(evaluate(q,p).status,'BLOCKED');});
test('Missing source and review never enter ranking',()=>{const {q,p}=setup();q.source_text='';q.reviewed=false;assert.equal(compare([q],p).ready.length,0);});
test('Empty amounts and hostile number types are not zero',()=>{const {q,p}=setup();for(const v of [true,{},'NaN','Infinity','-1','1e4','1,000','1.0000001'])assert.equal(evaluate({...q,price_per_quoted_unit:v},p).status,'BLOCKED',String(v));assert.equal(evaluate({...q,price_per_quoted_unit:''},p).status,'NEEDS_INPUT');});
test('Boolean strings cannot approve inputs',()=>{const {q,p}=setup();assert.equal(evaluate({...q,reviewed:'true'},p).status,'BLOCKED');});
test('Invalid leap date and future FX date fail closed',()=>{assert.equal(validDate('2026-02-29'),false);const {q,p}=setup();q.currency='USD';q.fx_rate='7';q.fx_date='2026-09-26';q.fx_confirmed=true;assert.equal(evaluate(q,p).status,'NEEDS_INPUT');});
test('Tiers apply after MOQ and reject duplicate thresholds',()=>{const {q,p}=setup();q.moq_units='120';q.overbuy_approved=true;q.tiers=parseTiers('100:9\n120:8');assert.equal(evaluate(q,p).total,'1040.00');q.tiers=parseTiers('100:9\n100:8');assert.equal(evaluate(q,p).status,'BLOCKED');});
test('Negative freight is blocked despite another missing value',()=>{const {q,p}=setup();q.tax_mode='unknown';q.shipping_gross_quote_currency='-1';assert.equal(evaluate(q,p).status,'BLOCKED');});
test('Exact large values and tied ranking are preserved',()=>{const {q,p}=setup();q.price_per_quoted_unit='999999999999.99';q.shipping_gross_quote_currency='0';assert.equal(evaluate(q,p).total,'99999999999999.00');const r=compare([q,{...q,id:'q2'}],p);assert.deepEqual(r.ready.map(r=>r.rank),[1,1]);});
test('CSV quoted commas, double quotes, newlines and BOM roundtrip',()=>{const s=example('en'),q=s.quotes[0];q.supplier='Sample, "A"';q.source_text='Two lines\nsecond line';const parsed=parseCSV(csv([CSV_FIELDS,CSV_FIELDS.map(k=>q[k])]));assert.equal(parsed[0].supplier,q.supplier);assert.equal(parsed[0].source_text,q.source_text);assert.equal(parsed[0].reviewed,false);});
test('CSV exports neutralize formulas and reject malformed or extra columns',()=>{assert.ok(csv([['=cmd',' +SUM(A1)','@x','-1','\t=1']]).split(',').every(s=>s.includes("'")));assert.throws(()=>parseCSV('supplier,sku,price_per_quoted_unit\na,b,"1'));assert.throws(()=>parseCSV('supplier,sku,price_per_quoted_unit,reviewed\na,b,1,true'));assert.throws(()=>parseCSV('supplier,sku,sku\na,b,b'));});
test('Backup preserves source facts but clears every approval',()=>{const {q,p}=setup();Object.assign(q,{overbuy_approved:true,sku_approved:true,fx_confirmed:true});const r=restore(JSON.parse(JSON.stringify(snapshot(p,[q]))));assert.equal(r.quotes[0].source_text,q.source_text);for(const k of ['reviewed','overbuy_approved','sku_approved','fx_confirmed'])assert.equal(r.quotes[0][k],false);assert.equal(compare(r.quotes,r.policy).ready.length,0);});
test('Hostile backups are rejected and arbitrary metadata is not adopted',()=>{const {q,p}=setup();assert.throws(()=>restore({...snapshot(p,[q]),product:'other'}));assert.throws(()=>restore(snapshot(p,Array(11).fill(q))));assert.throws(()=>restore(snapshot(p,[{...q,tiers:[{min_units:'1',price_per_quoted_unit:'Infinity'}]}])));const r=restore(snapshot(p,[{...q,hiddenApproved:true}]));assert.equal(r.quotes[0].hiddenApproved,undefined);});
test('Example identity survives backups without restoring approvals',()=>{const s=example();const r=restore(snapshot(s.policy,s.quotes,true));assert.equal(r.demo,true);assert.equal(r.quotes[0].reviewed,false);assert.equal(restore(snapshot(s.policy,s.quotes)).demo,false);});
test('Rendering escapes supplier text and keeps UI bilingual',()=>{const {q,p}=setup();q.supplier='<img src=x onerror=alert(1)>';q.source_text='<script>alert(1)</script>';const html=renderResults(compare([q],p),[q],p,COPY.en);assert.ok(!html.includes('<img')&&!html.includes('<script>'));assert.ok(html.includes('&lt;img')&&html.includes('&lt;script&gt;'));assert.deepEqual(Object.keys(COPY.zh.issues).sort(),Object.keys(COPY.en.issues).sort());for(const key of Object.keys(COPY.zh))assert.ok(key in COPY.en,key);});

if(process.argv.includes('--dist')){
  for(const [prefix,lang] of [['','zh'],['en/','en']]){
    const read=p=>fs.readFileSync(root+'dist/'+p,'utf8');const hub=read(prefix+'studio/index.html'),quote=read(prefix+'studio/quote-compare.html');
    test(lang+' published first-party hub and canonical identity',()=>{assert.ok(hub.includes('data-studio-nav'));for(const t of STUDIO_TOOLS)assert.ok(hub.includes('https://baipiaoji.com/'+prefix+t.path.slice(1)),t.path);assert.ok(hub.includes(`rel="canonical" href="https://baipiaoji.com/${prefix}studio/"`));assert.ok(quote.includes(`rel="canonical" href="https://baipiaoji.com/${prefix}studio/quote-compare"`));});
    test(lang+' discoverable from home, search and sitemap',()=>{assert.ok(read(prefix+'index.html').includes('id="studio"'));const idx=JSON.parse(read(prefix+'search-index.json'));assert.ok(idx.some(x=>x.u.endsWith('/studio/quote-compare')));assert.ok(read('sitemap.xml').includes(`<loc>https://baipiaoji.com/${prefix}studio/quote-compare</loc>`));assert.ok(read('llms.txt').includes('/studio/quote-compare'));});
    test(lang+' form, provenance, controls and schemas are present',()=>{for(const id of ['qc-example','qc-calculate','qc-results','qc-quote-source_text','qc-quote-reviewed','qc-file','qc-backup'])assert.ok(quote.includes(`id="${id}"`),id);assert.ok(quote.includes(`data-edition="${EDITION}"`));const schemas=[...quote.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1]));assert.ok(schemas.some(s=>s['@type']==='WebApplication'&&s.creator.name==='BPJ'));assert.ok(schemas.some(s=>s['@type']==='FAQPage'&&s.mainEntity.length===3));});
  }
  test('All locally imported modules are shipped; no third-party script in the tool',()=>{for(const f of ['quote-core.mjs','quote-copy.mjs','quote-view.mjs','quote-app.mjs','studio.css'])assert.ok(fs.existsSync(root+'dist/studio-assets/'+f));const app=fs.readFileSync(root+'dist/studio-assets/quote-app.mjs','utf8');assert.ok(!/fetch\(|XMLHttpRequest|\.postMessage/.test(app));assert.ok(app.includes("has('__ci')"));assert.ok(app.includes("'/studio/quote-compare/'"));});
}
console.log(`BPJ studio: ${checks} checks passed (including ${fixtures.cases.length} synthetic reference cases).`);
