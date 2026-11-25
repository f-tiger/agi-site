import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
import {readFileSync} from 'node:fs';
import {citationUrl} from '../src/agent-sources.mjs';
import worker, {htmlToMarkdown} from '../src/worker.js';

const labelEndpoint='https://library.delonghigroup.com/assetbank-delonghi/action/directLinkImage';
const n90Label=labelEndpoint+'?assetId=209150&download=true';

const cases=[
 ['https://www.adac.de/rund-ums-haus/wohnen/haushalt/kondenswasser-am-fenster/','',true],
 ['https://www.kaercher.com/de/de/home-and-garden/produkte/akku-fensterreiniger-c36','',true],
 ['https://www.kaercher.com/de/de/home-and-garden/produkte/akku-fensterreiniger-c36?tag=example','',false],
 [n90Label,'',true],
 [n90Label,'sponsored nofollow',false],
 [labelEndpoint+'?download=true&assetId=209150','',false],
 [n90Label+'&lang=de','',false],
 [n90Label+'#page=1','',false],
 [n90Label.replace('209150','209151'),'',false],
 [n90Label.replace('https://','https://user@'),'',false],
 [n90Label.replace('library.delonghigroup.com','example.org'),'',false],
 [labelEndpoint,'',false],
 ['https://www.umweltbundesamt.de/themen/gesundheit','',true],
 ['https://www.gov.uk/government/publications/damp-and-mould','',true],
 ['https://www.milieucentraal.nl/energie-besparen/','',true],
 ['https://www.energy.gov.au/households','',true],
 ['https://www.meaco.com/pages/faqs','',true],
 ['https://www.meaco.com/products/dehumidifier','',false],
 ['https://www.meaco.com/products/meacodry-arete-one-20l-dehumidifier-and-air-purifier','',true],
 ['https://www.midea.com/de/klimatisieren-heizen/portasplit/produktinfos.portasplit','',true],
 ['https://www.midea.com/de/klimatisieren-heizen/portasplit/installation','',true],
 ['https://www.midea.com/de/another-product','',false],
 ['https://www.remko.de/gewerblich/klimasysteme/lokal/rkl-dc/','',true],
 ['https://www.remko.de/gewerblich/klimasysteme/lokal/rkl-dc/?ref=example','',false],
 ['https://www.remko.de/gewerblich/klimasysteme/lokal/','',false],
 ['https://www.idar-oberstein.de/bauen-wohnen-wirtschaft/bauen-und-wohnen/klimaschutz/beratung/250826-ent-heizen-mit-klimaanlage-vzrlp.pdf','',true],
 ['https://www.idar-oberstein.de/bauen-wohnen-wirtschaft/bauen-und-wohnen/klimaschutz/beratung/250826-ent-heizen-mit-klimaanlage-vzrlp.pdf?cid=aj4','',false],
 ['https://www.feelcomfee.com/content/dam/comfee-aem/global/products/heating-cooling/mobile-air-conditioner-mpph-09crn7/PH-Owners-Manual.pdf','',true],
 ['https://www.feelcomfee.com/content/dam/comfee-aem/global/products/heating-cooling/mobile-air-conditioner-mpph-09crn7/PH-Owners-Manual.pdf#page=20','',true],
 ['https://www.feelcomfee.com/content/dam/comfee-aem/global/products/heating-cooling/dehumidifier-mddf-20den7/DF-Owners-Manual.pdf#page=12','',true],
 ['https://www.feelcomfee.com/de/produkte/klimatisieren-heizen/mddf-20den7','',true],
 ['https://www.feelcomfee.com/de/produkte/klimatisieren-heizen/mddf-20den7-wf','',true],
 ['https://www.feelcomfee.com/de/produkte/klimatisieren-heizen/mddf-20den7-wf?tag=example','',false],
 ['https://www.feelcomfee.com/content/dam/comfee-aem/de/katalog/comfee-klimakatalog-2024-din-a4-v2-lores.pdf#page=27','',true],
 ['https://www.feelcomfee.com/content/dam/comfee-aem/de/katalog/comfee-klimakatalog-2024-din-a4-v2-lores.pdf#page=0','',false],
 ['https://www.feelcomfee.com/content/dam/comfee-aem/de/produkte/klimatisieren-heizen/mddf-20den7/comfee-MDDF-20DEN7-Datenblatt.pdf#page=2','',true],
 ['https://www.feelcomfee.com/content/dam/comfee-aem/de/produkte/klimatisieren-heizen/mddf-20den7/comfee-MDDF-20DEN7-Datenblatt.pdf?tag=example','',false],
 ['https://www.feelcomfee.com/content/dam/comfee-aem/global/products/heating-cooling/dehumidifier-mddf-20den7/DF-Owners-Manual.pdf#page=0','',false],
 ['https://www.feelcomfee.com/content/dam/comfee-aem/global/products/heating-cooling/dehumidifier-mddf-20den7/DF-Owners-Manual.pdf#page=12&url=https://evil.test','',false],
 ['https://www.feelcomfee.com/content/dam/comfee-aem/global/products/heating-cooling/dehumidifier-mddf-20den7/another-manual.pdf#page=12','',false],
 ['https://www.umweltbundesamt.de/test','sponsored nofollow',false],
 ['https://www.umweltbundesamt.de.evil.test/page','',false],
 ['https://www.umweltbundesamt.de@evil.test/page','',false],
 ['https://user@www.umweltbundesamt.de/page','',false],
 ['https://www.umweltbundesamt.de:443/page','',false],
 ['https://www.umweltbundesamt.de/page?url=https://evil.test','',false],
 ['https://www.umweltbundesamt.de/%2f%2fevil.test','',false],
 ['http://www.umweltbundesamt.de/page','',false],
 ['https://www.umweltbundesamt.de/page)malformed','',false],
 ['https://www.amazon.de/dp/EXAMPLE?tag=affiliate','',false],
 ['https://www.ikea.com/de/de/files/pdf/a4/f2/a4f2bcc7/bf_leitfaden_fenster_07-2026_online.pdf','',true],
 ['https://wunschgardine.de/anleitung.php','',true],
 ['https://wunschgardine.de/anleitung.php?ref=example','',false],
 ['https://wunschgardine.de/anleitung.php','sponsored',false],
 ['https://amzn.to/example','',false],
 ['https://unknown.example/article','',false]
];

