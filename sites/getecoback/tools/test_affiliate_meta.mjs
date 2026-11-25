import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {
  affiliateMeta, taggedCellarModelEntry, WINDOW_TIKTOK_GUIDE_DOCUMENT, WINDOW_TIKTOK_GUIDE_PAGE,
  WINDOW_TIKTOK_WIDTH_EVENT,
} from '../src/affiliate-meta.mjs';
import {AFFILIATE_SQL, affiliateMetrics} from '../src/affiliate-metrics.mjs';
import {CELLAR_MODEL_ENTRY_DOCUMENT, CELLAR_MODEL_ENTRY_PAGE, CELLAR_MODEL_ENTRY_URL, CELLAR_MODEL_SEARCH} from '../src/cellar-entry.mjs';
import {WINDOW_ENTRY_DOCUMENT, WINDOW_ENTRY_PAGE} from '../src/fenstersauger-entry.mjs';
import {PORTASPLIT_ENTRY_DOCUMENT, PORTASPLIT_ENTRY_PAGE, PORTASPLIT_PRODUCT_URL} from '../src/portasplit-entry.mjs';
import {N90_ENTRY_DOCUMENT, N90_ENTRY_PAGE, N90_PRODUCT_URL} from '../src/n90-entry.mjs';
import worker from '../src/worker.js';

const product = 'https://www.amazon.de/dp/B07NC5CP6F?tag=getecoback-21';
async function record(body, headers = {}) {
  const rows = [];
  const env = {EVENTS: {prepare(sql) {
    if (sql.startsWith('INSERT INTO ua_audit')) return {bind: () => ({run: async () => {}})};
    assert.match(sql, /^INSERT INTO ev/);
    return {bind(...values) {return {run: async () => {rows.push(values);}};}};
  }}};
  const request = new Request('https://getecoback.com/api/ev', {
    method: 'POST', headers: {'content-type': 'text/plain', 'user-agent': 'Mozilla/5.0', ...headers},
    body: JSON.stringify(body),
  });
  const response = await worker.fetch(request, env, {waitUntil() {}});
  return {status: response.status, body: await response.json(), rows};
}

test('long merged affiliate metadata survives the real handler as complete JSON', async () => {
  const meta = {link_url: 'https://www.amazon.de/' + 'product-title-'.repeat(50) +
    '/dp/B07NC5CP6F/ref=private-path?tag=getecoback-21&email=private@example.test#token',
    page_path: '/guide/luftentfeuchter-25-qm.html?email=private@example.test#token',
    source: 'toppick', merchant: 'amazon', page: '/guide/luftentfeuchter-25-qm.html',
    email: 'private@example.test', private_input: {token: 'secret'}};
  assert.throws(() => JSON.parse(JSON.stringify(meta).slice(0, 200)), SyntaxError);
  const result = await record({n: 'affiliate_click', p: '/guide/luftentfeuchter-25-qm.html',
    r: 'https://www.bing.com/search?q=private', m: meta});
  assert.equal(result.status, 200); assert.equal(result.body.ok, true);
  assert.equal(result.rows.length, 1);
  const [, name, page, ref, stored] = result.rows[0];
  assert.equal(name, 'affiliate_click'); assert.equal(page, '/guide/luftentfeuchter-25-qm.html');
  assert.equal(ref, 'www.bing.com');
  assert.deepEqual(JSON.parse(stored), {source: 'toppick', merchant: 'amazon',
    page: '/guide/luftentfeuchter-25-qm.html', page_path: '/guide/luftentfeuchter-25-qm.html', link_url: product});
  assert.doesNotMatch(stored, /private|secret|email|token/);
});

test('quotes, backslashes and Unicode stay valid with per-field UTF-8 bounds', () => {
  const small = '"\\ Kühler 🧊';
  assert.equal(JSON.parse(affiliateMeta({source: small})).source, small);
  for (const value of ['"\\'.repeat(1000), '🧊'.repeat(1000), '漢'.repeat(1000), '\ud800'.repeat(1000)]) {
    const stored = affiliateMeta({source: value, merchant: value, page: '/' + 'a'.repeat(190),
      page_path: '/' + 'b'.repeat(190), link_url: 'https://example.test/' + 'a'.repeat(175)});
    const parsed = JSON.parse(stored);
    assert.ok(Buffer.byteLength(stored) < 768);
    assert.ok(Buffer.byteLength(JSON.stringify(parsed.source)) <= 48);
    assert.ok(Buffer.byteLength(JSON.stringify(parsed.merchant)) <= 32);
  }
});

