// A real official-SDK client, over real HTTP. No LLM or production usage event.
// Install: npm ci --prefix sites/thedollscout/mcp --ignore-scripts
// Local: node sites/thedollscout/scripts/collecting/verify-mcp-client.mjs --local
// Live (Node 24): node --use-env-proxy sites/thedollscout/scripts/collecting/verify-mcp-client.mjs --live
// SDK v1.x is the maintained compatibility line for this server's 2025 protocol.
// https://github.com/modelcontextprotocol/typescript-sdk/tree/v1.x
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {SERVER, PROTOCOL_VERSION, TOOLS, RESOURCES} from '../../collector-assets/mcp-contract.mjs';
import {decodeEventPayload,makeParticipantPayload} from '../../collector-assets/event-kit-core.mjs';

const require = createRequire(new URL('../../mcp/package.json', import.meta.url));
const {Client} = require('@modelcontextprotocol/sdk/client/index.js');
const {StreamableHTTPClientTransport} = require('@modelcontextprotocol/sdk/client/streamableHttp.js');
const site = fileURLToPath(new URL('../../', import.meta.url));
const local = process.argv.includes('--local');
assert.ok(process.argv.slice(2).every(value => ['--local', '--live'].includes(value)), 'Use --local or --live.');
assert.ok(!(local && process.argv.includes('--live')), 'Choose one verification target.');
const timeout = {timeout: 15000};
const headers = {'User-Agent':'tds-ci-selfcheck-sdk/1.0', 'x-probe':'mcp-sdk-release'};
let server;
let endpoint = new URL('https://thedollscout.com/mcp?ci=1');

if (local) {
 const {onRequest, MAX_MCP_REQUEST_BYTES} = await import('../../functions/mcp.js');
 // HITS is deliberately absent: the local adapter cannot write telemetry.
 const env = {ASSETS:{fetch:async value => {
  const url = new URL(value);
  assert.equal(url.origin, 'https://thedollscout.com');
  const filename = path.resolve(site, '.' + url.pathname);
  assert.ok(filename.startsWith(site), 'Asset must stay within the site.');
  try { return new Response(await readFile(filename), {headers:{'content-type':'application/json'}}); }
  catch (error) { if (error.code === 'ENOENT') return new Response('Missing asset', {status:404}); throw error; }
 }}};
 server = createServer(async (incoming, outgoing) => {
  try {
   if (new URL(incoming.url, 'http://localhost').pathname !== '/mcp') { outgoing.writeHead(404).end(); return; }
   const parts = []; let size = 0;
   for await (const part of incoming) { size += part.length; if (size > MAX_MCP_REQUEST_BYTES) { outgoing.writeHead(413).end(); return; } parts.push(part); }
   const request = new Request('https://thedollscout.com' + incoming.url, {
    method:incoming.method, headers:incoming.headers,
    ...(!['GET','HEAD'].includes(incoming.method) ? {body:Buffer.concat(parts)} : {})
   });
   const response = await onRequest({request, env});
   outgoing.writeHead(response.status, Object.fromEntries(response.headers));
   outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) { outgoing.writeHead(500, {'content-type':'text/plain'}).end(String(error.message)); }
 });
 await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
 endpoint = new URL(`http://127.0.0.1:${server.address().port}/mcp?ci=1`);
}

