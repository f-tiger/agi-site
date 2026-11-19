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

test('MCP and the public tool directory expose the same 100 unique tools', async () => {
  const {tools} = await rpc('tools/list');
  const listing = await worker.fetch(new Request(origin+'/api/mcp-tools'), {}, {});
  const directory = await listing.json();
  const manifest = JSON.parse(readFileSync(new URL('../mcp/server.json',import.meta.url),'utf8'));
  const initialization = await rpc('initialize');
  assert.equal(directory.version, manifest.version);
  assert.equal(initialization.serverInfo.version, manifest.version);
  assert.equal(directory.total, 100);
  assert.equal(new Set(tools.map(t=>t.name)).size,100);
  assert.deepEqual(directory.tools.map(t=>t.name), tools.map(t=>t.name));
  const byCategory = {};
  for (const {category} of directory.tools) byCategory[category] = (byCategory[category] || 0) + 1;
  assert.deepEqual(byCategory, {Raumklima:10,'Strom & Haushalt':20,Feuchte:18,Kühlen:18,Heizen:18,Passform:16});
  assert.equal(expandedDefinitions.length,90);
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
