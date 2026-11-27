import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {MCP_SERVER_INFO, MCP_TOOLS} from '../analytics-worker/index.js';

const origin = 'https://agiscorecard.com';
const snapshotPath = '/mcp-directory-assets/catalog.json';
const expected = await readFile(new URL('../..' + snapshotPath, import.meta.url));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const protocol = '2026-07-28';
const meta = {
  'io.modelcontextprotocol/protocolVersion':protocol,
  'io.modelcontextprotocol/clientCapabilities':{},
  'io.modelcontextprotocol/clientInfo':{name:'agi-site-deploy-selfcheck',version:'1.0'},
};

async function read(path, options = {}) {
  const response = await fetch(origin + path, {
    ...options,
    headers: {'user-agent':'agi-site-deploy-selfcheck/1.0 (+https://github.com/f-tiger/agi-site)', ...options.headers},
    signal: AbortSignal.timeout(15000),
  });
  assert.equal(response.status, 200, path);
  return response;
}

async function mcp(method, params = {}, modern = true) {
  const headers = {'content-type':'application/json',accept:'application/json'};
  if (modern) {
    Object.assign(headers, {'MCP-Protocol-Version':protocol,'Mcp-Method':method});
    if (method === 'tools/call') headers['Mcp-Name'] = params.name;
  }
  return read('/mcp?__ci=1', {method:'POST', headers, body:JSON.stringify({
    jsonrpc:'2.0', id:1, method, params:modern ? {...params,_meta:meta} : params,
  })}).then(response => response.json());
}

const [english, chinese, snapshot, discovery, legacy, list, rpc, measured] = await Promise.all([
  read('/agents/?__ci=1').then(r => r.text()),
  read('/zh/agents/?__ci=1').then(r => r.text()),
  read(snapshotPath).then(r => r.arrayBuffer()),
  mcp('server/discover'),
  mcp('initialize', {protocolVersion:'2025-11-25',capabilities:{},clientInfo:{name:'agi-site-deploy-selfcheck',version:'1.0'}}, false),
  mcp('tools/list'),
  mcp('tools/call', {name:'search_mcp_catalog', arguments:{featured:true,limit:2}}),
  read('/api/mcp-usage').then(r => r.json()),
]);
assert.equal(sha256(Buffer.from(snapshot)), sha256(expected), 'Catalog bytes do not match the deployed source');
const data = JSON.parse(expected);
for (const [html,path] of [[english,'/agents/'],[chinese,'/zh/agents/']]) {
  assert.ok(html.includes('rel="canonical" href="' + origin + path + '"'));
  assert.match(html, /\/mcp-directory-assets\/app\.mjs/);
  const documented = html.match(/<!-- catalog-evidence:start -->([\s\S]+?)<!-- catalog-evidence:end -->/)?.[1] || '';
  assert.equal((documented.match(/<li class="directory-result">/g) || []).length,
    Math.min(6, data.entries.filter(entry => entry.featured).length), path + ' initial HTML catalog entries');
  assert.ok(html.includes('<time datetime="' + data.asOf + '">'), path + ' snapshot date');
}
assert.ok(rpc.result && !rpc.result.isError);
assert.equal(discovery.result.resultType, 'complete');
assert.ok(discovery.result.supportedVersions.includes(protocol));
assert.deepEqual(discovery.result._meta['io.modelcontextprotocol/serverInfo'], MCP_SERVER_INFO);
assert.equal(legacy.result.protocolVersion, '2025-11-25');
assert.deepEqual(legacy.result.serverInfo, MCP_SERVER_INFO);
assert.deepEqual(list.result.tools, MCP_TOOLS);
assert.equal(measured.ok, true);
assert.equal(measured.window.days, 28);
assert.ok(Array.isArray(measured.groups));
const result = JSON.parse(rpc.result.content[0].text);
assert.equal(result.asOf, data.asOf);
assert.equal(result.matchCount, data.entries.filter(entry => entry.featured).length);
assert.ok(result.results.length > 0 && result.results.length <= 2);
assert.ok(result.results.every(entry => entry.featured));
console.log(JSON.stringify({catalogEntries:data.entries.length, featuredEntries:result.matchCount, asOf:data.asOf, sha256:sha256(expected), qa:true}));
