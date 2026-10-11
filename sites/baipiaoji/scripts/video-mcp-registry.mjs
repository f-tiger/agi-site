#!/usr/bin/env node
// Registry metadata only. Publication/authentication stays in the OIDC workflow.
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, appendFileSync, mkdirSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {setDefaultResultOrder} from 'node:dns';

setDefaultResultOrder('ipv4first');
export const REGISTRY = 'https://registry.modelcontextprotocol.io/v0.1/servers/';
const OFFICIAL = 'io.modelcontextprotocol.registry/official';
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

export function validateManifest(manifest) {
  assert.equal(manifest.$schema, 'https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json');
  assert.equal(manifest.name, 'io.github.f-tiger/bpj-video-tools');
  assert.equal(manifest.title, 'BPJ Video Tools');
  assert(typeof manifest.description === 'string' && manifest.description.length > 0 && manifest.description.length <= 100, 'Description must contain 1–100 characters');
  assert.match(manifest.version, /^\d+\.\d+\.\d+$/, 'Use an explicit release version');
  assert.equal(manifest.websiteUrl, 'https://baipiaoji.com/manju/video-fit#mcp');
  assert.deepEqual(manifest.remotes, [{type: 'streamable-http', url: 'https://baipiaoji.com/api/video-mcp'}]);
  assert(!manifest.packages?.length, 'Video MCP has no downloadable package');
  return manifest;
}

export function registryUrls(manifest) {
  const base = REGISTRY + encodeURIComponent(manifest.name) + '/versions/';
  // include_deleted prevents a removed immutable version being mistaken for a free name.
  return {
    exact: base + encodeURIComponent(manifest.version) + '?include_deleted=true',
    latest: base + 'latest?include_deleted=true',
  };
}

export function verifyRecord(manifest, record, {exact = false, latest = false} = {}) {
  assert(record && typeof record === 'object', 'Registry record is absent');
  const actual = record.server;
  assert.equal(actual?.name, manifest.name, 'Registry namespace/name collision');
  assert.deepEqual(actual.remotes, manifest.remotes, 'Registry remote endpoint, transport or authentication collision');
  assert(!actual.packages?.length, 'Registry package collision');
  assert.equal(record._meta?.[OFFICIAL]?.status, 'active', 'Registry version is not active');
  if (exact) {
    for (const key of ['version', 'title', 'description', 'websiteUrl']) {
      assert.equal(actual[key], manifest[key], 'Immutable registry metadata mismatch: ' + key);
    }
    assert.deepEqual(actual.repository, manifest.repository, 'Immutable registry repository mismatch');
  }
  if (latest) assert.equal(record._meta?.[OFFICIAL]?.isLatest, true, 'Latest registry response is not marked latest');
}

export function registrationDecision(manifest, exact, latest) {
  if (exact) verifyRecord(manifest, exact, {exact: true});
  if (latest) verifyRecord(manifest, latest, {latest: true});
  if (exact) {
    assert(latest, 'Exact version exists but latest registry record is absent');
    if (latest.server.version === manifest.version) verifyRecord(manifest, latest, {exact: true});
    // The exact immutable version remains registered even when a newer version is latest.
    return {publish: false, action: 'verified_existing', latestVersion: latest.server.version, isLatest: latest.server.version === manifest.version};
  }
  assert(latest?.server.version !== manifest.version, 'Latest version exists but exact registry record is absent');
  return {publish: true, action: 'registration_required', latestVersion: latest?.server.version || null, isLatest: false};
}

export async function requestRegistry(url, {fetchImpl = fetch, wait = delay} = {}) {
  let failure;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetchImpl(url, {
        headers: {'Accept': 'application/json', 'User-Agent': 'bpj-video-mcp-registry/1.0 (metadata-only)'},
        signal: AbortSignal.timeout(20000),
      });
      if (response.status === 404) return null;
      if (!response.ok) {
        const error = new Error('Registry HTTP ' + response.status);
        error.retryable = response.status === 429 || response.status >= 500;
        throw error;
      }
      return await response.json();
    } catch (error) {
      failure = error;
      if (error.retryable === false || attempt === 2) throw error;
      await wait(2000 * (attempt + 1));
    }
  }
  throw failure;
}

export async function inspectRegistry(manifest, options) {
  const urls = registryUrls(manifest);
  const [exact, latest] = await Promise.all([requestRegistry(urls.exact, options), requestRegistry(urls.latest, options)]);
  return {urls, exact, latest, ...registrationDecision(manifest, exact, latest)};
}

async function main(args) {
  const mode = args[0];
  assert(['--check', '--verify'].includes(mode), 'Use --check or --verify, optionally --receipt PATH');
  assert(args.length === 1 || (args.length === 3 && args[1] === '--receipt' && args[2]), 'Unknown registry arguments');
  const manifest = validateManifest(JSON.parse(readFileSync(new URL('../video-mcp/server.json', import.meta.url), 'utf8')));
  const receiptPath = args[2] || resolve(process.env.RUNNER_TEMP || '/tmp', 'bpj-video-mcp-registry-receipt.json');
  const receipt = {checkedAt: new Date().toISOString(), mode: mode.slice(2), name: manifest.name, version: manifest.version, urls: registryUrls(manifest), ok: false};
  try {
    // Verification permits bounded propagation lag, while collisions always fail immediately.
    for (let attempt = 0; attempt < (mode === '--verify' ? 6 : 1); attempt++) {
      Object.assign(receipt, await inspectRegistry(manifest));
      if (!receipt.publish || mode === '--check') break;
      if (attempt < 5) await delay(10000);
    }
    if (mode === '--verify') assert(!receipt.publish, 'Published exact version is not visible in the official registry');
    receipt.ok = true;
    if (mode === '--check' && process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, 'publish=' + receipt.publish + '\n');
    console.log(JSON.stringify({name: manifest.name, version: manifest.version, action: receipt.action, latestVersion: receipt.latestVersion, isLatest: receipt.isLatest, receipt: receiptPath}));
  } catch (error) {
    receipt.error = error.message;
    throw error;
  } finally {
    mkdirSync(dirname(receiptPath), {recursive: true});
    writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + '\n');
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
}
