import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {COMPLETE_MCP_WEEK_SQL, completedMcpReports} from '../src/mcp-adoption.mjs';
import worker from '../src/worker.js';
import {expandedDefinitions, expandedCall} from '../src/mcp-expanded.mjs';
import {collectToolPages} from '../src/mcp-pagination.mjs';

const origin = 'https://getecoback.com';
const distinctTasks = 2024;
const callableNames = distinctTasks + 1;
function request(method, params) {
  return new Request(origin + '/mcp/v1', {
    method:'POST', headers:{'content-type':'application/json','user-agent':'getecoback-ci/expanded'},
    body:JSON.stringify({jsonrpc:'2.0', id:1, method, params}),
  });
}
async function rpc(method, params) {
  const response = await worker.fetch(request(method, params), {}, {});
  assert.equal(response.status,200);
  return (await response.json()).result;
}

test('German replacement-filter evidence returns a public exact-model anchor without inferring adjacent variants', async ({mock}) => {
  mock.timers.enable({apis:['Date'],now:new Date('2026-11-22T12:00:00Z')});
  const name='luftreiniger_ersatzfilter_zuordnung';
  const page=origin+'/ersatzfilter.html';
  const call=model=>rpc('tools/call',{name,arguments:{model}});
  for (const [model,exact,part,source] of [
    ['beurer-lr401','LR 401','69309','https://www.beurer.com/de/p/69309/'],
    ['levoit-core-300s','Core 300S',null,'https://levoit.de/products/levoit-core-300-und-core-300s-ersatzfilter-hepa-filter'],
  ]) {
    const result=await call(model);
    assert.equal(result.isError,false);
    assert.equal(result.structuredContent.status,'documented_variant');
    assert.equal(result.structuredContent.exact_model,exact);
    assert.equal(result.structuredContent.part_number,part);
    assert.equal(result.structuredContent.manufacturer_source,source);
    assert.equal(result.structuredContent.citation_url,page);
    assert.equal(result.structuredContent.guide_url,page+'#finder');
    assert.equal(result.structuredContent.model_guide_url,page+'#'+model);
    assert.doesNotMatch(JSON.stringify(result),/amazon\.|amzn\.|[?&]tag=/i);
  }
  const unknown=await call('unknown');
  assert.equal(unknown.structuredContent.status,'identify_model');
  assert.equal(unknown.structuredContent.model_guide_url,undefined);
  for (const model of ['levoit-core-300s-pro','beurer-lr405']) assert.equal((await call(model)).isError,true);
  mock.timers.setTime(new Date('2026-12-31T12:00:00Z').getTime());
  const stale=(await call('beurer-lr401')).structuredContent;
  assert.equal(stale.status,'source_recheck');
  assert.equal(stale.filter_name,null);
  assert.equal(stale.part_number,null);
  assert.equal(stale.model_guide_url,page+'#beurer-lr401');
});