test('unexpected shapes and unknown fields never become metadata', async () => {
  for (const m of [null, [], ['source'], true, 3, 'string', {source: {}, merchant: [], link_url: 1},
    {email: 'private@example.test', args: 'secret'}, JSON.parse('{"__proto__":{"source":"hidden"}}')]) {
    assert.equal(affiliateMeta(m), '{}');
    const result = await record({n: 'affiliate_click', p: '/guide/example.html', m});
    assert.equal(result.body.ok, true); assert.equal(result.rows[0][4], '{}');
  }
  for (const body of [null, [], 'string', 1]) {
    const result = await record(body);
    assert.equal(result.status, 400); assert.deepEqual(result.rows, []);
  }
});

test('URLs retain only existing valid marketplace tags and public destinations', () => {
  for (const [input, expected] of [
    ['https://www.amazon.de/s?k=private+search&tag=getecoback-21&session=secret#secret', 'https://www.amazon.de/s?tag=getecoback-21'],
    ['https://amazon.de/s/private-medical-query?tag=getecoback-21', 'https://amazon.de/s?tag=getecoback-21'],
    ['https://amazon.de/s/ref=private/private@example.test?tag=getecoback-21', 'https://amazon.de/s?tag=getecoback-21'],
    ['https://amazon.de/primegratistesten/ref=private?tag=getecoback-21', 'https://amazon.de/primegratistesten?tag=getecoback-21'],
    ['https://www.amazon.com/gp/product/B000000000/ref=secret?tag=ecoback0d-20&email=secret', 'https://www.amazon.com/gp/product/B000000000?tag=ecoback0d-20'],
    ['https://amazon.de/s?tag=secret&k=secret', 'https://amazon.de/s'],
    ['https://amazon.de/s?tag=ecoback0d-20', 'https://amazon.de/s'],
    ['https://amazon.de.evil.test/s?tag=getecoback-21', 'https://amazon.de.evil.test/s'],
    ['https://example.test/offer?email=secret#secret', 'https://example.test/offer'],
    ['https://amazon.de/primegratistesten?tag=getecoback-21', 'https://amazon.de/primegratistesten?tag=getecoback-21'],
  ]) assert.equal(JSON.parse(affiliateMeta({link_url: input})).link_url, expected);
  for (const link_url of ['javascript:secret', 'data:text/plain,secret', 'not a URL',
    '//amazon.de/dp/B07NC5CP6F', 'https://user:secret@amazon.de/s', 'https://example.test/' + 'x'.repeat(250)]) {
    assert.deepEqual(JSON.parse(affiliateMeta({link_url, source: 'body'})), {source: 'body'});
  }
  for (const page of ['//outside.test/a', '/\\outside.test/a', 'https://outside.test/a', '/' + 'a'.repeat(200)]) {
    assert.equal(affiliateMeta({page, page_path: page}), '{}');
  }
});

test('query-free search URLs remain searches and CI probes remain excluded in real SQLite', async () => {
  const metas = [affiliateMeta({source: 'us-market', link_url: 'https://amazon.com/s?k=private'}),
    affiliateMeta({source: 'toppick', link_url: product})];
  const script = `import sqlite3,json,sys
db=sqlite3.connect(':memory:');db.row_factory=sqlite3.Row
db.execute('CREATE TABLE ev(day,name,page,ua_class,meta)')
for m in json.loads(sys.argv[1]):
 for page in ['/guide/example.html','/__ci_healthcheck']:
  db.execute("INSERT INTO ev VALUES(date('now','-1 day'),'affiliate_click',?,'human',?)",(page,m))
print(json.dumps([dict(r) for r in db.execute(sys.stdin.read())]))`;
  const result = spawnSync('python3', ['-c', script, JSON.stringify(metas)], {input: AFFILIATE_SQL, encoding: 'utf8'});
  assert.equal(result.status, 0, result.stderr);
  const rows = JSON.parse(result.stdout);
  const m = await affiliateMetrics({prepare() {return {all: async () => ({results: rows})};}});
  assert.equal(m.affiliate_click_28d, 2);
  assert.equal(m.affiliate_click_us_market_28d, 1);
  assert.deepEqual(m.affiliate_diagnostics.destinations_28d, {product: 1, search: 1, prime_trial: 0, other_or_unknown: 0});
  assert.equal(m.affiliate_diagnostics.amazon_ordered_items, null);
});

