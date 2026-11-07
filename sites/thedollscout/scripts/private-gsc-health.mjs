/* Keep the legacy GSC reader's detailed output out of the public repository
   and Actions logs. This reports availability only, never traffic or revenue.
   The legacy reader is read-only and runs once in a disposable private cwd. */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { chmod, lstat, mkdtemp, readFile, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const execFileAsync = promisify(execFile);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../../..');
const LEGACY = path.join(HERE, 'gsc-report.mjs');
const SITE = 'sc-domain:thedollscout.com';
const SOURCE = 'Google Search Console API (searchAnalytics.query)';
const MAX_BYTES = 256 * 1024;
const HEALTH = new Set(['missing_credentials', 'invalid_scope', 'healthy', 'empty_data', 'unavailable']);
const inside = (root, target) => {
  const relative = path.relative(root, target);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
};
const count = (value) => Number.isSafeInteger(value) && value >= 0;
const date = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;

// Only fixed health codes leave this module; even unexpected errors are silent.
export function publicGscHealth(value) {
  return `TDS GSC: health=${HEALTH.has(value) ? value : 'unavailable'}`;
}

export function evaluateGscHealth(report) {
  if (!report || report.source !== SOURCE || report.site !== SITE ||
      !date(report.window?.startDate) || !date(report.window?.endDate) ||
      report.window.startDate > report.window.endDate ||
      !count(report.totals?.impressions) || !count(report.totals?.clicks) ||
      !['byDate', 'byQuery', 'byPage', 'byCountry'].every((key) => Array.isArray(report[key]))) return 'unavailable';
  const sections = [report.byDate, report.byQuery, report.byPage, report.byCountry];
  if (sections.some((rows) => rows.length > 100 || rows.some((row) =>
    !row || !count(row.impressions) || !count(row.clicks)))) return 'unavailable';
  if (report.byDate.some((row) => !date(row.date) || row.date < report.window.startDate || row.date > report.window.endDate) ||
      new Set(report.byDate.map((row) => row.date)).size !== report.byDate.length) return 'unavailable';
  const sums = report.byDate.reduce((total, row) => ({
    clicks: total.clicks + row.clicks, impressions: total.impressions + row.impressions,
  }), { clicks: 0, impressions: 0 });
  if (!count(sums.clicks) || !count(sums.impressions) || sums.clicks !== report.totals.clicks ||
      sums.impressions !== report.totals.impressions) return 'unavailable';
  if (!report.byDate.length) return sections.every((rows) => rows.length === 0) ? 'empty_data' : 'unavailable';
  return 'healthy';
}

async function runLegacy({ cwd, env }) {
  // Set the child umask before the unchanged reader creates any directories or
  // files. Do not inherit NODE_OPTIONS, proxies or unrelated repository secrets.
  await execFileAsync(process.execPath, [
    '--input-type=module', '--eval', 'process.umask(0o077); await import(process.argv[1]);',
    pathToFileURL(LEGACY).href,
  ], { cwd, env, timeout: 45_000, maxBuffer: MAX_BYTES, killSignal: 'SIGKILL', windowsHide: true });
}

export async function readGscHealth({ env = process.env, runner = runLegacy, temporaryRoot = tmpdir() } = {}) {
  if (!env.GA4_SERVICE_ACCOUNT_JSON) return 'missing_credentials';
  if (env.GSC_SITE && env.GSC_SITE !== SITE) return 'invalid_scope';
  let temporary;
  try {
    // An externally supplied TMPDIR must not move private reports into Git.
    const base = await realpath(temporaryRoot);
    const repository = await realpath(REPO);
    if (inside(repository, base)) return 'unavailable';
    temporary = await mkdtemp(path.join(base, 'tds-private-gsc-'));
    await chmod(temporary, 0o700);
    await runner({ cwd: temporary, env: {
      GA4_SERVICE_ACCOUNT_JSON: env.GA4_SERVICE_ACCOUNT_JSON,
      GSC_SITE: SITE,
    } });
    const directory = path.join(temporary, 'content');
    const output = path.join(directory, 'gsc.json');
    const directoryStat = await lstat(directory);
    const outputStat = await lstat(output);
    if (!directoryStat.isDirectory() || directoryStat.isSymbolicLink() ||
        !outputStat.isFile() || outputStat.isSymbolicLink() || outputStat.size > MAX_BYTES ||
        !inside(temporary, await realpath(output))) return 'unavailable';
    await chmod(output, 0o600);
    const raw = await readFile(output);
    if (raw.length > MAX_BYTES) return 'unavailable';
    return evaluateGscHealth(JSON.parse(raw.toString('utf8')));
  } catch {
    // Includes auth/API failure, timeout, output overflow, invalid JSON and IO.
    // Never forward the child error: it may contain queries or credentials.
    return 'unavailable';
  } finally {
    if (temporary) await rm(temporary, { recursive: true, force: true });
  }
}

export async function gscHealthCli(options = {}, write = (line) => console.log(line)) {
  let health = 'unavailable';
  try { health = await readGscHealth(options); } catch { /* Fixed output below. */ }
  write(publicGscHealth(health));
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  await gscHealthCli();
}