test('Philips humidifier checks require exact type plate and filter suffixes', async ({mock}) => {
  const name='philips_verdunsterfilter_zuordnung';
  const guide=origin+'/guide/luftbefeuchter-ratgeber.html';
  mock.timers.enable({apis:['Date'],now:new Date('2026-11-22T12:00:00Z')});
  for (const [model,candidate,part,status,anchor] of [
    ['HU4803/01',undefined,'FY2401/30','documented_variant','philips-hu4803-01'],
    ['HU2716/10','fy3446 / 30','FY3446/30','documented_variant','philips-hu2716-10'],
    ['HU2716/10','FY2401/30','FY3446/30','candidate_not_documented','philips-hu2716-10'],
    ['HU4803/01','FY2401/31','FY2401/30','candidate_not_documented','philips-hu4803-01'],
    ['HU4803/01','FY2401','FY2401/30','candidate_not_documented','philips-hu4803-01'],
    ['unknown','FY3446/30',null,'identify_model',null],
  ]) {
    const args=candidate===undefined ? {model} : {model,candidate};
    const hosted=await rpc('tools/call',{name,arguments:args});
    const response=await worker.fetch(new Request(origin+'/mcp/v1?profile=compact', {
      method:'POST',headers:{'content-type':'application/json','user-agent':'getecoback-ci/expanded'},
      body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{
        name:'ecoback_werkzeug_ausfuehren',arguments:{name,eingaben:args},
      }}),
    }),{},{});
    assert.equal(response.status,200);
    assert.deepEqual((await response.json()).result.structuredContent,hosted.structuredContent);
    assert.equal(hosted.isError,false);
    const result=hosted.structuredContent;
    assert.deepEqual([result.status,result.part_number,result.market],[status,part,'DE']);
    assert.equal(result.guide_url,guide+'#philips-verdunsterfilter');
    assert.equal(result.model_guide_url,anchor ? guide+'#'+anchor : undefined);
    assert.match(result.manufacturer_source,/^https:\/\/acc\.philips\.de\//);
    if (anchor) assert.match(result.manufacturer_datasheet,/^https:\/\/www\.documents\.philips\.com\//);
    assert.doesNotMatch(JSON.stringify(result),/amazon\.|amzn\.|[?&]tag=/i);
  }
  for (const args of [{model:'HU4803'}, {model:'HU2716/11'}, {model:'Series 2000'}, {model:'HU4803/01',candidate:' '}, {model:'HU4803/01',candidate:'a'.repeat(25)}]) {
    assert.equal((await rpc('tools/call',{name,arguments:args})).isError,true);
  }
  mock.timers.setTime(new Date('2027-02-21T12:00:00Z').getTime());
  const stale=(await rpc('tools/call',{name,arguments:{model:'HU2716/10'}})).structuredContent;
  assert.equal(stale.status,'source_recheck');
  assert.equal(stale.part_number,null);
  assert.equal(stale.model_guide_url,guide+'#philips-hu2716-10');
});

test('blanket cost uses the browser math with confirmed inputs in both profiles', async () => {
  const name='heizdecke_stromkosten_nennleistung';
  const guide=origin+'/guide/heizdecke-stromverbrauch.html';
  const args={nennleistung_w:110,laufzeit_h:2,arbeitspreis_kwh:0.35};
  const native=(await rpc('tools/call',{name,arguments:args})).structuredContent;
  assert.deepEqual([native.energie_kwh_pro_nutzung,native.kosten_pro_nutzung,native.kosten_gesamt,native.waehrung,native.nutzungstage],[0.22,0.077,0.077,'EUR',1]);
  assert.equal(native.berechnungsart,'nennleistung_schaetzung');
  assert.equal(native.guide_url,guide+'#waerme-rechner');
  assert.equal(native.guidance_source,'https://verbraucherzentrale-energieberatung.de/energie-sparen/allgemeines/stromverbrauch-messen/');
  assert.match(native.hinweis,/Geräteanleitung.*tatsächliche Kosten/);
  assert.doesNotMatch(JSON.stringify(native),/amazon\.|amzn\.|[?&]tag=/i);
  const monthly={...args,nutzungstage:30,waehrung:'CHF'};
  const expected=await rpc('tools/call',{name,arguments:monthly});
  const response=await worker.fetch(new Request(origin+'/mcp/v1?profile=compact',{
    method:'POST',headers:{'content-type':'application/json','user-agent':'getecoback-ci/expanded'},
    body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{
      name:'ecoback_werkzeug_ausfuehren',arguments:{name,eingaben:monthly},
    }}),
  }),{},{});
  assert.equal(response.status,200);
  assert.deepEqual((await response.json()).result,expected);
  assert.deepEqual([expected.structuredContent.energie_kwh_gesamt,expected.structuredContent.kosten_gesamt,expected.structuredContent.waehrung],[6.6,2.31,'CHF']);
  for (const invalid of [{laufzeit_h:2,arbeitspreis_kwh:0.35},{...args,arbeitspreis_kwh:35},{...args,nutzungstage:1.5},{...args,laufzeit_h:25},{...args,nennleistung_w:501},{...args,waehrung:'USD'},{...args,abschaltung_h:3}]) {
    assert.equal((await rpc('tools/call',{name,arguments:invalid})).isError,true);
  }
});

