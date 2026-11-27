import assert from 'node:assert/strict';
import manifest from '../trade-mcp/server.json' with {type: 'json'};
import {validateManifest} from './trade-mcp-registry.mjs';

const {name, version, websiteUrl, remotes} = validateManifest(manifest);
const endpoint = remotes[0].url;
const probe = {'User-Agent': 'bpj-ci-selfcheck/1.0'};
const request = (url, options = {}) => fetch(url, {
  ...options, headers: {...options.headers, ...probe}, redirect: 'error', signal: AbortSignal.timeout(20000),
});

const [publicManifest, docs] = await Promise.all([
  request(new URL('/.well-known/trade-mcp.json', endpoint)), request(websiteUrl),
]);
assert.equal(publicManifest.status, 200, 'Public trade MCP manifest missing');
assert.deepEqual(await publicManifest.json(), manifest, 'Live manifest differs from the exact release manifest');
assert.equal(docs.status, 200, 'Public install guide missing');
const html = await docs.text();
assert(html.includes(`rel="canonical" href="${websiteUrl}"`), 'Install guide canonical missing');
assert(html.includes(endpoint) && html.includes('Authorization'), 'Install guide lacks connection details');

let id = 0;
async function rpc(method, params) {
  const requestId = ++id;
  const response = await request(endpoint + '?__probe=1', {
    method: 'POST', headers: {'Content-Type': 'application/json', Accept: 'application/json, text/event-stream'},
    body: JSON.stringify({jsonrpc: '2.0', id: requestId, method, params}),
  });
  const value = await response.json();
  assert.equal(response.headers.get('cache-control'), 'no-store');
  if (response.ok) {
    assert.equal(value.id, requestId);
    assert(!value.error, `${method} returned a JSON-RPC error`);
  }
  return {response, value};
}

const protocol = '2025-11-25';
const initialized = await rpc('initialize', {protocolVersion: protocol, capabilities: {}, clientInfo: {name: 'bpj-trade-registry-probe', version: '1.0.0'}});
assert.equal(initialized.response.status, 200);
assert.equal(initialized.value.result.protocolVersion, protocol);
assert.equal(initialized.value.result.serverInfo.name, name);
assert.equal(initialized.value.result.serverInfo.version, version);
const listed = await rpc('tools/list', {});
assert.equal(listed.response.status, 200);
const tools = listed.value.result.tools.map(tool => tool.name);
assert.deepEqual(tools, ['list_trade_tools', 'get_trade_tool', 'run_trade_tool']);

const denied = await rpc('tools/call', {name: 'list_trade_tools', arguments: {}});
assert.equal(denied.response.status, 401);
assert.equal(denied.response.headers.get('www-authenticate'), 'Bearer realm="bpj-trade-mcp"');
assert.deepEqual(denied.value, {error: 'trade_key_required', docs: websiteUrl});
assert.equal((await request(endpoint)).status, 405, 'Stateless MCP must explicitly decline an SSE GET stream');
console.log(JSON.stringify({ok: true, name, version, endpoint, tools, auth: 'Anonymous business call rejected'}));
