// Default mode only inventories official upgrades. Local mode requires an operator-owned,
// isolated Linux runner with a reviewed native binary and its dedicated signed-in CLI profile.
import {execFile} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {lstat, mkdtemp, open, readFile, readdir, realpath, rename, rm, stat, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {isAbsolute, join, relative, resolve, sep} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {cases, evaluateCase, suiteVersion} from '../../futures-assets/release-checks/suite.mjs';

const assets = new URL('../../futures-assets/release-checks/', import.meta.url);
const root = fileURLToPath(new URL('../../../../', import.meta.url));
const sources = {
  codex: {provider: 'openai', repo: 'openai/codex', prefix: 'rust-v'},
  'claude-code': {provider: 'anthropic', repo: 'anthropics/claude-code', prefix: 'v'},
};

// Both runners get only fixed synthetic tasks, without model-selected tools or connectors.
const codexDisable = ['shell_tool', 'unified_exec', 'apps', 'plugins', 'hooks', 'multi_agent',
  'view_image', 'image_generation', 'browser_use', 'computer_use', 'code_mode', 'tool_suggest',
  'workspace_dependencies'];
const codexArgs = ['exec', '--ignore-user-config', '--ignore-rules', '--strict-config',
  '--ephemeral', '--skip-git-repo-check', '--sandbox', 'read-only', '--json',
  '-c', 'approval_policy="never"', '-c', 'web_search="disabled"', '-c', 'mcp_servers={}',
  ...codexDisable.flatMap(feature => ['--disable', feature]), '-'];
const claudeArgs = ['--print', '--output-format', 'json', '--tools', '', '--strict-mcp-config',
  '--mcp-config', '{"mcpServers":{}}', '--disable-slash-commands', '--no-session-persistence',
  '--permission-mode', 'dontAsk', '--max-turns', '1', '--setting-sources', '',
  '--settings', '{"disableAllHooks":true}'];

export function stableVersion(client, stdout) {
  const pattern = client === 'codex' ? /^codex-cli (\d+\.\d+\.\d+)$/ : /^(\d+\.\d+\.\d+) \(Claude Code\)$/;
  return pattern.exec(stdout.trim())?.[1] ?? null;
}

export function officialRelease(snapshot, client, version) {
  const s = sources[client];
  if (!s || !version) return null;
  const source = snapshot.sources.find(row => row.id === client && row.repo === s.repo);
  const tag = s.prefix + version;
  return source?.releases.find(row => row.version === version && row.tag === tag &&
    row.url === 'https://github.com/' + s.repo + '/releases/tag/' + tag &&
    row.checks?.officialSource === true && row.checks.stableRelease === true &&
    row.checks.publicationTime === true) ?? null;
}

// Match only a complete, independently spelled-out product name in the publisher headline.
// A shorthand shared version/edition, a marketing alias or a dated ID requires separate evidence.
export function announcementTarget(snapshot, client, url, model) {
  const codex = client === 'codex';
  if ((!codex && client !== 'claude-code') || typeof model !== 'string' || model.length > 75) return null;
  const vendor = codex ? 'OpenAI' : 'Anthropic';
  const official = codex ? /^https:\/\/openai\.com\/index\/[a-z0-9-]+$/ :
    /^https:\/\/anthropic\.com\/(?:news\/|claude-)[a-z0-9-]+$/;
  if (!official.test(url)) return null;
  const row = snapshot.models.find(item => item.vendor === vendor && item.url === url);
  if (!row) return null;
  const names = row.title.toLowerCase().replace(/^(introducing|announcing|unveiling|meet) /, '')
    .replace(/[.!]$/, '').replace(/ (?:is|are) now available$/, '').split(/,? and | & |, /);
  for (const name of names) {
    const match = codex ?
      /^gpt[- ](\d+(?:\.\d+)*o?)(?:[- ](astra|sol|terra|luna|mini|nano|pro|codex(?:-max)?|turbo))?$/.exec(name) :
      /^claude (opus|sonnet|haiku|fable|mythos) (\d+(?:\.\d+)*)$/.exec(name);
    if (!match) continue;
    const id = codex ? ['gpt', ...match.slice(1).filter(Boolean)].join('-') :
      'claude-' + match[1] + '-' + match[2].replaceAll('.', '-');
    if (model === id) return {trigger: {kind: 'model_announcement', id: row.url, label: row.title, url: row.url},
      requestedModel: model};
  }
  return null;
}

function readAnswer(client, output) {
  if (client === 'claude-code') {
    const row = JSON.parse(output);
    if (row.type !== 'result' || row.subtype !== 'success' || row.is_error !== false ||
        row.num_turns !== 1 || typeof row.result !== 'string') return null;
    const ids = Object.keys(row.modelUsage || {});
    const model = ids.length === 1 && /^claude-[a-z0-9-]{3,70}$/.test(ids[0]) ? ids[0] : null;
    return {text: row.result, model};
  }
  const rows = output.trim().split('\n').map(line => JSON.parse(line));
  if (rows[0]?.type !== 'thread.started' || rows.at(-1)?.type !== 'turn.completed') return null;
  if (rows.filter(row => row.type === 'turn.started').length !== 1 ||
      rows.filter(row => row.type === 'turn.completed').length !== 1) return null;
  const answers = [];
  for (const row of rows) {
    if (['thread.started', 'turn.started', 'turn.completed'].includes(row.type)) continue;
    if (!['item.started', 'item.completed'].includes(row.type) ||
        !['reasoning', 'agent_message'].includes(row.item?.type)) return null;
    if (row.type === 'item.completed' && row.item.type === 'agent_message') answers.push(row.item.text);
  }
  // This CLI's exec JSONL does not attest the effective model's identity.
  return answers.length === 1 && typeof answers[0] === 'string' ? {text: answers[0], model: null} : null;
}

export function gradeExecution(client, fixture, output) {
  try {
    const answer = readAnswer(client, output);
    if (answer) return {status: evaluateCase(fixture, answer.text) ? 'pass' : 'fail', model: answer.model};
  } catch { /* Unknown CLI output is not a failed model check. */ }
  return {status: 'unverified', model: null};
}

function inside(parent, child) {
  const path = relative(parent, child);
  return path === '' || (path !== '..' && !path.startsWith('..' + sep) && !isAbsolute(path));
}

async function verifyPrivateDir(path) {
  if (!path || !isAbsolute(path)) throw Error('private_directory_required');
  const target = await realpath(path);
  const info = await stat(target);
  if (inside(root, target) || !info.isDirectory() || info.uid !== process.getuid() || (info.mode & 0o077)) {
    throw Error('use_private_operator_directory_outside_checkout');
  }
  return target;
}

async function verifiedBinary(path, expected) {
  if (!path || !isAbsolute(path) || !/^[a-f0-9]{64}$/.test(expected ?? '')) throw Error('pinned_native_binary_required');
  const info = await lstat(path);
  if (!info.isFile() || !(info.mode & 0o111) || (info.mode & 0o022)) throw Error('untrusted_binary_mode');
  const file = await open(path, 'r');
  const header = Buffer.alloc(4);
  try { await file.read(header, 0, 4, 0); } finally { await file.close(); }
  if (!header.equals(Buffer.from([0x7f, 0x45, 0x4c, 0x46]))) throw Error('native_linux_binary_required');
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  if (hash.digest('hex') !== expected) throw Error('binary_digest_mismatch');
}

function execute(binary, args, options, prompt) {
  return new Promise((ok, fail) => {
    const child = execFile(binary, args, {cwd: options.cwd, env: options.env,
      encoding: 'utf8', timeout: prompt ? 90000 : 10000, maxBuffer: 1024 * 1024,
      killSignal: 'SIGKILL'}, (error, stdout) => error ? fail(Error('cli_unavailable')) : ok(stdout));
    child.stdin.on('error', () => {}); // A CLI that exits during startup is handled above.
    child.stdin.end(prompt ?? '');
  });
}

export async function runOnce({client, release, directory, invoke, target = null}) {
  const provider = sources[client].provider;
  const suffix = target ? '-' + createHash('sha256').update(target.trigger.url + '\n' + target.requestedModel).digest('hex') : '';
  const filename = join(directory, client + '-' + release.version + '-suite-' + suiteVersion + suffix + '.json');
  const row = {mode: 'installed_cli', provider, cliVersion: release.version, model: null,
    ...(target ? {requestedModel: target.requestedModel} : {}),
    trigger: target?.trigger ?? {kind: 'cli_release', id: String(release.id), label: release.tag, url: release.url},
    suiteVersion, checkedAt: new Date().toISOString(), status: 'incomplete',
    cases: cases.map(fixture => ({id: fixture.id, status: 'unverified'}))};
  // Reserve the receipt before inference. A crash or concurrent launch cannot spend twice.
  try { await writeFile(filename, JSON.stringify(row) + '\n', {flag: 'wx', mode: 0o600}); }
  catch (error) { if (error.code === 'EEXIST') return 'already_recorded'; throw error; }
  const models = new Set();
  for (let index = 0; index < cases.length; index++) {
    let result;
    try { result = gradeExecution(client, cases[index].id, await invoke(cases[index].prompt)); }
    catch { result = {status: 'unverified', model: null}; }
    const identityUnverified = target && result.model !== target.requestedModel;
    row.cases[index].status = identityUnverified ? 'unverified' : result.status;
    if (target) row.cases[index].reportedModel = result.model;
    if (identityUnverified) row.cases[index].cliOutcome = result.status;
    models.add(result.model);
    row.model = models.size === 1 ? result.model : null;
    if (row.cases.every(item => item.status !== 'unverified')) row.status = 'complete';
    await writeFile(filename + '.tmp', JSON.stringify(row, null, 2) + '\n', {mode: 0o600});
    await rename(filename + '.tmp', filename);
    if (row.cases[index].status === 'unverified') break;
  }
  return row.status;
}

async function local(client, snapshot, target = null) {
  if (!Object.hasOwn(sources, client) || process.platform !== 'linux' || process.env.AGI_LOCAL_RELEASE_CHECKS !== 'true') {
    throw Error('isolated_linux_runner_opt_in_required');
  }
  const binary = process.env.AGI_CHECK_BIN;
  await verifiedBinary(binary, process.env.AGI_CHECK_BIN_SHA256);
  const profile = await verifyPrivateDir(process.env.AGI_CHECK_PROFILE);
  // Do not run a real user's instruction files, plugins, hooks, MCP or managed settings.
  const forbidden = client === 'codex' ?
    new Set(['agents.md','agents.override.md','config.toml','skills','hooks.json','plugins','rules']) :
    new Set(['settings.json','settings.local.json','claude.md','commands','skills','hooks','agents','plugins','.mcp.json']);
  const entries = await readdir(profile);
  if (entries.some(name => forbidden.has(name.toLowerCase()))) throw Error('use_dedicated_clean_profile');
  const directory = await verifyPrivateDir(process.env.AGI_CHECK_RECEIPTS_DIR);
  if (inside(profile, directory) || inside(directory, profile)) throw Error('separate_private_directories_required');
  const cwd = await mkdtemp(join(tmpdir(), 'agi-release-check-'));
  try {
    const env = {HOME: cwd, PATH: '/usr/bin:/bin', LANG: 'C.UTF-8', DISABLE_AUTOUPDATER: '1',
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1', CLAUDE_CODE_DISABLE_AUTO_MEMORY: '1'};
    env[client === 'codex' ? 'CODEX_HOME' : 'CLAUDE_CONFIG_DIR'] = profile;
    const call = (args, prompt) => execute(binary, args, {cwd, env}, prompt);
    const version = stableVersion(client, await call(['--version']));
    const release = officialRelease(snapshot, client, version);
    if (!release) throw Error('installed_version_has_no_verified_stable_release');
    const flags = target ? ['--model', target.requestedModel] : [];
    const args = client === 'codex' ? [...codexArgs.slice(0, -1), ...flags, '-'] : [...claudeArgs, ...flags];
    const help = await call(client === 'codex' ? ['exec', '--help'] : ['--help']);
    if (args.some(arg => arg.startsWith('--') && !help.includes(arg))) throw Error('unsupported_isolation_controls');
    if (client === 'codex') {
      const featureList = await call(['features', 'list']);
      const names = new Set(featureList.split('\n').map(line => line.trim().split(/\s+/)[0]));
      if (!codexDisable.every(name => names.has(name))) throw Error('unsupported_isolation_controls');
    }
    const status = await runOnce({client, release, target, directory, invoke: prompt => call(args, prompt)});
    console.log(client, release.version, status);
  } finally { await rm(cwd, {recursive: true, force: true}); }
}

async function main() {
  if (process.argv.slice(2).join(' ') === '--help') {
    console.log(`node run-checks.mjs                     Inventory only. Makes zero model calls.
node run-checks.mjs --local codex        Check the installed official stable Codex CLI once.
node run-checks.mjs --local claude-code  Check the installed official stable Claude Code once.
node run-checks.mjs --local CLIENT --announcement URL --model MODEL  Check a separately announced model.

Local mode needs a dedicated, operator-approved, isolated Linux runner and existing CLI sign-in.
Set AGI_LOCAL_RELEASE_CHECKS=true, AGI_CHECK_BIN to an absolute native executable, and
AGI_CHECK_BIN_SHA256 to its independently verified SHA-256. Use AGI_CHECK_PROFILE for the
dedicated signed-in CLI profile without custom instructions, hooks, plugins, or MCP servers.
AGI_CHECK_RECEIPTS_DIR names a separate existing private directory for sanitized receipts.
Both directories must be outside this checkout, owned by the runner user and restricted to it.
Invoke after an installed CLI upgrade and snapshot refresh, or select the exact published URL and a
fully named model in its headline. Each distinct CLI version, suite, announcement and requested model
gets at most three fixed fixture invocations per private receipt directory. A partial or completed
receipt suppresses retries. Only reviewed, independently verified receipts belong in public runs.json.
Version and option failures exit before model use. Local inference uses the runner's existing entitlement.
Model-announcement dates alone cannot identify the model serving a CLI. Codex exec may omit model ID.`);
    return;
  }
  const [releases, models, published] = await Promise.all(['releases','models','runs'].map(async name =>
    JSON.parse(await readFile(new URL(name + '.json', assets), 'utf8'))));
  const args = process.argv.slice(2);
  if (args.length === 2 && args[0] === '--local') return local(args[1], releases);
  if (args.length === 6 && args[0] === '--local' && args[2] === '--announcement' && args[4] === '--model') {
    const target = announcementTarget(models, args[1], args[3], args[5]);
    if (!target) throw Error('model_not_explicitly_identified_by_recorded_publisher_announcement');
    return local(args[1], releases, target);
  }
  if (args.length !== 0) throw Error('usage_run_checks_or_local_client');
  console.log(JSON.stringify({mode:'inventory_only', releases: releases.sources.reduce((n, s) => n + s.releases.length, 0),
    announcements: models.models.length, publishedResults: published.runs.length, modelInvocations: 0}));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => {
    // Built-in filesystem errors may contain sensitive operator paths. Emit fixed codes only.
    console.error(/^[a-z_]+$/.test(error.message) ? error.message : 'release_check_unavailable');
    process.exitCode = 1;
  });
}