test('the public directory and standard MCP pages expose the same catalogue', async () => {
  const pageSizes = [];
  const listed = await collectToolPages(async cursor => {
    const page = await rpc('tools/list', cursor === undefined ? {} : {cursor});
    pageSizes.push(page.tools.length);
    return page;
  });
  const directory = await (await worker.fetch(new Request(origin+'/api/mcp-tools'), {}, {})).json();
  const manifest = JSON.parse(readFileSync(new URL('../mcp/server.json',import.meta.url),'utf8'));
  const initialization = await rpc('initialize');
  assert.deepEqual(pageSizes,[...Array(20).fill(100),callableNames % 100]);
  assert.equal(directory.version, manifest.version);
  assert.equal(initialization.serverInfo.version, manifest.version);
  assert.match(initialization.instructions,/nextCursor als params.cursor/);
  assert.match(initialization.instructions,/view=examples und tool=EXAKTER_NAME/);
  assert.equal(directory.total,callableNames);
  assert.equal(directory.distinctTotal,distinctTasks);
  const equivalent=directory.tools.find(tool=>tool.name==='luftbefeuchter_weisser_belag');
  assert.equal(equivalent.equivalent_task,'befeuchter_weissen_belag_einordnen');
  assert.ok(directory.tools.some(tool=>tool.name===equivalent.equivalent_task));

  const names=listed.map(t=>t.name);
  assert.equal(new Set(names).size,callableNames);
  assert.deepEqual(directory.tools.map(t=>t.name),names);
  const byCategory = {};
  for (const {category} of directory.tools) byCategory[category] = (byCategory[category] || 0) + 1;
  assert.deepEqual(byCategory, {Raumklima:10,'Strom & Haushalt':21,Feuchte:19,Kühlen:18,Heizen:19,Passform:17,
    'Energie prüfen':24,'Raumkomfort prüfen':24,'Geräte pflegen':24,'Quellen & Kaufprüfung':29, 'Wasser & Wäsche':24,'Gebäude & Fenster':24,'Geräte im Alltag':24,'Messpraxis':24,'Zugang & Alltag':24,Saisonwechsel:24,Kaufpraxis:26,'Ressourcen planen':24,Raumplanung:24,Wetterpraxis:24,Küchenpraxis:24,Servicevorbereitung:24,'Belege abgleichen':24,Textilpraxis:25,Luftpfade:25,Modellunterlagen:25,Haushaltsbuch:25,Praxistests:25,Messunsicherheit:25,Geräteablauf:25,Weiterverwendung:25,Raumübergabe:25,Wohnszenarien:25,Verbrauchsverlauf:41,Fensterbetrieb:41,Pflegeabläufe:40,Haushaltskoordination:40,Nachweisprüfung:40,Wasserwege:40,Raumakustik:40,Mehrgerätebetrieb:40,Gebrauchtgeräte:40,Küchenressourcen:40,Klimaverlauf:40,Wohnmobil:30,'Arbeitsplatz-Messpraxis':30,'Lokale Wärme':30,Luftkühler:30,'Wäsche mit Wärme':30,Gartenalltag:30, Gefrierpraxis:18,'Geschirrspüler-Einbau':24,Wäschesäule:17,Lüftungskauf:24,Ersatzteilnachweis:20,Dunstabzug:17,Backofenzubehör:18,Brausenzubehör:23,Rollenzubehör:18,'Altgeräte-Rücknahme':20,Induktionsgeschirr:18,Betriebszustände:21,Spülstatus:24,'Airfryer-Behälter':17,Kompaktspülen:17,"Filterkannen":22,"Textilzeichen":20,"Türbodenspalt":21,"Roboterpflege":24,"Kühlgerätekauf":20,"LED-Kaufprüfung":16,"Kaffeemaschinenpflege":22,"Waschmitteldosierung":23,"Spülmittel und Wasserhärte":25,"Bodenstaubsaugerpflege":22,"Dampfbügelgeräte":24,"Stabmixer und Zubehör":25,"Mikrowellenbelege":23,"Küchenwaagen":13,"Wasserkocherbelege":16,"Toasterbelege":10,"Fenstersauger":12});
  assert.equal(expandedDefinitions.length,2015);
});