test('Python and Worker preserve the same exact reference URLs and reject commerce or spoofed sources',()=>{
 const py=spawnSync('python3',['-c',`import json,sys;sys.path.insert(0,'tools');from agent_sources import citation_url;print(json.dumps([citation_url(h,r) for h,r,_ in json.loads(sys.argv[1])]))`,JSON.stringify(cases)],{cwd:root,encoding:'utf8',timeout:10000});
 assert.equal(py.status,0,py.stderr);
 const expected=cases.map(([href,,ok])=>ok?href:null);
 assert.deepEqual(cases.map(([href,rel])=>citationUrl(href,rel)),expected);
 assert.deepEqual(JSON.parse(py.stdout),expected);
});

test('both Markdown converters keep linked references already in HTML and remove merchant destinations',()=>{
 const html='<title>Evidence</title><article><p>Measured conditions matter.</p>'+cases.map(([href,rel],i)=>`<a href="${href}" rel="${rel}">Ref ${i}</a>`).join('')+'</article>';
 const py=spawnSync('python3',['-c',"import sys;sys.path.insert(0,'tools');from build_agent_md import to_markdown;print(to_markdown(sys.argv[1],'/guide/test.html','de'))",html],{cwd:root,encoding:'utf8',timeout:10000});
 assert.equal(py.status,0,py.stderr);
 for(const md of [htmlToMarkdown(html,'/guide/test.html'),py.stdout]){
  for(const [i,[href,,ok]] of cases.entries())assert.equal(md.includes(`[Ref ${i}](${href})`),ok,href);
  assert.ok(!/https?:\/\/[^\s]*amazon|https?:\/\/amzn\./i.test(md));
  assert.ok(md.includes('Measured conditions matter.'));
 }
});

test('edge fallback retains every evidence reference in the three revised winter guides',()=>{
 for(const slug of ['klimaanlage-mit-heizfunktion','mobile-klimaanlage-ueberwintern','luftentfeuchter-dauerbetrieb-stromkosten']){
  const html=readFileSync(new URL(`../site/guide/${slug}.html`,import.meta.url),'utf8');
  const article=html.match(/<article[^>]*>([\s\S]*?)<\/article>/)[1];
  const references=[...article.matchAll(/href="(https?[^\"]+)"/g)].map(match=>match[1].replaceAll('&amp;','&'))
   .filter(url=>!['amazon.','amzn.','youtube.com','getecoback.com'].some(host=>url.includes(host)));
  assert.ok(references.length>0,slug);
  const markdown=htmlToMarkdown(html,`/guide/${slug}.html`);
  for(const reference of references)assert.ok(markdown.includes(`](${reference})`),`${slug}: ${reference}`);
 }
});