test('other event schemas are unchanged', async () => {
  const result = await record({n: 'b2b_intent', p: '/guide/example.html', m: {source: 'existing'}});
  assert.equal(result.rows[0][4], '{"source":"existing"}');
});

const cellar = '/guide/luftentfeuchter-keller.html';
const documentURL = 'https://getecoback.com' + cellar + '?utm_source=eco-mcp&utm_medium=referral&utm_campaign=keller-ablauf';
const drainLink = documentURL + '#ablauf-vor-kauf';

test('one existing view and coalesced click retain only the initial exact tagged cellar entry', async () => {
  const file = readFileSync(new URL('../site/guide/luftentfeuchter-keller.html', import.meta.url), 'utf8');
  const track = file.match(/<!--EB_TRACK--><script>([\s\S]*?)<\/script><!--\/EB_TRACK-->/)[1];
  async function visit(entry) {
    const events = [], handlers = {};
    const location = new URL(entry);
    const scope = {
      location, document:{referrer:'',addEventListener(){}}, Blob,
      navigator:{sendBeacon:(url, data) => {assert.equal(url,'/api/ev'); events.push(data.text());}},
      addEventListener:(type, cb) => {handlers[type]=cb;}, setTimeout:()=>1,clearTimeout(){},
    };
    scope.window=scope;
    runInNewContext(track, scope);
    location.hash='#modell-meaco-one-20';
    scope.gtag('event','affiliate_click',{link_url:product});
    scope.gtag('event','affiliate_click',{source:'models',link_url:product});
    handlers.pagehide();
    return (await Promise.all(events)).map(JSON.parse);
  }
  for (const entry of [drainLink, documentURL, documentURL+'#other', drainLink.replace('eco-mcp','unknown'),
    drainLink.replace('/luftentfeuchter-keller.', '/other.'), drainLink.replace('#','&private=secret#')]) {
    const records = await visit(entry);
    assert.deepEqual(records.map(x=>x.n), ['page_view','affiliate_click']);
    assert.deepEqual(records.map(x=>x.mcp_drain_entry),Array(2).fill(entry===drainLink ? true : undefined));
    assert.equal(records[1].m.source,'models');
    assert.doesNotMatch(JSON.stringify(records), /private=|utm_|#modell/);
  }
});

test('worker verifies the tagged document and human privacy eligibility; ordinary rows keep their dimensions',async () => {
  const headers={origin:'https://getecoback.com',referer:documentURL,'sec-fetch-site':'same-origin'};
  for(const name of ['page_view','affiliate_click']) {
    const body={n:name,p:cellar,r:'https://www.bing.com/',mcp_drain_entry:true,
      m:name==='affiliate_click'?{source:'models',link_url:product}:null};
    const row=(await record(body,headers)).rows[0];
    assert.equal(JSON.parse(row[4]).mcp_drain_entry,1);
    assert.equal(row[3],'www.bing.com');
    if(name==='affiliate_click') assert.equal(JSON.parse(row[4]).source,'models');
    for(const variant of [{referer:''},{referer:documentURL+'&extra=secret'},{referer:documentURL.replace('eco-mcp','x')},
      {origin:'https://other.test'},{'sec-fetch-site':'cross-site'},{'dnt':'1'},{'sec-gpc':'1'},{'user-agent':'getecoback-ci/1.0'}]) {
      const result = await record({...body,m:{...body.m,mcp_drain_entry:1}}, {...headers,...variant});
      assert.equal(JSON.parse(result.rows[0][4]||'{}').mcp_drain_entry,undefined);
    }
    for(const variant of [{mcp_drain_entry:false},{p:cellar+'.other'}]) {
      const result=await record({...body,...variant},headers);
      assert.equal(JSON.parse(result.rows[0][4]||'{}').mcp_drain_entry,undefined);
    }
  }
});

const windowModel = 'https://www.amazon.de/s?' + new URLSearchParams({
  k:'Bosch GlassVAC Set 06008B7000', tag:'getecoback-21',
});

test('only approved model search clicks from the exact document carry the window marker', async () => {
  const headers = {origin:'https://getecoback.com', referer:WINDOW_ENTRY_DOCUMENT, 'sec-fetch-site':'same-origin'};
  const view = {n:'page_view',p:WINDOW_ENTRY_PAGE,mcp_window_entry:true};
  const click = {...view,n:'affiliate_click',m:{source:'inline',link_url:windowModel,private_width:170}};
  const stored = async (body, requestHeaders=headers) =>
    JSON.parse((await record(body,requestHeaders)).rows[0][4] || '{}');
  assert.deepEqual(await stored(view),{mcp_window_entry:1});
  assert.deepEqual(await stored(click),{
    mcp_window_entry:1,source:'inline',link_url:'https://www.amazon.de/s?tag=getecoback-21',
  });
  for (const variant of [
    {referer:''},{referer:WINDOW_ENTRY_DOCUMENT+'&extra=1'},{origin:'https://other.test'},
    {'sec-fetch-site':'cross-site'},{dnt:'1'},{'sec-gpc':'1'},{'x-probe':'1'},
    {'user-agent':'getecoback-ci/window'},
  ]) {
    for (const body of [view,click]) {
      assert.equal((await stored({...body,m:{...body.m,mcp_window_entry:1}}, {...headers,...variant})).mcp_window_entry,undefined);
    }
  }
  for (const linkUrl of [product, windowModel+'&tag=getecoback-21', windowModel+'&private=1',
    windowModel.replace('06008B7000','06008B7200'), windowModel.replace('www.amazon.de','amazon.de.evil.test'),
    windowModel.replace('getecoback-21','other'), windowModel+'#different']) {
    const ordinary = await stored({...click,m:{...click.m,link_url:linkUrl,mcp_window_entry:1}});
    assert.equal(ordinary.mcp_window_entry,undefined,linkUrl);
    assert.equal(ordinary.source,'inline',linkUrl);
  }
  assert.equal((await stored({...view,p:'/other.html',m:{mcp_window_entry:1}})).mcp_window_entry,undefined);
});

test('window TikTok landing, width completion and approved search are separate fixed D1 evidence', async () => {
  assert.equal(WINDOW_TIKTOK_GUIDE_DOCUMENT, 'https://getecoback.com/guide/fenster-beschlagen-innen.html?utm_source=tiktok&utm_medium=social&utm_campaign=eco-dach-catalog-01');
  const headers = {origin:'https://getecoback.com', 'sec-fetch-site':'same-origin'};
  const guideHeaders = {...headers, referer:WINDOW_TIKTOK_GUIDE_DOCUMENT};
  const productHeaders = {...headers, referer:'https://getecoback.com/produkte.html', 'cf-ipcountry':'DE'};
  const view = {n:'page_view',p:WINDOW_TIKTOK_GUIDE_PAGE,window_tiktok_entry:true,r:'https://www.tiktok.com/@profile/photo/private?value=private'};
  const width = {n:WINDOW_TIKTOK_WIDTH_EVENT,p:WINDOW_ENTRY_PAGE,window_tiktok_entry:true,r:WINDOW_TIKTOK_GUIDE_DOCUMENT};
  const click = {...width,n:'affiliate_click',m:{source:'inline',link_url:windowModel,private_width:170,window_tiktok_entry:9}};
  const stored = async (candidate, requestHeaders) => {
    const result = await record(candidate,requestHeaders);
    assert.equal(result.body.ok,true);
    assert.equal(result.rows.length,1);
    const [,name,path,ref,metadata,country,ua] = result.rows[0];
    assert.equal(name,candidate.n);
    assert.equal(path,candidate.p);
    assert.equal(ua,'human');
    assert.doesNotMatch(JSON.stringify(result.rows[0]),/private|utm_source|06008B7000/);
    return {ref, metadata:JSON.parse(metadata || '{}'), country};
  };
  assert.deepEqual(await stored(view,guideHeaders),{ref:'www.tiktok.com',metadata:{window_tiktok_entry:1},country:''});
  for (const m of [undefined,null,{}]) {
    assert.deepEqual(await stored({...width,m},productHeaders),{ref:'getecoback.com',metadata:{window_tiktok_entry:1},country:''});
  }
  assert.deepEqual(await stored(click,productHeaders),{ref:'getecoback.com',country:'DE',metadata:{
    window_tiktok_entry:1,source:'inline',link_url:'https://www.amazon.de/s?tag=getecoback-21',
  }});

  const forbiddenHeaders = [
    {origin:''},{origin:'https://other.test'},{'sec-fetch-site':'cross-site'},
    {'sec-fetch-site':'same-site'},{dnt:'1'},{'sec-gpc':'1'},{'x-probe':'1'},
    {'user-agent':'getecoback-ci/window'},{'user-agent':'Googlebot'},
  ];
  for (const override of forbiddenHeaders) {
    for (const [candidate, requestHeaders] of [[view,guideHeaders],[click,productHeaders]]) {
      const result = await record({...candidate,m:{...candidate.m,window_tiktok_entry:1}}, {...requestHeaders,...override});
      assert.equal(result.rows.length,1);
      assert.equal(JSON.parse(result.rows[0][4] || '{}').window_tiktok_entry,undefined);
    }
    const rejected = await record(width,{...productHeaders,...override});
    assert.equal(rejected.status,400);
    assert.equal(rejected.body.error,'invalid_window_tiktok_event');
    assert.deepEqual(rejected.rows,[]);
  }

  const wrongSources = ['',WINDOW_TIKTOK_GUIDE_DOCUMENT+'&extra=1',WINDOW_TIKTOK_GUIDE_DOCUMENT+'#fenstersauger-gegen-kondenswasser',
    WINDOW_TIKTOK_GUIDE_DOCUMENT.replace('tiktok','reddit')];
  for (const referer of wrongSources) {
    const ordinary = await stored({...view,m:{window_tiktok_entry:1}},{...guideHeaders,referer});
    assert.equal(ordinary.metadata.window_tiktok_entry,undefined);
  }
  for (const link_url of [product,windowModel+'&extra=1',windowModel+'#extra',
    windowModel.replace('06008B7000','06008B7200'),windowModel.replace('getecoback-21','unknown-21')]) {
    const ordinary = await stored({...click,m:{source:'inline',link_url,window_tiktok_entry:1}},productHeaders);
    assert.equal(ordinary.metadata.window_tiktok_entry,undefined);
    assert.equal(ordinary.metadata.source,'inline');
  }
  for (const wrong of [{email:'private'}, {m:{room_c:20}}, {m:{window_tiktok_entry:1}},
    {m:[]}, {m:'private'}, {p:'/produkte.html?extra=1'}, {window_tiktok_entry:1},
    {window_tiktok_entry:undefined}, ...wrongSources.map(r=>({r}))]) {
    const rejected = await record({...width,...wrong},productHeaders);
    assert.equal(rejected.status,400);
    assert.deepEqual(rejected.rows,[]);
  }
  for (const referer of ['',WINDOW_TIKTOK_GUIDE_DOCUMENT,WINDOW_ENTRY_DOCUMENT,'https://getecoback.com/produkte.html?extra=1']) {
    assert.deepEqual((await record(width,{...productHeaders,referer})).rows,[]);
  }
  assert.equal((await stored({...width,n:'page_view',m:{window_tiktok_entry:1}},productHeaders)).metadata.window_tiktok_entry,undefined);
  assert.equal((await stored({...click,window_tiktok_entry:false},productHeaders)).metadata.window_tiktok_entry,undefined);
  const old = await record({n:'affiliate_click',p:WINDOW_ENTRY_PAGE,mcp_window_entry:true,m:click.m},
    {...productHeaders,referer:WINDOW_ENTRY_DOCUMENT});
  assert.equal(JSON.parse(old.rows[0][4]).mcp_window_entry,1);
  assert.equal(JSON.parse(old.rows[0][4]).window_tiktok_entry,undefined);
});

test('the PortaSplit marker allows the exact German product and the search from a cached guide', async () => {
  const headers = {origin:'https://getecoback.com', referer:PORTASPLIT_ENTRY_DOCUMENT, 'sec-fetch-site':'same-origin'};
  const view = {n:'page_view',p:PORTASPLIT_ENTRY_PAGE,mcp_portasplit_entry:true,r:'https://example.test/?extra=secret'};
  const link = 'https://www.amazon.de/s?k=Midea+PortaSplit&tag=getecoback-21';
  const click = {...view,n:'affiliate_click',m:{source:'body',link_url:link,private_input:'secret'}};
  const exact = {...click,m:{...click.m,link_url:PORTASPLIT_PRODUCT_URL}};
  const stored = async (body, requestHeaders=headers) => {
    const receipt = await record(body,requestHeaders);
    assert.equal(receipt.rows.length,1);
    assert.equal(receipt.rows[0][3],'example.test');
    return JSON.parse(receipt.rows[0][4] || '{}');
  };
  assert.deepEqual(await stored(view),{mcp_portasplit_entry:1});
  assert.deepEqual(await stored(click),{
    mcp_portasplit_entry:1,source:'body',link_url:'https://www.amazon.de/s?tag=getecoback-21',
  });
  assert.deepEqual(await stored(exact),{
    mcp_portasplit_entry:1,source:'body',link_url:PORTASPLIT_PRODUCT_URL,
  });
  for (const variant of [
    {referer:''},{referer:PORTASPLIT_ENTRY_DOCUMENT+'&extra=1'},{referer:WINDOW_ENTRY_DOCUMENT},{origin:'https://other.test'},
    {'sec-fetch-site':'cross-site'},{dnt:'1'},{'sec-gpc':'1'},{'x-probe':'1'},
    {'user-agent':'getecoback-ci/portasplit'},{'user-agent':'Googlebot'},
  ]) {
    for (const body of [view,click,exact]) {
      assert.equal((await stored({...body,m:{...body.m,mcp_portasplit_entry:1}}, {...headers,...variant})).mcp_portasplit_entry,undefined);
    }
  }
  for (const badLink of [product, link+'&tag=getecoback-21', link+'&extra=1', link+'#other',
    link.replace('Midea+PortaSplit','Remko+RKL+495+DC'), link.replace('getecoback-21','ecoback0d-20'),
    link.replace('www.amazon.de','amazon.de.evil.test'),
    PORTASPLIT_PRODUCT_URL+'&extra=1', PORTASPLIT_PRODUCT_URL.split('?')[0],
    PORTASPLIT_PRODUCT_URL.replace('amazon.de','amazon.com')]) {
    const ordinary = await stored({...click,m:{...click.m,link_url:badLink,mcp_portasplit_entry:1}});
    assert.equal(ordinary.mcp_portasplit_entry,undefined,badLink);
    assert.equal(ordinary.source,'body');
  }
  for (const body of [{...view,mcp_portasplit_entry:false},{...view,p:'/guide/other.html'}]) {
    assert.equal((await stored({...body,m:{mcp_portasplit_entry:1}})).mcp_portasplit_entry,undefined);
  }
});

test('the cellar model marker requires the exact first-party document and approved click target', () => {
  const headers = {origin:'https://getecoback.com',referer:CELLAR_MODEL_ENTRY_DOCUMENT,'sec-fetch-site':'same-origin'};
  const eligible = (body, overrides = {}, uaClass = 'human') => taggedCellarModelEntry(body,
    new Request('https://getecoback.com/api/ev',{method:'POST',headers:{...headers,...overrides}}),uaClass);
  const store = (body, overrides, uaClass) => JSON.parse(affiliateMeta(body.m,false,false,false,eligible(body,overrides,uaClass)));
  const view = {n:'page_view',p:CELLAR_MODEL_ENTRY_PAGE,mcp_cellar_entry:true};
  const link = 'https://www.amazon.de/s?' + new URLSearchParams({k:CELLAR_MODEL_SEARCH,tag:'getecoback-21'});
  const click = {...view,n:'affiliate_click',m:{source:'models',link_url:link,private_input:'do not store'}};

  assert.equal(CELLAR_MODEL_ENTRY_DOCUMENT,'https://getecoback.com/guide/luftentfeuchter-keller.html?mcp_entry=keller-pruefpunkt');
  assert.equal(CELLAR_MODEL_ENTRY_URL,CELLAR_MODEL_ENTRY_DOCUMENT+'#modell-meaco-one-20');
  assert.equal(CELLAR_MODEL_SEARCH,'MeacoDry Arete One 20L');
  assert.deepEqual(store(view),{mcp_cellar_entry:1});
  assert.deepEqual(store(click),{mcp_cellar_entry:1,source:'models',link_url:'https://www.amazon.de/s?tag=getecoback-21'});
  assert.deepEqual(JSON.parse(affiliateMeta({mcp_cellar_entry:1},true,true,true)),
    {mcp_drain_entry:1,mcp_window_entry:1,mcp_portasplit_entry:1});

  for (const body of [view,click]) {
    for (const variant of [{referer:''},{referer:CELLAR_MODEL_ENTRY_URL},{referer:CELLAR_MODEL_ENTRY_DOCUMENT+'&extra=1'},
      {origin:'https://other.test'},{'sec-fetch-site':'cross-site'},{dnt:'1'},{'sec-gpc':'1'},{'x-probe':'1'}]) {
      assert.equal(eligible(body,variant),false);
    }
    for (const uaClass of ['bot','ci','other','none']) assert.equal(eligible(body,{},uaClass),false);
  }

  for (const variant of [{n:'b2b_intent'},{p:CELLAR_MODEL_ENTRY_PAGE+'?mcp_entry=keller-pruefpunkt'},
    {mcp_cellar_entry:false},{mcp_cellar_entry:1},{mcp_cellar_entry:undefined}]) {
    assert.equal(store({...view,...variant,m:{mcp_cellar_entry:1}}).mcp_cellar_entry,undefined);
  }
  for (const link_url of [product,link+'&tag=getecoback-21',link+'&extra=1',link+'#other',
    link.replace('One+20L','One+25L'),link.replace('getecoback-21','ecoback0d-20'),
    link.replace('www.amazon.de','amazon.de.evil.test')]) {
    assert.equal(store({...click,m:{...click.m,link_url,mcp_cellar_entry:1}}).mcp_cellar_entry,undefined,link_url);
  }
});

test('N90 markers are issued for the exact first-party arrival and approved German product detail', async () => {
  const headers = {origin:'https://getecoback.com', referer:N90_ENTRY_DOCUMENT, 'sec-fetch-site':'same-origin'};
  const view = {n:'page_view', p:N90_ENTRY_PAGE, mcp_n90_entry:true, r:'https://example.test/?private=secret'};
  const click = {...view, n:'affiliate_click', m:{source:'body', link_url:N90_PRODUCT_URL, messenergie_kwh:1.8}};
  const stored = async (body, overrides={}) => {
    const result = await record(body, {...headers, ...overrides});
    assert.equal(result.rows.length, 1);
    assert.equal(result.rows[0][3], 'example.test');
    return JSON.parse(result.rows[0][4] || '{}');
  };
  assert.deepEqual(await stored({...view, m:{messdauer_min:180, arbeitspreis_eur_kwh:0.35, mcp_n90_entry:1}}), {mcp_n90_entry:1});
  assert.deepEqual(await stored(click), {mcp_n90_entry:1, source:'body', link_url:N90_PRODUCT_URL});
  for (const overrides of [{referer:''},{referer:N90_ENTRY_DOCUMENT + '&extra=1'},{referer:N90_ENTRY_DOCUMENT + '#n90-energielabel'},
    {referer:'https://getecoback.com' + N90_ENTRY_PAGE},{origin:'https://example.test'},{'sec-fetch-site':'cross-site'},
    {dnt:'1'},{'sec-gpc':'1'},{'x-probe':'1'},{'user-agent':'getecoback-ci/n90'},{'user-agent':'Googlebot'}]) {
    for (const event of [view,click]) {
      const data = await stored({...event, m:{...event.m, mcp_n90_entry:1, mcp_n90_link:1}}, overrides);
      assert.equal(data.mcp_n90_entry, undefined);
      assert.equal(data.mcp_n90_link, undefined);
    }
  }
  for (const link_url of [N90_PRODUCT_URL + '&x=1', N90_PRODUCT_URL + '#other', N90_PRODUCT_URL.replace('/dp/','/gp/product/'),
    N90_PRODUCT_URL.replace('B07NC5CP6F','B07KJYD1ZP'), N90_PRODUCT_URL.replace('tag=getecoback-21','tag=unknown-21'),
    'https://www.amazon.de/s?k=PAC+N90&tag=getecoback-21',N90_PRODUCT_URL.replace('www.amazon.de','amazon.de.evil.test')]) {
    assert.equal((await stored({...click, m:{...click.m, link_url, mcp_n90_entry:1}})).mcp_n90_entry, undefined, link_url);
  }
  for (const candidate of [{...view, p:'/guide/delonghi-pinguino-vergleich.html'}, {...view, mcp_n90_entry:1}, {...view, mcp_n90_entry:false}]) {
    assert.equal((await stored({...candidate, m:{mcp_n90_entry:1}})).mcp_n90_entry, undefined);
  }
});