test('old or invalid cursors reject safely and both catalogue boundaries paginate completely', async () => {
  for (const cursor of ['1.24.2:100','1.24.3:99','1.24.3:5000','1.24.3:0100','1.24.3:0',null,100]) {
    const response = await worker.fetch(request('tools/list',{cursor}), {}, {});
    assert.equal((await response.json()).error.code,-32602);
  }
  const {pageTools} = await import('../src/mcp-pagination.mjs');
  for (const size of [1000,2001,2101]) {
    const expected = Array.from({length:size}, (_,i)=>({name:'example_'+i}));
    const sizes = [];
    const seen = await collectToolPages(async cursor => {
      const page = pageTools(expected,cursor,'99.0.0');
      sizes.push(page.tools.length);
      return page;
    }, {maxPages:Math.ceil(size/100)});
    const remainder = size % 100;
    assert.deepEqual(sizes,[...Array(Math.floor(size / 100)).fill(100),...(remainder ? [remainder] : [])]);
    assert.deepEqual(seen,expected);
  }
  let repeated=0;
  await assert.rejects(collectToolPages(async()=>({tools:[{name:'case_'+(++repeated)}],nextCursor:'same'})),
    /Invalid or repeated/);
});

test('keyword and category filters narrow the public directory without logging the query', async () => {
  const get = async path => worker.fetch(new Request(origin+'/api/mcp-tools'+path), {
    EVENTS:{prepare:()=>{ throw new Error('search tried to use analytics') }},
  }, {});
  const response = await get('?q=Abwaerme&category=K%C3%BChlen');
  const result = await response.json();
  assert.equal(response.headers.get('cache-control'),'no-store');
  assert.equal(result.catalogueTotal,callableNames);
  assert.equal(result.total,1);
  assert.equal(result.tools[0].name,'arbeitszimmer_abwaerme_vergleich');
  const noMatch = await (await get('?q=unique-unmatched-string')).json();
  assert.deepEqual(noMatch.tools,[]);
  for (const [question,expected] of [
    ['Wie viel BTU brauche ich?','btu_empfehlung'],
    ['Wie finde ich die richtige Fensterabdichtung?','fensterabdichtung_laenge'],
    ['Kann ich einen Entfeuchter in den Keller stellen?','entfeuchter_ablaufcheck'],
    ['Wie lange darf ich mit 72 Litern duschen?','dusche_zeit_bei_wasserbudget'],
    ['Was mache ich, wenn mein Saugroboter über das Kabel fährt?','saugroboter_kabelroute_vorbereiten'],
    ['Kann ich den Abflussschlauch nach oben führen?','entfeuchter_ablaufcheck'],
    ['Passt der Ersatzfilter in mein Luftreinigermodell?','luftreiniger_ersatzfilter_zuordnung'],
  ]) {
    const response = await (await get('?q='+encodeURIComponent(question))).json();
    assert.ok(response.tools.slice(0,10).some(tool=>tool.name===expected),question);
  }
  const all = await get('');
  assert.match(all.headers.get('cache-control'),/public/);
});

