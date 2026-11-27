import assert from 'node:assert/strict';
import test from 'node:test';
import manifest from '../trade-mcp/server.json' with {type: 'json'};
import {validateManifest, registryUrls, registrationDecision} from './trade-mcp-registry.mjs';

const official = 'io.modelcontextprotocol.registry/official';
function listing(version = manifest.version, overrides = {}) {
  return {server: {...structuredClone(manifest), version, ...overrides}, _meta: {[official]: {status: 'active', isLatest: true}}};
}

test('official redacted header configuration and immutable public coordinates', () => {
  validateManifest(manifest);
  assert(registryUrls(manifest).exact.endsWith('/io.github.f-tiger%2Fbpj-trade-tools/versions/1.0.0?include_deleted=true'));
  const unsafe = structuredClone(manifest);
  unsafe.remotes[0].headers[0].default = 'must-never-ship';
  assert.throws(() => validateManifest(unsafe));
});

test('initial publication, idempotence and stale release prevention', () => {
  assert.deepEqual(registrationDecision(manifest, null, null), {publish:true, isLatest:false});
  assert.deepEqual(registrationDecision(manifest, listing(), listing()), {publish:false, isLatest:true});
  assert.deepEqual(registrationDecision(manifest, null, listing('0.9.0')), {publish:true, isLatest:false});
  assert.throws(() => registrationDecision(manifest, null, listing('1.1.0')), /stale/);
});

test('different endpoint, missing secret requirement and inactive records cannot be accepted', () => {
  const headers = [{...manifest.remotes[0].headers[0], isSecret:false}];
  assert.throws(() => registrationDecision(manifest, null, listing('0.9.0', {remotes: [{...manifest.remotes[0], headers}]})), /authorization/);
  const inactive = listing();
  inactive._meta[official].status = 'deleted';
  assert.throws(() => registrationDecision(manifest, inactive, null), /active/);
  assert.throws(() => registrationDecision(manifest, listing(undefined, {websiteUrl: 'https://example.com/'}), null), /websiteUrl/);
});
