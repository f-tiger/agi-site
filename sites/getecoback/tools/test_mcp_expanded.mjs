import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import worker from '../src/worker.js';
import {expandedDefinitions, expandedCall} from '../src/mcp-expanded.mjs';

const origin = 'https://getecoback.com';
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

test('the public directory and two MCP pages expose the same 196 unique tools', async () => {
  const first = await rpc('tools/list');
  const second = await rpc('tools/list',{cursor:first.nextCursor});
  const directory = await (await worker.fetch(new Request(origin+'/api/mcp-tools'), {}, {})).json();
  const manifest = JSON.parse(readFileSync(new URL('../mcp/server.json',import.meta.url),'utf8'));
  const initialization = await rpc('initialize');
  assert.equal(first.tools.length,100);
  assert.equal(second.tools.length,96);
  assert.equal(second.nextCursor,undefined);
  assert.equal(directory.version, manifest.version);
  assert.equal(initialization.serverInfo.version, manifest.version);
  assert.equal(directory.total,196);
  const names=[...first.tools,...second.tools].map(t=>t.name);
  assert.equal(new Set(names).size,196);
  assert.deepEqual(directory.tools.map(t=>t.name),names);
  const byCategory = {};
  for (const {category} of directory.tools) byCategory[category] = (byCategory[category] || 0) + 1;
  assert.deepEqual(byCategory, {Raumklima:10,'Strom & Haushalt':20,Feuchte:18,Kühlen:18,Heizen:18,Passform:16,
    'Energie prüfen':24,'Raumkomfort prüfen':24,'Geräte pflegen':24,'Quellen & Kaufprüfung':24});
  assert.equal(expandedDefinitions.length,186);
});

test('old or invalid cursors reject safely and a 1000-tool catalogue paginates completely', async () => {
  for (const cursor of ['1.5.0:100','1.6.0:99','1.6.0:200','1.6.0:0100','1.6.0:0',null,100]) {
    const response = await worker.fetch(request('tools/list',{cursor}), {}, {});
    assert.equal((await response.json()).error.code,-32602);
  }
  const {pageTools, collectToolPages} = await import('../src/mcp-pagination.mjs');
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
  assert.equal(result.catalogueTotal,196);
  assert.equal(result.total,1);
  assert.equal(result.tools[0].name,'arbeitszimmer_abwaerme_vergleich');
  const noMatch = await (await get('?q=unique-unmatched-string')).json();
  assert.deepEqual(noMatch.tools,[]);
  const all = await get('');
  assert.match(all.headers.get('cache-control'),/public/);
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

test('new successful tools record the fixed outcome without raw inputs, while QA is excluded', async () => {
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