test('common German buyer phrases return the intended task near the top', async () => {
  for (const [question, name] of [
    ['Wie verteile ich die Wäsche auf Liegeplätze und Leine?','waesche_trockenweg_sortierplan'],
    ['Wäsche liegend oder an der Leine trocknen einteilen','waesche_trockenweg_sortierplan'],
    ['Wie viel ist der Stoff beim Waschen eingelaufen?','textil_masshaltigkeit_vor_nach_pflege'],
    ['Ist der Stoff nach der Pflege geschrumpft?','textil_masshaltigkeit_vor_nach_pflege'],
    ['Kommt aus meiner Lüftung Frischluft oder nur Umluft?','lueftung_aussenluft_umluftrate_aufteilen'],
    ['Wieviel Frischluft steckt in der Zuluft mit Umluft?','lueftung_aussenluft_umluftrate_aufteilen'],
    ['Habe ich die Stromrechnung doppelt bezahlt?','stromjournal_mehrfachzahlung_kandidat'],
    ['Habe ich die Stromrechnung zweimal überwiesen?','stromjournal_mehrfachzahlung_kandidat'],
  ]) {
    const params = new URLSearchParams({q:question,view:'compact',limit:'3'});
    const response = await worker.fetch(new Request(origin+'/api/mcp-tools?'+params), {}, {});
    assert.equal(response.status,200);
    assert.ok((await response.json()).tools.some(tool=>tool.name===name),question);
  }
});

test('compact catalogue has linkable summaries and exact names return complete contracts', async () => {
  const read=async query=>(await worker.fetch(new Request(origin+'/api/mcp-tools'+query),{},{})).json();
  const complete=await read('');
  const compact=await read('?view=compact');
  assert.equal(compact.total,callableNames);
  assert.equal(compact.distinctTotal,distinctTasks);
  assert.equal(compact.tools.find(t=>t.name==='luftbefeuchter_weisser_belag').equivalent_task,
    'befeuchter_weissen_belag_einordnen');

  assert.deepEqual(compact.tools.map(tool=>tool.name),complete.tools.map(tool=>tool.name));
  assert.ok(compact.tools.every(tool=> !Object.hasOwn(tool,'inputSchema')));
  assert.equal(compact.tools.find(t=>t.name==='strommessung_hochrechnen').citation_url,origin+'/strommess-protokoll.html');
  const query='?q='+encodeURIComponent('Kann ich einen Entfeuchter in den Keller stellen?');
  const [fullMatch,compactMatch]=await Promise.all([read(query),read(query+'&view=compact')]);
  assert.deepEqual(fullMatch.tools.map(t=>t.name),compactMatch.tools.map(t=>t.name));
  const exact=await read('?tool=strommessung_hochrechnen');
  assert.equal(exact.catalogueTotal,callableNames);
  assert.deepEqual(exact.tools,[complete.tools.find(t=>t.name==='strommessung_hochrechnen')]);
  assert.deepEqual((await read('?tool=strommessung')).tools,[]);
});

test('one reviewed example can be fetched without calling the tool or returning all fixtures', async () => {
  const read=async suffix=>worker.fetch(new Request(origin+'/api/mcp-tools'+suffix),{}, {});
  for (const suffix of ['?view=examples','?view=examples&tool=']) {
    assert.equal((await read(suffix)).status,400);
  }
  const defaultResult=await (await read('?tool=strommessung_hochrechnen')).json();
  assert.equal(defaultResult.tools[0].example,undefined);
  const resp=await read('?view=examples&tool=strommessung_hochrechnen');
  assert.equal(resp.headers.get('cache-control'),'no-store');
  const payload=await resp.json();
  assert.equal(payload.total,1);
  const [tool]=payload.tools;
  assert.equal(tool.citation_url,origin+'/strommess-protokoll.html');
  assert.equal(tool.citation_markdown_url,origin+'/strommess-protokoll.md');
  assert.ok(tool.inputSchema);
  assert.equal(tool.example.expected_fields.eur_for_period,60);
  const outcome=await rpc('tools/call',{name:tool.name,arguments:tool.example.arguments});
  assert.equal(outcome.structuredContent.eur_for_period,60);
  const legacy=await (await read('?view=examples&tool=btu_empfehlung')).json();
  assert.ok(legacy.tools[0].example.arguments.qm > 0);
  assert.ok(legacy.tools[0].citation_url.startsWith(origin));
  assert.equal((await (await read('?view=examples&tool=does_not_exist')).json()).total,0);
});

