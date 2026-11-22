import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';

const origin = 'https://agiscorecard.com';
const snapshotPath = '/mcp-directory-assets/catalog.json';
const expected = await readFile(new URL('../..' + snapshotPath, import.meta.url));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

async function read(path, options = {}) {
  const response = await fetch(origin + path, {
    ...options,
    headers: {'user-agent':'agi-site-deploy-selfcheck/1.0 (+https://github.com/f-tiger/agi-site)', ...options.headers},
    signal: AbortSignal.timeout(15000),
  });
  assert.equal(response.status, 200, path);
  return response;
}

const [english, chinese, snapshot, rpc] = await Promise.all([
  read('/agents/?__ci=1').then(r => r.text()),
  read('/zh/agents/?__ci=1').then(r => r.text()),
  read(snapshotPath).then(r => r.arrayBuffer()),
  read('/mcp?__ci=1', {
    method: 'POST', headers: {'content-type':'application/json', accept:'application/json'},
    body: JSON.stringify({jsonrpc:'2.0', id:1, method:'tools/call', params:{
      name:'search_mcp_catalog', arguments:{featured:true, limit:2},
    }}),
  }).then(r => r.json()),
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
const result = JSON.parse(rpc.result.content[0].text);
assert.equal(result.asOf, data.asOf);
assert.equal(result.matchCount, data.entries.filter(entry => entry.featured).length);
assert.ok(result.results.length > 0 && result.results.length <= 2);
assert.ok(result.results.every(entry => entry.featured));
console.log(JSON.stringify({catalogEntries:data.entries.length, featuredEntries:result.matchCount, asOf:data.asOf, sha256:sha256(expected), qa:true}));
