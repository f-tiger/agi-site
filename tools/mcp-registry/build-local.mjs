#!/usr/bin/env node
// Builds self-contained MCPB ZIPs. Publishing is deliberately a separate step.
import { readFile, writeFile, mkdir, cp, rm } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const args = process.argv.slice(2);
function option(name, fallback) {
  const index = args.indexOf(name);
  if (index < 0) return fallback;
  if (!args[index + 1] || args[index + 1].startsWith('--')) throw Error(`Missing ${name} value`);
  return args[index + 1];
}
const output = resolve(option('--output', '/tmp/fleet-mcp-bundles'));
const tag = option('--release-tag');
const repository = option('--repository', 'f-tiger/agi-site');
if (!tag || !/^[\w.-]+$/.test(tag)) throw Error('An immutable --release-tag with letters, numbers, dots, dashes or underscores is required.');
if (!/^[\w.-]+\/[\w.-]+$/.test(repository)) throw Error('Invalid --repository');
if (output === root || root.startsWith(output + '/') || output === '/') throw Error('Unsafe output directory');
const configs = JSON.parse(await readFile(join(here, 'local-packages/packages.json'), 'utf8'));
function command(bin, params, cwd, capture = false) {
  const result = spawnSync(bin, params, { cwd, encoding: 'utf8', stdio: capture ? 'pipe' : 'inherit', env: { ...process.env, npm_config_cache: join(output, 'npm-cache'), npm_config_audit: 'false', npm_config_fund: 'false', npm_config_update_notifier: 'false' } });
  if (result.error || result.status !== 0) throw Error(`${bin} ${params[0]} failed: ${result.error?.message || result.stderr || result.status}`);
  return result.stdout?.trim();
}
for (const folder of ['artifacts', 'servers', 'staging', 'sources']) await mkdir(join(output, folder), { recursive: true });
const results = [];
for (const config of configs) {
  if (config.description.length > 100) throw Error(`${config.id}: official Registry description must be at most 100 characters`);
  const stage = join(output, 'staging', config.id);
  await rm(stage, { recursive: true, force: true });
  await mkdir(stage, { recursive: true });
  let source;
  if (config.source.path) {
    const tree = command('git', ['rev-parse', `HEAD:${config.source.path}`], root, true);
    if (tree !== config.source.tree) throw Error(`${config.id}: committed source tree changed; review source pin and package version first`);
    source = join(output, 'sources', config.id);
    await rm(source, { recursive: true, force: true });
    await mkdir(source, { recursive: true });
    const archive = join(output, 'sources', `${config.id}.tar`);
    // Archive only Git-tracked content from the pinned subtree, never a dirty working tree.
    command('git', ['archive', '--format=tar', `--output=${archive}`, config.source.tree], root);
    command('tar', ['-xf', archive, '-C', source], root);
  } else {
    if (!/^[a-f0-9]{40}$/.test(config.source.revision)) throw Error('External source must be pinned by full commit SHA');
    source = join(output, 'sources', config.id);
    await rm(source, { recursive: true, force: true });
    await mkdir(source, { recursive: true });
    command('git', ['init', '--quiet'], source);
    command('git', ['-c', 'credential.helper=', 'fetch', '--quiet', '--depth=1', `https://github.com/${config.source.repository}.git`, config.source.revision], source);
    command('git', ['checkout', '--quiet', '--detach', 'FETCH_HEAD'], source);
    if (command('git', ['rev-parse', 'HEAD'], source, true) !== config.source.revision) throw Error('External source revision mismatch');
  }
  for (const name of config.files) await cp(join(source, name), join(stage, name), { recursive: true });
  const pkg = JSON.parse(await readFile(join(stage, 'package.json'), 'utf8'));
  if (pkg.version !== config.version) throw Error(`${config.id}: package version changed; review registry version first`);
  if (config.build === 'typescript') {
    command('npm', ['ci', '--ignore-scripts', '--no-audit', '--no-fund'], stage);
    command(process.execPath, [join(stage, 'node_modules/typescript/bin/tsc')], stage);
    await rm(join(stage, 'node_modules'), { recursive: true, force: true });
  }
  if (Object.keys(pkg.dependencies || {}).length) {
    command('npm', ['ci', '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund'], stage);
    // No CLI dependency is used by these servers. Remove platform-dependent bin links.
    await rm(join(stage, 'node_modules/.bin'), { recursive: true, force: true });
    await rm(join(stage, 'node_modules/.package-lock.json'), { force: true });
  } else {
    // EcoBack is dependency-free and its pinned repository has no npm lockfile.
    if (Object.keys(pkg.devDependencies || {}).length) throw Error('Dependency-free source unexpectedly has devDependencies');
    await writeFile(join(stage, 'package-lock.json'), JSON.stringify({ name: pkg.name, version: pkg.version, lockfileVersion: 3, requires: true, packages: { '': { name: pkg.name, version: pkg.version, license: pkg.license, engines: pkg.engines, bin: pkg.bin } } }, null, 2) + '\n');
  }
  const sourceRepository = config.source.repository || repository;
  const sourceRevision = config.source.revision;
  const manifest = {
    manifest_version: '0.3', name: config.id, display_name: config.title, version: config.version,
    description: config.description, author: { name: 'f-tiger', url: 'https://github.com/f-tiger' },
    repository: { type: 'git', url: `https://github.com/${sourceRepository}` },
    homepage: config.websiteUrl,
    server: { type: 'node', entry_point: config.entryPoint, mcp_config: { command: 'node', args: [`${'${__dirname}'}/${config.entryPoint}`] } },
    tools: config.tools.map(name => ({ name })),
    compatibility: { runtimes: { node: config.node } }
  };
  await writeFile(join(stage, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  await writeFile(join(stage, 'SOURCE.json'), JSON.stringify({ repository: sourceRepository, revision: sourceRevision, ...(config.source.path ? { subfolder: config.source.path, tree: config.source.tree } : {}) }, null, 2) + '\n');
  const file = `${config.id}-${config.version}.mcpb`;
  const artifact = join(output, 'artifacts', file);
  command('python3', [join(here, 'local-packages/deterministic-zip.py'), stage, artifact], root);
  const fileSha256 = createHash('sha256').update(await readFile(artifact)).digest('hex');
  const identifier = `https://github.com/${repository}/releases/download/${tag}/${file}`;
  const serverFile = join(output, 'servers', `${config.id}.json`);
  const server = {
    $schema: 'https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json',
    name: config.name, title: config.title, description: config.description, version: config.version,
    repository: { url: `https://github.com/${sourceRepository}`, source: 'github', ...(config.source.path ? { subfolder: config.source.path } : {}) },
    websiteUrl: config.websiteUrl,
    packages: [{ registryType: 'mcpb', identifier, fileSha256, transport: { type: 'stdio' } }]
  };
  await writeFile(serverFile, JSON.stringify(server, null, 2) + '\n');
  results.push({ id: config.id, name: config.name, version: config.version, artifact, fileSha256, serverFile, identifier, toolNames: config.tools, sourceRevision });
}
await writeFile(join(output, 'build-index.json'), JSON.stringify(results, null, 2) + '\n');
await writeFile(join(output, 'artifacts/SHA256SUMS'), results.map(item => `${item.fileSha256}  ${item.id}-${item.version}.mcpb`).join('\n') + '\n');
console.log(JSON.stringify({ output, packages: results.map(({ id, fileSha256 }) => ({ id, fileSha256 })) }, null, 2));