test('a bounded catalogue response keeps the match total and rank order', async () => {
  const read=query=>worker.fetch(new Request(origin+'/api/mcp-tools'+query),{}, {});
  const options='?view=compact&category=K%C3%BChlen';
  const full=await (await read(options)).json();
  const bounded=await (await read(options+'&limit=3')).json();
  assert.equal(bounded.total,full.total);
  assert.equal(bounded.returned,3);
  assert.equal(bounded.catalogueTotal,callableNames);
  assert.equal(bounded.distinctTotal,distinctTasks);
  assert.deepEqual(bounded.tools,full.tools.slice(0,3));
  assert.equal(bounded.nextOffset,3);
  const second=await (await read(options+'&limit=3&offset=3')).json();
  assert.equal(second.total,full.total);
  assert.equal(second.returned,3);
  assert.equal(second.nextOffset,6);
  assert.deepEqual(second.tools,full.tools.slice(3,6));
  const last=await (await read(options+'&limit=3&offset='+String(full.total-1))).json();
  assert.equal(last.returned,1);
  assert.equal(last.nextOffset,undefined);
  const past=await (await read(options+'&limit=3&offset=1000')).json();
  assert.equal(past.returned,0);
  assert.equal(past.nextOffset,undefined);
  assert.equal(past.total,full.total);
  for (const invalidQuery of ['?offset=3','?limit=3&offset=-1','?limit=3&offset=2.5','?limit=3&offset=','?limit=3&offset=0002']) {
    const invalid=await read(invalidQuery);
    assert.equal(invalid.status,400);
    assert.equal((await invalid.json()).error,'invalid_offset');
  }


  const short=await (await read('?view=compact&limit=24')).json();
  assert.equal(short.total,callableNames);
  assert.equal(short.returned,24);
  const none=await (await read('?q=zzqqzzxxyyll&limit=3')).json();
  assert.equal(none.total,0);
  assert.equal(none.returned,0);
  for(const value of ['', '0','101','1.5','-1','1e2']) {
    const invalid=await read('?limit='+encodeURIComponent(value));
    assert.equal(invalid.status,400);
    assert.equal((await invalid.json()).error,'invalid_limit');
  }
});

