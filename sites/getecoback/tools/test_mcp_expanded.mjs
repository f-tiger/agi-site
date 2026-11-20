import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import worker from '../src/worker.js';
import {expandedDefinitions, expandedCall} from '../src/mcp-expanded.mjs';
import {collectToolPages} from '../src/mcp-pagination.mjs';

const origin = 'https://getecoback.com';
const distinctTasks = 758;
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
  assert.deepEqual(pageSizes,[100,100,100,100,100,100,100,59]);
  assert.equal(directory.version, manifest.version);
  assert.equal(initialization.serverInfo.version, manifest.version);
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
  assert.deepEqual(byCategory, {Raumklima:10,'Strom & Haushalt':20,Feuchte:18,Kühlen:18,Heizen:18,Passform:16,
    'Energie prüfen':24,'Raumkomfort prüfen':24,'Geräte pflegen':24,'Quellen & Kaufprüfung':24, 'Wasser & Wäsche':24,'Gebäude & Fenster':24,'Geräte im Alltag':24,'Messpraxis':24,'Zugang & Alltag':24,Saisonwechsel:24,Kaufpraxis:25,'Ressourcen planen':24,Raumplanung:24,Wetterpraxis:24,Küchenpraxis:24,Servicevorbereitung:24,'Belege abgleichen':24,Textilpraxis:25,Luftpfade:25,Modellunterlagen:25,Haushaltsbuch:25,Praxistests:25,Messunsicherheit:25,Geräteablauf:25,Weiterverwendung:25,Raumübergabe:25,Wohnszenarien:25});
  assert.equal(expandedDefinitions.length,749);
});

test('old or invalid cursors reject safely and a 1000-tool catalogue paginates completely', async () => {
  for (const cursor of ['1.10.0:100','1.11.0:99','1.11.0:800','1.11.0:0100','1.11.0:0',null,100]) {
    const response = await worker.fetch(request('tools/list',{cursor}), {}, {});
    assert.equal((await response.json()).error.code,-32602);
  }
  const {pageTools} = await import('../src/mcp-pagination.mjs');
  const expected = Array.from({length:1000}, (_,i)=>({name:'example_'+i}));
  let calls=0;
  const seen=await collectToolPages(async cursor=>{
    const page=pageTools(expected,cursor,'99.0.0');
    assert.equal(page.tools.length,100);
    calls++;
    return page;
  });
  assert.equal(calls,10);
  assert.deepEqual(seen,expected);
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
    for (const key of Object.keys(properties)) {
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
