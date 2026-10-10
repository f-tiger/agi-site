#!/usr/bin/env node
// Exercise the extracted, final archives using only Node built-ins, no MCP client install.
import assert from 'node:assert/strict';
import { readFile, mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline';
import { createHash } from 'node:crypto';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const output = resolve(args[args.indexOf('--output') + 1] || '/tmp/fleet-mcp-bundles');
const entries = JSON.parse(await readFile(join(output, 'build-index.json'), 'utf8'));
const configs = JSON.parse(await readFile(join(here, 'packages.json'), 'utf8'));
assert.equal(entries.length, configs.length);
function client(entryPoint, cwd) {
  const child = spawn(process.execPath, ['--import', join(here, 'deny-network.mjs'), entryPoint], { cwd, stdio: ['pipe', 'pipe', 'pipe'], env: { PATH: process.env.PATH, NODE_ENV: 'test' } });
  let next = 1, stderr = '';
  const pending = new Map();
  child.stderr.on('data', data => { stderr += data.toString(); });
  const lines = createInterface({ input: child.stdout });
  lines.on('line', line => {
    try {
      const message = JSON.parse(line);
      const handler = pending.get(message.id);
      if (!handler) return;
      pending.delete(message.id);
      clearTimeout(handler.timer);
      message.error ? handler.reject(Error(JSON.stringify(message.error))) : handler.resolve(message.result);
    } catch (error) { for (const handler of pending.values()) handler.reject(error); }
  });
  child.on('exit', code => {
    for (const handler of pending.values()) { clearTimeout(handler.timer); handler.reject(Error(`MCP ${entryPoint} exited ${code} during ${handler.method}: ${stderr}`)); }
    pending.clear();
  });
  child.on('error', error => {
    for (const handler of pending.values()) { clearTimeout(handler.timer); handler.reject(error); }
    pending.clear();
  });
  return {
    request(method, params = {}) {
      const id = next++;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => { pending.delete(id); reject(Error(`Timeout ${method}: ${stderr}`)); }, 10000);
        pending.set(id, { resolve, reject, timer, method });
        child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
      });
    },
    notify(method) { child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method }) + '\n'); },
    close() { child.stdin.end(); child.kill(); lines.close(); }
  };
}
const results = [];
for (const config of configs) {
  const entry = entries.find(item => item.id === config.id);
  assert.ok(entry, `Missing ${config.id}`);
  const digest = createHash('sha256').update(await readFile(entry.artifact)).digest('hex');
  assert.equal(digest, entry.fileSha256, 'Archive must match registered checksum');
  const extracted = join(output, 'smoke-extracted', config.id);
  await rm(extracted, { recursive: true, force: true });
  await mkdir(extracted, { recursive: true });
  const unzip = spawnSync('python3', ['-m', 'zipfile', '-e', entry.artifact, extracted], { encoding: 'utf8' });
  assert.ifError(unzip.error);
  assert.equal(unzip.status, 0, unzip.stderr);
  const manifest = JSON.parse(await readFile(join(extracted, 'manifest.json'), 'utf8'));
  assert.equal(manifest.manifest_version, '0.3');
  assert.equal(manifest.server.type, 'node');
  assert.equal(manifest.server.entry_point, config.entryPoint);
  assert.deepEqual(manifest.server.mcp_config.args, [`${'${__dirname}'}/${config.entryPoint}`]);
  await readFile(join(extracted, 'package-lock.json'));
  const server = JSON.parse(await readFile(entry.serverFile, 'utf8'));
  assert.equal(server.packages[0].fileSha256, digest);
  const rpc = client(join(extracted, manifest.server.entry_point), extracted);
  try {
    const initialized = await rpc.request('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'fleet-local-package-verification', version: '1.0.0' } });
    assert.equal(initialized.serverInfo.version, config.version);
    assert.ok(initialized.capabilities.tools);
    rpc.notify('notifications/initialized');
    const listed = await rpc.request('tools/list');
    assert.deepEqual(listed.tools.map(tool => tool.name).sort(), [...config.tools].sort());
    const example = await rpc.request('tools/call', config.smokeTool);
    assert.notEqual(example.isError, true);
    assert.ok(example.content.length);
    if (config.id === 'filinglens') {
      assert.equal(example.structuredContent.fictional, true);
      const compared = await rpc.request('tools/call', { name: 'filinglens_compare', arguments: { data: example.structuredContent.data, options: example.structuredContent.options } });
      assert.equal(compared.structuredContent.absolute_change, '-2000000');
    } else if (config.id === 'tradecheck') {
      const compared = await rpc.request('tools/call', { name: 'tradecheck_reconcile', arguments: { data: example.structuredContent.data } });
      assert.equal(compared.structuredContent.report.summary.price_variance, '44.00');
    } else {
      assert.match(example.content[0].text, /7\.000 BTU/);
    }
    results.push({ id: config.id, tools: listed.tools.length, initialize: 'passed', example: 'passed', network: 'disabled', fileSha256: digest });
  } finally { rpc.close(); }
}
await writeFile(join(output, 'smoke-results.json'), JSON.stringify(results, null, 2) + '\n');
console.log(JSON.stringify(results, null, 2));
