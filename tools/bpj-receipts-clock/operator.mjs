import {createHmac} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {watchSecret} from '../../sites/baipiaoji/scripts/ad-runner-config.mjs';

const api = 'https://api.cloudflare.com/client/v4';
const workerName = 'bpj-receipts-clock';
const freePlanIds = new Set(['CF_FREE', 'TEAMS_FREE', 'WORKERS_FREE']);

class OperatorError extends Error {}

function apiToken(env) {
  if (!env.CLOUDFLARE_API_TOKEN) throw new OperatorError('Existing Cloudflare API credential is unavailable.');
  return env.CLOUDFLARE_API_TOKEN;
}

export function clockSecret(env) {
  return createHmac('sha256', apiToken(env))
    .update('f-tiger/agi-site:bpj-receipts-clock:control:v1')
    .digest('hex');
}

async function readJson(url, options, request, label) {
  let response;
  try {
    response = await request(url, {...options, redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(15000)});
  } catch {
    throw new OperatorError(`${label} could not be reached.`);
  }
  if (!response.ok) {
    const http = Number.isInteger(response.status) && response.status >= 100 && response.status <= 599 ? response.status : 0;
    const hint = label === 'Cloudflare billing inventory' && [401, 403].includes(http)
      ? ' The runner needs read access to the account subscriptions (Billing Read).'
      : '';
    throw new OperatorError(`${label} returned HTTP ${http}.${hint}`);
  }
  try {
    return await response.json();
  } catch {
    throw new OperatorError(`${label} returned an invalid response.`);
  }
}

async function cloudflareGet(env, path, request, label) {
  const record = await readJson(api + path,
    {headers: {Authorization: `Bearer ${apiToken(env)}`}}, request, label);
  if (record?.success !== true || record.result == null || (record.errors && (!Array.isArray(record.errors) || record.errors.length))) {
    throw new OperatorError(`${label} did not confirm its requested record.`);
  }
  return record;
}

function completeInventory(record) {
  const {result, result_info: page} = record;
  return Array.isArray(result) && !(page && (typeof page !== 'object' || Array.isArray(page)
    || (page.page != null && page.page !== 1) || (page.count != null && page.count !== result.length)
    || (page.total_count != null && page.total_count !== result.length)
    || (page.total_count == null && Number.isInteger(page.per_page) && result.length >= page.per_page)
    || page.next_cursor || page.cursor));
}

export function confirmFreeBilling(record) {
  if (!completeInventory(record)) {
    throw new OperatorError('Cloudflare billing inventory is incomplete. Free eligibility could not be verified.');
  }
  // Workers Free is the default. A complete list must have no chargeable or
  // unclassified account subscription. A zone's Free plan alone is insufficient.
  for (const subscription of record.result) {
    const plan = subscription?.rate_plan;
    if (!freePlanIds.has(plan?.id) || subscription.price !== 0 || plan.is_contract === true || plan.externally_managed === true) {
      throw new OperatorError('Cloudflare billing inventory contains a paid or unclassified subscription. Deployment requires verified Workers Free eligibility.');
    }
  }
}

async function resolveAccount(env, request) {
  let accountId = env.CLOUDFLARE_ACCOUNT_ID;
  if (!accountId) {
    const accounts = await cloudflareGet(env, '/accounts', request, 'Cloudflare accounts inventory');
    if (!completeInventory(accounts) || accounts.result.length !== 1) {
      throw new OperatorError('Set the existing BPJ Cloudflare account ID because the account could not be uniquely resolved.');
    }
    accountId = accounts.result[0]?.id;
  }
  if (!/^[a-f0-9]{32}$/.test(accountId || '')) throw new OperatorError('The Cloudflare account ID is invalid.');
  return accountId;
}

async function workerOrigin(env, accountId, request) {
  const path = `/accounts/${accountId}`;
  const {result: project} = await cloudflareGet(env, `${path}/pages/projects/aiyangmao`, request, 'BPJ Cloudflare Pages project');
  if (project.name !== 'aiyangmao' || !Array.isArray(project.domains) || !project.domains.includes('baipiaoji.com')) {
    throw new OperatorError('Cloudflare account does not own the verified BPJ Pages project.');
  }
  const {result} = await cloudflareGet(env, `${path}/workers/subdomain`, request, 'Cloudflare Workers subdomain');
  if (typeof result.subdomain !== 'string' || !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(result.subdomain)) {
    throw new OperatorError('The existing account does not expose a verified workers.dev subdomain.');
  }
  return `https://${workerName}.${result.subdomain}.workers.dev`;
}

export async function preflight(env, request = fetch) {
  const accountId = await resolveAccount(env, request);
  const billing = await cloudflareGet(env, `/accounts/${accountId}/subscriptions`, request, 'Cloudflare billing inventory');
  confirmFreeBilling(billing);
  return {workersFree: true, accountId, origin: await workerOrigin(env, accountId, request)};
}

