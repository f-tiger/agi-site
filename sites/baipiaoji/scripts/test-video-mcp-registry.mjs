import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateManifest, registryUrls, registrationDecision, requestRegistry, inspectRegistry} from './video-mcp-registry.mjs';

const manifest = JSON.parse(readFileSync(new URL('../video-mcp/server.json', import.meta.url), 'utf8'));
const receipt = (version = manifest.version, extra = {}) => ({
  server: {...structuredClone(manifest), version, ...extra},
  _meta: {'io.modelcontextprotocol.registry/official': {status: 'active', isLatest: true}},
});

test('manifest is scoped to the official video endpoint and uses exact v0.1 lookups', () => {
  validateManifest(manifest);
  const urls = registryUrls(manifest);
  assert.equal(urls.exact, 'https://registry.modelcontextprotocol.io/v0.1/servers/io.github.f-tiger%2Fbpj-video-tools/versions/1.0.0?include_deleted=true');
  assert.match(urls.latest, /\/versions\/latest\?include_deleted=true$/);
});

test('absent version requires publication; exact version already latest skips', () => {
  assert.equal(registrationDecision(manifest, null, null).publish, true);
  assert.deepEqual(registrationDecision(manifest, receipt(), receipt()), {publish: false, action: 'verified_existing', latestVersion: manifest.version, isLatest: true});
});

test('a newer latest never causes an existing immutable version to be republished', () => {
  const exact = receipt();
  exact._meta['io.modelcontextprotocol.registry/official'].isLatest = false;
  assert.deepEqual(registrationDecision(manifest, exact, receipt('2.0.0')), {publish: false, action: 'verified_existing', latestVersion: '2.0.0', isLatest: false});
});

test('endpoint, transport, authentication and immutable metadata collisions block publication', () => {
  for (const remotes of [
    [{type: 'streamable-http', url: 'https://example.com/mcp'}],
    [{type: 'sse', url: manifest.remotes[0].url}],
    [{...manifest.remotes[0], headers: [{name: 'Authorization', isRequired: true}]}],
  ]) {
    assert.throws(() => registrationDecision(manifest, receipt(manifest.version, {remotes}), receipt()), /collision/);
    assert.throws(() => registrationDecision(manifest, null, receipt('2.0.0', {remotes})), /collision/);
  }
  assert.throws(() => registrationDecision(manifest, receipt(manifest.version, {description: 'Different immutable description'}), receipt()), /metadata mismatch/);
});

test('removed versions, false latest and inconsistent exact/latest responses are not successes', () => {
  const deleted = receipt();
  deleted._meta['io.modelcontextprotocol.registry/official'].status = 'deleted';
  assert.throws(() => registrationDecision(manifest, deleted, receipt()), /not active/);
  const notLatest = receipt();
  notLatest._meta['io.modelcontextprotocol.registry/official'].isLatest = false;
  assert.throws(() => registrationDecision(manifest, receipt(), notLatest), /not marked latest/);
  assert.throws(() => registrationDecision(manifest, receipt(), null), /latest registry record is absent/);
  assert.throws(() => registrationDecision(manifest, null, receipt()), /exact registry record is absent/);
});

test('only 404 means absent; registry outages and access errors cannot authorize a duplicate publish', async () => {
  assert.equal(await requestRegistry('https://example.com', {fetchImpl: async () => new Response('', {status: 404})}), null);
  let calls = 0;
  await assert.rejects(requestRegistry('https://example.com', {fetchImpl: async () => { calls++; return new Response('', {status: 503}); }, wait: async () => {}}), /HTTP 503/);
  assert.equal(calls, 3);
  calls = 0;
  await assert.rejects(requestRegistry('https://example.com', {fetchImpl: async () => { calls++; return new Response('', {status: 403}); }, wait: async () => {}}), /HTTP 403/);
  assert.equal(calls, 1);
});

test('inspection fetches exact and latest separately before determining idempotency', async () => {
  const urls = [];
  const result = await inspectRegistry(manifest, {fetchImpl: async url => {
    urls.push(url);
    const data = receipt(url.includes('/latest?') ? '2.0.0' : manifest.version);
    if (!url.includes('/latest?')) data._meta['io.modelcontextprotocol.registry/official'].isLatest = false;
    return Response.json(data);
  }});
  assert.equal(urls.length, 2);
  assert.equal(result.publish, false);
  assert.equal(result.latestVersion, '2.0.0');
});