test('appliance evidence survives in both the generated mirror and edge fallback', () => {
 const pages = [
  ['produkte', [
   'https://media3.bosch-home.com/Documents/specsheet/de-DE/SBV4EBX00D.pdf',
   'https://www.miele.de/product/9256130/wasch-trocken-verbindungssatz-wtv-501',
   'https://media3.bosch-home.com/Documents/specsheet/de-DE/DWB66BC50.pdf',
   'https://media3.bosch-home.com/Documents/specsheet/de-DE/HEZ638370.pdf',
   'https://www.venta-air.com/Rollwagen-fuer-Venta-Luftbefeuchter/6060',
   'https://media.miele.com/downloads/0d/c6/04_C7F12828E3FE1FE0BB8C547A67460DC6.pdf',
   'https://media.miele.com/downloads/c0/11/02_C7F128281BA21FD0A0E8671DD96BC011.pdf',
   'https://media3.bosch-home.com/Documents/specsheet/de-DE/SKS62E32EU.pdf',
   'https://dam.versuni.com/m/11ba80be418a7f33/original/NA35x-Quick-Start-Guide.pdf',
  ]],
  ['geraete-austausch-rechner', [
   'https://media3.bsh-group.com/Documents/eudatasheet/de-DE/GSN58DWDV.pdf',
   'https://www.umweltbundesamt.de/system/files/medien/10592/dokumente/datenblatt_2019-2023_haushaltswaschmaschinen_final.pdf',
   'https://www.gesetze-im-internet.de/elektrog_2015/__17.html',
  ]],
  ['guide/unterschied-klimaanlage-lueftungsanlage', [
   'https://zehnder.picturepark.com/v/WbAb4h0n/',
   'https://zehnder.picturepark.com/v/dwbRP3uL/',
  ]],
  ['guide/delonghi-pac-n90-test', [
   'https://www.delonghi.com/de-de/s/PACN90ECOSILENT',
   'https://shop.sonepar.at/asset_external/downloads/pim/400901/datasheet_delonghi_PAC%20N90ECO.pdf',
   n90Label,
  ]],
  ['guide/smarte-heizkoerperthermostate-lohnen-sich', [
   'https://fritz.com/apps/knowledge-base/fritz-dect-302/3376_An-welchen-Heizungsventilen-kann-der-FRITZ-Heizkorperregler-eingesetzt-werden?market=de-de',
   'https://www.bosch-smarthome.com/de/de/produkte/zubehoer-und-ersatzteile/ventiladapter/',
   'https://www.bosch-smarthome.com/res/web/produkt/heizkoerper-thermostat2/pdf/8-750-002-943_V001_Valve_adapter_recommendations_ML_20240808.pdf#page=9',
   'https://www.bosch-smarthome.com/res/web/produkt/heizkoerper-thermostat2/pdf/8-750-002-943_V001_Valve_adapter_recommendations_ML_20240808.pdf#page=10',
   'https://cdn.bfldr.com/607DGEMS/at/hqb8tzxsq4cmchcjxsxtwhh/DE_SRTx_compatibility_Links.pdf#page=6',
   'https://cdn.bfldr.com/607DGEMS/at/hqb8tzxsq4cmchcjxsxtwhh/DE_SRTx_compatibility_Links.pdf#page=7',
   'https://help.tado.com/de/articles/8949346-brauche-ich-einen-adapter-um-meinen-smarten-heizkorper-thermostat-x-zu-montieren',
   'https://help.tado.com/de/articles/8949334-welche-heizkorperventile-sind-mit-dem-smarten-heizkorper-thermostat-x-von-tado-kompatibel',
  ]],
  ['guide/midea-portasplit-ausverkauft-alternativen', [
   'https://www.midea.com/de/klimatisieren-heizen/portasplit/produktinfos.portasplit',
   'https://www.midea.com/de/klimatisieren-heizen/portasplit/installation',
   'https://www.midea.com/de/klimatisieren-heizen/portasplit',
   'https://www.midea.com/content/dam/midea-aem/de/klimatisieren-heizen/portasplit/universalhalterung/PortaSplit-UM-universal-bracket.pdf',
   'https://www.remko.de/gewerblich/klimasysteme/lokal/rkl-dc/',
  ]],
  ['guide/klarstein-kraftwerk-smart-12k-test', [
   'https://www.klarstein.de/kraftwerk-smart-12000-btu-mobile-klimaanlage-weiss-p-10034664.html',
   'https://www.klarstein.de/kraftwerk-smart-11500-btu-mobile-klimaanlage-weiss-p-10040189.html',
  ]],
  ['guide/duschen-kosten-rechner', [
   'https://www.stiebel-eltron.com/static/ste/docportal/manual/DM0000018436-fjw.pdf',
   'https://www.ikea.com/de/de/p/tisken-handduschenhalter-mit-saugnapf-weiss-50400307/',
   'https://www.hansgrohe.de/articledetail-pulsify-s-handbrause-105-1jet-ecosmart-24121000',
  ]],
  ['strommess-protokoll', [
   'https://media.miele.com/downloads/e-/de/FS_11105690_DED_DE-de-DE.pdf',
   'https://eur-lex.europa.eu/eli/reg/2025/2262/oj/deu/pdf',
   'https://publications.europa.eu/resource/cellar/7ab9b082-dd82-11ed-a05c-01aa75ed71a1.0004.01/DOC_1',
  ]],
 ];
 for (const [path, urls] of pages) {
  const html = readFileSync(new URL(`../site/${path}.html`, import.meta.url), 'utf8');
  const file = readFileSync(new URL(`../site/${path}.md`, import.meta.url), 'utf8');
  const fallback = htmlToMarkdown(html, `/${path}.html`);
  for (const url of urls) {
   assert.ok(html.includes(`href="${url.replaceAll('&', '&amp;')}"`), url);
   assert.ok(file.includes(`](${url})`), url);
   assert.ok(fallback.includes(`](${url})`), url);
   assert.equal(citationUrl(url + '?ref=unreviewed'), null);
  }
 }
});