export async function control(env, origin, action, request = fetch) {
  if (!['status', 'start', 'pause'].includes(action) || !/^https:\/\/bpj-receipts-clock\.[a-z0-9-]+\.workers\.dev$/.test(origin)) {
    throw new OperatorError('Scheduler control endpoint is outside the expected Workers host.');
  }
  const record = await readJson(`${origin}/${action}`, {
    method: action === 'status' ? 'GET' : 'POST',
    headers: {Authorization: `Bearer ${clockSecret(env)}`},
  }, request, 'BPJ scheduler control');
  const counter = value => Number.isSafeInteger(value) && value >= 0;
  const optionalTime = value => value === null || (Number.isSafeInteger(value) && value > 0);
  if (record?.ok !== true || typeof record.enabled !== 'boolean' || !counter(record.runs)
    || !counter(record.succeeded) || record.succeeded > record.runs || !optionalTime(record.scheduledAt)
    || !optionalTime(record.lastRunAt) || !optionalTime(record.lastSuccessAt)
    || (record.lastError !== null && typeof record.lastError !== 'string')) {
    throw new OperatorError('BPJ scheduler did not confirm its status contract.');
  }
  return {
    enabled: record.enabled,
    scheduledAt: record.scheduledAt,
    runs: record.runs,
    succeeded: record.succeeded,
    lastRunAt: record.lastRunAt,
    lastSuccessAt: record.lastSuccessAt,
    hasError: record.lastError !== null,
  };
}

export async function startAndObserve(env, origin, request = fetch, wait = ms => new Promise(resolve => setTimeout(resolve, ms))) {
  const baseline = await control(env, origin, 'status', request);
  if (baseline.enabled) {
    if (!baseline.scheduledAt || !baseline.lastSuccessAt || baseline.hasError || Date.now() - baseline.lastSuccessAt >= 14400000) {
      throw new OperatorError('The existing scheduler is enabled but its successful check is stale or unconfirmed.');
    }
    return {...baseline, newChecksObserved: 0};
  }

  try {
    const started = await control(env, origin, 'start', request);
    if (!started.enabled || !started.scheduledAt) throw new OperatorError('The scheduler did not arm the first alarm.');
    for (let attempt = 0; attempt < 35; attempt++) {
      await wait(5000);
      const current = await control(env, origin, 'status', request);
      if (!current.enabled) throw new OperatorError('The scheduler was paused during startup verification.');
      if (current.succeeded >= baseline.succeeded + 2 && current.lastSuccessAt && current.scheduledAt && !current.hasError) {
        return {...current, newChecksObserved: current.succeeded - baseline.succeeded};
      }
    }
  } catch {
    // Even a lost response to start may have armed the new scheduler.
  }
  let stopped = false;
  try {
    const paused = await control(env, origin, 'pause', request);
    stopped = !paused.enabled && paused.scheduledAt === null;
  } catch {
    // The workflow reports the absence of a confirmed pause below.
  }
  throw new OperatorError(stopped
    ? 'Two successful automatic receipt checks were not verified. The newly started scheduler was paused and no alarm remains.'
    : 'Two successful automatic receipt checks were not verified, and the newly started scheduler pause could not be confirmed.');
}

async function main(args, env = process.env) {
  const [mode] = args;
  if (mode === 'preflight' || mode === 'prepare') {
    const {accountId} = await preflight(env);
    if (mode === 'prepare') {
      if (!env.RUNNER_TEMP) throw new OperatorError('The GitHub runner temporary directory is required.');
      let receiptKey;
      try { receiptKey = watchSecret(env); } catch { throw new OperatorError('The existing BPJ receipt credential is unavailable.'); }
      await writeFile(join(env.RUNNER_TEMP, `${workerName}-secrets.json`), JSON.stringify({
        BPJ_WATCH_SECRET: receiptKey,
        BPJ_CLOCK_SECRET: clockSecret(env),
      }), {encoding: 'utf8', flag: 'wx', mode: 0o600});
      await writeFile(join(env.RUNNER_TEMP, `${workerName}-account-id`), accountId,
        {encoding: 'utf8', flag: 'wx', mode: 0o600});
    }
    console.log('Verified BPJ account identity, Workers Free eligibility and the existing workers.dev subdomain.');
    return;
  }
  if (!['start', 'status', 'pause'].includes(mode)) throw new OperatorError('Use preflight, prepare, start, status or pause.');
  const origin = mode === 'start' ? (await preflight(env)).origin : await workerOrigin(env, await resolveAccount(env, fetch), fetch);
  const status = mode === 'start' ? await startAndObserve(env, origin) : await control(env, origin, mode);
  if (mode === 'pause' && (status.enabled || status.scheduledAt !== null)) throw new OperatorError('The scheduler did not confirm its pause.');
  console.log(JSON.stringify({mode, ...status}));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch(error => {
    console.error(error instanceof OperatorError ? error.message : 'The BPJ scheduler operation failed. No provider response or credentials were logged.');
    process.exitCode = 1;
  });
}