test('every source page for the deterministic suites has an editorial Markdown mirror', () => {
  for (const page of new Set(expandedDefinitions.map(tool=>tool.page))) {
    const path = '../site' + page.replace(/\.html$/,'.md');
    const markdown = readFileSync(new URL(path,import.meta.url),'utf8');
    assert.ok(markdown.includes(origin + page),page);
    assert.doesNotMatch(markdown,/https?:\/\/[^\s")<>]*(?:amazon\.|amzn\.)|[?&]tag=|getecoback-21/i,page);
  }
});

for (const tool of expandedDefinitions) {
  test(tool.name, async () => {
    const {name,page,example,properties} = tool;
    const html = readFileSync(new URL('../site'+page,import.meta.url),'utf8');
    assert.match(page, /^\/[a-z0-9/-]+\.html$/);
    assert.ok(html.includes('href="'+origin+page+'"'), 'missing canonical source');
    assert.doesNotMatch(html, /name=["']robots["'][^>]+noindex/i);
    assert.match(tool.description,/ — /);
    assert.ok(Object.keys(example.expect).length > 0);
    const exampleResponse = await worker.fetch(
      new Request(origin + '/api/mcp-tools?' + new URLSearchParams({view:'examples',tool:name})), {}, {});
    assert.equal(exampleResponse.status,200);
    const published = (await exampleResponse.json()).tools[0];
    assert.equal(published.name,name);
    assert.deepEqual(published.example,{arguments:example.args,expected_fields:example.expect});
    assert.equal(published.citation_markdown_url,origin+page.replace(/\.html$/,'.md'));
    const result = await rpc('tools/call',{name,arguments:example.args});
    assert.equal(result.isError,false);
    assert.equal(result.structuredContent.citation_url,origin+page);
    assert.deepEqual(result.structuredContent,JSON.parse(result.content[0].text));
    assert.doesNotMatch(result.content[0].text, /https?:\/\/[^\s"]*(?:amazon\.|amzn\.)|[?&]tag=/i);
    for (const [key,value] of Object.entries(example.expect)) {
      const actual = result.structuredContent[key];
      if (typeof value === 'number') {
        assert.equal(typeof actual,'number',key);
        assert.ok(Math.abs(actual-value) <= 1e-8 * Math.max(1,Math.abs(value)),key + ': '+actual+' versus '+value);
      } else {
        assert.deepEqual(actual,value,key);
      }
    }
    const invalid = expandedCall(name,{...example.args, private:'raw-home-input'});
    assert.equal(invalid.isError,true);
    assert.doesNotMatch(invalid.content[0].text,/raw-home-input/);
    for (const key of Object.keys(example.args)) {
      const args = {...example.args};
      delete args[key];
      assert.equal(expandedCall(name,args).isError,true);
    }
  });
}

test('all successful tools record the fixed outcome without raw inputs, while QA is excluded', async () => {
  const rows = [];
  const events = {EVENTS:{prepare:()=>({bind:(...args)=>({run:async()=>rows.push(args)})})}};
  const {name,example} = expandedDefinitions[0];
  const qa = request('tools/call',{name,arguments:example.args});
  await worker.fetch(qa.clone(),events,{});
  assert.deepEqual(rows,[]);
  const ordinary = new Request(qa,{headers:{'content-type':'application/json','user-agent':'LocalClient'}});
  await worker.fetch(ordinary,events,{});
  assert.equal(rows[0][0],'mcp_call');
  assert.deepEqual(JSON.parse(rows[0][1]),{tool:name,outcome:'complete',ua:'LocalClient'});
  const older = request('tools/call',{name:'btu_empfehlung',arguments:{qm:20,private:'raw-home-input'}});
  const legacy = new Request(older,{headers:{'content-type':'application/json','user-agent':'LocalClient'}});
  await worker.fetch(legacy,events,{});
  assert.equal(rows[1][0],'mcp_call');
  assert.deepEqual(JSON.parse(rows[1][1]),{tool:'btu_empfehlung',outcome:'complete',ua:'LocalClient'});
});

test('adoption summary keeps complete UTC windows separate from the diagnostic list', async () => {
  const fixture = {start:'2026-11-13',end_exclusive:'2026-11-20',completed_calls:25,tools_called:8,browser_class_calls:2};
  let summaryQueries = 0;
  const env = {EVENTS:{prepare(sql) {
    return {all:async()=>{
      if (!sql.includes('AS browser_class_calls')) return {results:[]};
      summaryQueries++;
      assert.match(sql, /day < date\('now'\)/);
      assert.match(sql,/ua_class != 'ci'/);
      return {results:[fixture]};
    }};
  }}};
  const response=await worker.fetch(new Request(origin+'/api/trend'),env,{waitUntil(){}});
  assert.equal(response.status,200);
  const data=await response.json();
  assert.equal(summaryQueries,1);
  assert.deepEqual(data.mcp_complete_week,fixture);
  assert.deepEqual(data.mcp,[]);
});

test('real SQLite retains complete-week totals and separates marked compact executions from offered cellar links', () => {
  const script = `import json,sqlite3,sys
db=sqlite3.connect(':memory:'); db.row_factory=sqlite3.Row
db.execute('CREATE TABLE ev(day,name,page,ua_class,meta)'); db.execute('CREATE INDEX ev_day ON ev(day)')
sql=sys.argv[1].replace("date('now'", "date('2026-11-27'")
def read(): return dict(db.execute(sql).fetchone())
def add(day='2026-11-22', event='mcp_call', page='/mcp', ua='other', meta=None):
 db.execute('INSERT INTO ev VALUES(?,?,?,?,?)',(day,event,page,ua,meta if isinstance(meta,str) else json.dumps(meta)))
add(day='2026-11-20', ua=None, meta={'tool':'legacy'})
add(ua='human',meta='{broken')
legacy=read()
compact={'tool':'cellar','mcp_profile':'compact','mcp_cellar_link':1}
add(meta=compact); add(day='2026-11-24',ua='human',meta={**compact,'mcp_cellar_link':'1'})
add(day='2026-11-23',meta={**compact,'mcp_cellar_link':True}); add(day='2026-11-26',meta={'tool':'other','mcp_profile':'compact'})
add(meta={**compact,'mcp_profile':'other'}); add(ua='ci',meta=compact)
add(ua=None,meta=compact); add(meta={'mcp_profile':'compact','mcp_cellar_link':1})
add(event='mcp_probe',meta=compact); add(day='2026-11-19',meta=compact)
add(day='2026-11-27',meta=compact); add(page='/other',meta=compact)
mixed=read()
n90={'tool':'pac_n90_energielabel_zu_stromkosten','mcp_profile':'compact','mcp_n90_link':1}
add(day='2026-11-26',meta=n90); add(day='2026-11-23',meta=n90)
for marker in [0,2,True,'1',None]: add(meta={**n90,'mcp_n90_link':marker})
add(meta={**n90,'tool':'another'}); add(meta={**n90,'mcp_profile':'full'})
add(day='2026-11-19',meta=n90); add(day='2026-11-27',meta=n90)
add(ua=None,meta=n90); add(ua='ci',meta=n90); add(event='mcp_probe',meta=n90); add(page='/other',meta=n90)
print(json.dumps([legacy,mixed,read(),[row[3] for row in db.execute('EXPLAIN QUERY PLAN '+sql)]]))`;
  const result = spawnSync('python3',['-c',script,COMPLETE_MCP_WEEK_SQL],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  const [legacy,mixed,withN90,plan] = JSON.parse(result.stdout);
  assert.ok(plan.some(line => line.includes('USING INDEX ev_day')),plan.join(' '));
  const window={start:'2026-11-20',end_exclusive:'2026-11-27'};
  assert.deepEqual(completedMcpReports(legacy),{
    completeWeek:{...window,completed_calls:2,tools_called:1,browser_class_calls:1},compactCompleteWeek:null,n90CompactCompleteWeek:null,
  });
  assert.deepEqual(completedMcpReports(mixed),{
    completeWeek:{...window,completed_calls:9,tools_called:3,browser_class_calls:2},
    compactCompleteWeek:{...window,first_recorded_day:'2026-11-22',completed_calls:4,cellar_links_offered:1},
    n90CompactCompleteWeek:null,
  });
  assert.deepEqual(completedMcpReports(withN90).n90CompactCompleteWeek,{
    ...window,first_recorded_day:'2026-11-23',n90_links_offered:2,
  });
  assert.deepEqual(completedMcpReports(null),{completeWeek:null,compactCompleteWeek:null,n90CompactCompleteWeek:null});
});

test('Fenstersauger distinguishes parts, missing evidence, and the same light pattern by phase', async () => {
  const checkedPart = await rpc('tools/call', {
    name:'fenstersauger_170mm_abziehlippe_geraetefamilie',
    arguments:{geraet:'wv8_signature_16337850', schmale_originalduese:true, teilenummer:'26335130'},
  });
  assert.equal(checkedPart.structuredContent.status, 'herstellerliste_bestaetigt');
  const missingNozzle = await rpc('tools/call', {
    name:'fenstersauger_170mm_abziehlippe_geraetefamilie',
    arguments:{geraet:'wv8_signature_16337850', schmale_originalduese:false, teilenummer:'26335130'},
  });
  assert.equal(missingNozzle.structuredContent.status, 'offen');
  const currentPhase = async zustand => (await rpc('tools/call', {
    name:'fenstersauger_wv3_wv8_led_muster_einordnen',
    arguments:{artikel:'1.633-698.0', sicherheitsblatt_bestaetigt:true, muster:'eine_led_schnell', zustand},
  })).structuredContent.tabellenbedeutung;
  assert.equal(await currentPhase('waehrend_laden'), 'laden_nicht_moeglich');
  assert.equal(await currentPhase('waehrend_betrieb'), 'turbine_ueberhitzt_oder_blockiert_laut_tabelle');
  assert.equal(await currentPhase('offen'), null);
});