const client = new Client({name:'tds-ci-selfcheck-sdk', version:'1.0.0'}, {capabilities:{}});
const transport = new StreamableHTTPClientTransport(endpoint, {
 requestInit:{headers, redirect:'error'},
 reconnectionOptions:{maxRetries:0, initialReconnectionDelay:1000, maxReconnectionDelay:1000, reconnectionDelayGrowFactor:1}
});
let verification;
try {
 await client.connect(transport, timeout); // Includes initialize and initialized notification.
 assert.deepEqual(client.getServerVersion(), SERVER);
 assert.equal(transport.protocolVersion, PROTOCOL_VERSION);
 const listed = await client.listTools({}, timeout);
 assert.deepEqual(listed.tools.map(tool => tool.name).sort(), TOOLS.map(tool => tool.name).sort());
 const resources = await client.listResources({}, timeout);
 const uri = 'https://thedollscout.com/collector-assets/series-catalog.json';
 assert.ok(RESOURCES.some(resource => resource.uri === uri));
 assert.ok(resources.resources.some(resource => resource.uri === uri));
 const read = await client.readResource({uri}, timeout);
 const catalog = JSON.parse(read.contents.find(item => item.uri === uri).text);
 const actual = catalog.series.find(series => series.id === 'smiski-museum');
 assert.ok(actual, 'The documented Museum example must exist.');

 async function call(name, args) {
  const result = await client.callTool({name, arguments:args}, undefined, timeout);
  assert.equal(result.isError, false, JSON.stringify(result));
  assert.ok(result.structuredContent, 'Direct structured results are required.');
  return result.structuredContent;
 }
 const search = await call('search_collection_series', {query:'museum', brand:'smiski'});
 const found = search.series.find(series => series.seriesId === actual.id);
 assert.ok(found, 'Search must return the exact series, not only a webpage link.');
 assert.deepEqual(found.styles, actual.names);
 assert.equal(found.source, actual.source);
 assert.equal(found.checked, actual.checked);
 const owned = ['Smiski Dali', 'Smiski Pearl Earring'];
 assert.ok(owned.every(name => actual.names.includes(name)), 'Update the explicit example if catalog names change.');
 const prepared = await call('prepare_collection_checklist', {seriesId:found.seriesId, owned, wanted:[]});
 assert.deepEqual(prepared.owned, actual.names.filter(name => owned.includes(name)));
 assert.deepEqual(prepared.notMarkedOwned, actual.names.filter(name => !owned.includes(name)));
 assert.deepEqual(prepared.wanted, []);
 assert.deepEqual(prepared.unmatchedOwned, []);
 assert.deepEqual(prepared.unmatchedWanted, []);
 assert.equal(prepared.source, actual.source);
 assert.equal(prepared.checked, actual.checked);
 assert.equal(prepared.catalogScope, catalog.scope);
 assert.equal(prepared.comparisonScope, 'published_catalog_names_only');
 assert.ok(prepared.markdown.includes(actual.source) && prepared.markdown.includes(actual.checked));
 assert.ok(prepared.markdown.includes('Smiski Dali'));
 const unknown = 'TDS QA unknown named figure';
 const unknownWanted = 'TDS QA unknown wanted figure';
 const unresolved = await call('prepare_collection_checklist', {seriesId:found.seriesId, owned:[unknown], wanted:[unknownWanted]});
 assert.deepEqual(unresolved.unmatchedOwned, [unknown]);
 assert.deepEqual(unresolved.unmatchedWanted, [unknownWanted]);
 assert.deepEqual(unresolved.owned, []);
 assert.deepEqual(unresolved.wanted, []);
 assert.ok(unresolved.markdown.includes(unknown), 'Unknown input must remain visible.');
 assert.ok(unresolved.markdown.includes(unknownWanted), 'Unknown wanted input must remain visible.');
 const eventArgs={kind:'event',eventName:'TDS QA fictional meetup',eventDate:'2099-01-01',exchangeMode:'store',note:'QA example only, not a real event.',language:'en'};
 const event=await call('prepare_swap_event_card',eventArgs);
 assert.equal(event.kind,'event');assert.equal(event.event.unverified,true);assert.deepEqual(event.offered,[]);
 assert.ok(event.shareUrl.startsWith('https://thedollscout.com/collecting/event-kit#event='));
 const eventPayload=decodeEventPayload(new URL(event.shareUrl).hash);
 assert.equal(eventPayload.kind,'event');
 const card=await call('prepare_swap_event_card',{...eventArgs,kind:'card',wanted:['Smiski Bacchus'],offered:['Smiski Dali']});
 assert.equal(card.event.exchangeMode,'store');assert.equal(card.unmatchedWanted.length,0);assert.equal(card.unmatchedOffered.length,0);
 assert.ok(card.sources.some(source=>source.seriesId===actual.id&&source.source===actual.source));
 const recipientDraft=makeParticipantPayload(decodeEventPayload(new URL(card.shareUrl).hash));
 assert.deepEqual(recipientDraft.wanted,[]);assert.deepEqual(recipientDraft.offered,[]);assert.equal(recipientDraft.eventName,eventArgs.eventName);
 const sdk = JSON.parse(await readFile(path.join(site,'mcp/node_modules/@modelcontextprotocol/sdk/package.json'),'utf8'));
 verification = {
  verification:'official_sdk_http_client_passed', target:local?'local_http_adapter':'production',
  sdk:{name:sdk.name,version:sdk.version}, server:client.getServerVersion(), protocol:transport.protocolVersion,
  steps:['initialize','listTools','listResources','readResource','search_collection_series','prepare_collection_checklist','preserve_unmatched_input','prepare_swap_event_card','decode_shared_card','clear_recipient_lists','close'],
  example:{seriesId:found.seriesId,ownedStyles:prepared.owned.length,notMarkedOwnedStyles:prepared.notMarkedOwned.length,explicitWantedStyles:prepared.wanted.length},
  qaExcluded:true, adoption:'not_measured', noLocalCollectionAccess:true
 };
} finally {
 try { await client.close(); }
 finally { if (server) { server.closeAllConnections(); await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())); } }
}
console.log(JSON.stringify(verification));
