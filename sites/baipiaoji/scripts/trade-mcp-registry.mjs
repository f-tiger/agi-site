#!/usr/bin/env node
import assert from 'node:assert/strict';
import {appendFileSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {setDefaultResultOrder} from 'node:dns';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const BASE = 'https://registry.modelcontextprotocol.io/v0.1/servers/';
const OFFICIAL = 'io.modelcontextprotocol.registry/official';
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const releaseVersion = /^\d+\.\d+\.\d+$/;

export function validateManifest(manifest) {
  assert.equal(manifest.$schema, 'https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json');
  assert.equal(manifest.name, 'io.github.f-tiger/bpj-trade-tools');
  assert.equal(manifest.title, 'BPJ Trade Tools');
  assert.equal(manifest.websiteUrl, 'https://baipiaoji.com/en/studio/trade-tools/mcp/');
  assert.match(manifest.version, releaseVersion);
  assert(typeof manifest.description === 'string' && manifest.description.length > 0 && manifest.description.length <= 100);
  assert.deepEqual(manifest.repository, {
    url: 'https://github.com/f-tiger/agi-site', source: 'github', subfolder: 'sites/baipiaoji/trade-mcp',
  });
  assert.deepEqual(manifest.remotes, [{
    type: 'streamable-http', url: 'https://baipiaoji.com/api/trade-mcp',
    headers: [{name: 'Authorization', description: 'Bearer followed by a scoped BPJ trade MCP key. Required for all tool calls.', isRequired: true, isSecret: true}],
  }]);
  assert(!manifest.packages?.length, 'A remote deployment must have no local package');
  return manifest;
}

export function registryUrls(manifest) {
  const versions = BASE + encodeURIComponent(manifest.name) + '/versions/';
  return { exact: versions + encodeURIComponent(manifest.version) + '?include_deleted=true', latest: versions + 'latest?include_deleted=true' };
}

function verifyRecord(manifest, record, exact) {
  assert.equal(record?.server?.name, manifest.name, 'Registry identity collision');
  assert.deepEqual(record.server.remotes, manifest.remotes, 'Registry remote endpoint or authorization metadata mismatch');
  assert(!record.server.packages?.length, 'Registry package mismatch');
  assert.equal(record._meta?.[OFFICIAL]?.status, 'active', 'Registry record is not active');
  if (exact) {
    for (const key of ['title', 'description', 'websiteUrl', 'version', 'repository']) {
      assert.deepEqual(record.server[key], manifest[key], `Registry metadata mismatch: ${key}`);
    }
  }
}

function compareVersions(a, b) {
  assert.match(a, releaseVersion);
  const left = a.split('.').map(Number), right = b.split('.').map(Number);
  return (left[0] - right[0]) || (left[1] - right[1]) || (left[2] - right[2]);
}

export function registrationDecision(manifest, exact, latest) {
  if (exact) verifyRecord(manifest, exact, true);
  if (latest) {
    verifyRecord(manifest, latest, latest.server.version === manifest.version);
    assert.equal(latest._meta[OFFICIAL].isLatest, true, 'Registry latest record is not marked latest');
  }
  if (exact) {
    assert(latest, 'Registry exact version exists but latest record is absent');
    return {publish: false, isLatest: latest.server.version === manifest.version};
  }
  assert(!latest || compareVersions(latest.server.version, manifest.version) < 0, 'Refusing to publish a stale or mismatched version');
  return {publish: true, isLatest: false};
}

async function requestRegistry(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {Accept: 'application/json'}, redirect: 'error', signal: AbortSignal.timeout(15000),
      });
      if (response.status === 404) return null;
      if (response.ok) return await response.json();
      throw Object.assign(Error('Registry HTTP ' + response.status), {retry: response.status === 429 || response.status >= 500});
    } catch (error) {
      if (attempt === 2 || error.retry === false) throw error;
      await delay(2000 * (attempt + 1));
    }
  }
}

async function run() {
  setDefaultResultOrder('ipv4first');
  const [mode, receiptPath] = process.argv.slice(2);
  assert(['--check', '--verify'].includes(mode) && receiptPath, 'Use --check or --verify followed by a receipt path');
  const manifest = validateManifest(JSON.parse(readFileSync(new URL('../trade-mcp/server.json', import.meta.url), 'utf8')));
  const urls = registryUrls(manifest);
  const receipt = {name: manifest.name, version: manifest.version, urls, checkedAt: new Date().toISOString(), ok: false};
  try {
    for (let attempt = 0; attempt < (mode === '--verify' ? 6 : 1); attempt++) {
      [receipt.exact, receipt.latest] = await Promise.all([requestRegistry(urls.exact), requestRegistry(urls.latest)]);
      Object.assign(receipt, registrationDecision(manifest, receipt.exact, receipt.latest));
      if (!receipt.publish || mode === '--check') break;
      if (attempt < 5) await delay(10000);
    }
    if (mode === '--verify') assert(!receipt.publish && receipt.isLatest, 'Expected version is not visible as the current active listing');
    receipt.ok = true;
    if (mode === '--check' && process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `publish=${receipt.publish}\n`);
    console.log(JSON.stringify({name: manifest.name, version: manifest.version, publish: receipt.publish, activeLatest: receipt.isLatest}));
  } catch (error) {
    receipt.error = error.message;
    throw error;
  } finally {
    mkdirSync(dirname(receiptPath), {recursive: true});
    writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + '\n');
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run().catch(error => { console.error(error.message); process.exitCode = 1; });
}