test('negotiated Markdown reuses the built mirror with sourced tables outside the article',async()=>{
 const html=readFileSync(new URL('../site/guide/waesche-trocknen-wohnung.html',import.meta.url),'utf8');
 const source='https://www.verbraucherzentrale.de/';
 assert.ok(html.includes(source));
 const py=spawnSync('python3',['-c',"import sys;sys.path.insert(0,'tools');from build_agent_md import to_markdown;print(to_markdown(sys.argv[1],'/guide/waesche-trocknen-wohnung.html','de'))",html],{cwd:root,encoding:'utf8',timeout:10000});
 assert.equal(py.status,0,py.stderr);
 assert.ok(py.stdout.includes(']('+source));
 const env={ASSETS:{fetch:async request=>new URL(request.url).pathname.endsWith('.md')?new Response(py.stdout,{headers:{'content-type':'text/markdown'}}):new Response(html,{headers:{'content-type':'text/html'}})}};
 const response=await worker.fetch(new Request('https://getecoback.com/guide/waesche-trocknen-wohnung.html',{headers:{accept:'text/markdown','user-agent':'getecoback-ci'}}),env,{waitUntil(){}});
 assert.equal(await response.text(),py.stdout);assert.equal(response.headers.get('vary'),'Accept');
 env.ASSETS.fetch=async request=>new URL(request.url).pathname.endsWith('.md')?new Response('missing',{status:404}):new Response('<article><a href="https://www.gov.uk/test">Official reference</a></article>');
 const fallback=await worker.fetch(new Request('https://getecoback.com/guide/test.html',{headers:{accept:'text/markdown','user-agent':'getecoback-ci'}}),env,{waitUntil(){}});
 assert.ok((await fallback.text()).includes('[Official reference](https://www.gov.uk/test)'));
});

test('German popularity excludes bot/unknown traffic and other markets in real SQLite',async()=>{
 let query='';
 const db={prepare(sql){query=sql;return{all:async()=>{
  const code=`import sqlite3,json,sys\ndb=sqlite3.connect(':memory:');db.row_factory=sqlite3.Row\ndb.execute('CREATE TABLE ev(day,name,page,country,ua_class)')\nfor country,ua in [('DE','human'),('DE','bot'),('DE',None),('GB','human'),('AU','human')]:\n db.execute("INSERT INTO ev VALUES(date('now','-1 day'),'page_view',?,?,?)",('/guide/'+str(country)+'-'+str(ua)+'.html',country,ua))\nprint(json.dumps([dict(r) for r in db.execute(sys.argv[1])]))`;
  const r=spawnSync('python3',['-c',code,sql],{cwd:root,encoding:'utf8',timeout:10000});assert.equal(r.status,0,r.stderr);return{results:JSON.parse(r.stdout).map(r=>({...r,page:r.page.toLowerCase()}))};
 }}}};
 const response=await worker.fetch(new Request('https://getecoback.com/api/top'),{EVENTS:db},{waitUntil(){}});
 assert.deepEqual((await response.json()).pages,[{page:'/guide/de-human.html',n:1}]);
 assert.ok(query.includes("country='DE'"));
});
