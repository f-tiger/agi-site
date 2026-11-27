import {json, seconds} from '../../lib/ad-commerce.js';
import {getAccount, tokenFrom} from '../../lib/free-account.js';
import {memberPlan, memberReady, memberSite} from '../../lib/membership.js';
import {evaluateTool, getTool, matchesWorkbenchExample} from '../../lib/trade-workbench/engine.mjs';
import {recordWorkbenchRun, utcDay, workbenchAllowance, workbenchMember, workbenchUsage} from '../../lib/trade-workbench-access.mjs';
import {GUEST_DAILY_RUNS, guestTradeAllowance, guestTradeQuota, guestTradeUsage, recordGuestTradeRun} from '../../lib/trade-workbench-guests.mjs';
import {recordTradeQuoteWorkbenchUse} from '../../lib/trade-quote-workbench-use.mjs';
import {qualityEligible, trafficClass} from '../../lib/traffic-controls.mjs';

const origin = 'https://baipiaoji.com';
const maxBodyBytes = 4096;
const bodyFields = new Set(['id', 'input', 'format', 'lang']);
const fail = (code, status, extra = {}) => json({ok: false, code, ...extra}, status);

async function readBody(request) {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('Content-Type') || '') ||
      Number(request.headers.get('Content-Length')) > maxBodyBytes || !request.body) return null;
  const reader = request.body.getReader();
  const bytes = new Uint8Array(maxBodyBytes);
  let size = 0;
  for (;;) {
    const {done, value} = await reader.read();
    if (done) break;
    if (size + value.byteLength > bytes.byteLength) {
      await reader.cancel();
      return null;
    }
    bytes.set(value, size);
    size += value.byteLength;
  }
  try {
    const value = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes.subarray(0, size)));
    if (!value || typeof value !== 'object' || Array.isArray(value) ||
        Object.keys(value).some(key => !bodyFields.has(key)) ||
        typeof value.id !== 'string' || value.id.length > 100 ||
        !value.input || typeof value.input !== 'object' || Array.isArray(value.input) ||
        ![undefined, 'json', 'csv'].includes(value.format) ||
        ![undefined, 'zh', 'en'].includes(value.lang)) return null;
    return value;
  } catch {
    return null;
  }
}

function csvCell(value) {
  if (typeof value === 'number') return String(value);
  let text = String(value);
  // Quote multiline CSV and neutralize spreadsheet formulas, including leading controls.
  const normalized = text.normalize('NFKC');
  if (/^[\t\r\n]/.test(normalized) || /^[\s\u0000-\u001f\u007f\u200b\uFEFF]*[=+\-@]/u.test(normalized)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}

function createCsv(tool, rows, lang) {
  const i = lang === 'en' ? 1 : 0;
  const data = [i ? ['Field', 'Value'] : ['字段', '数值'],
    [i ? 'Tool' : '工具', i ? tool.en : tool.zh],
    [i ? 'Scope' : '适用范围', tool.scope[i]],
    [tool.source[i], tool.source[2]],
    ...rows.map(row => [row[i], Array.isArray(row[2]) ? row[2][i] : row[2]]),
  ];
  return '\ufeff' + data.map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

async function status(request, env) {
  const account = await getAccount(request, env);
  if (!account && tokenFrom(request)) return fail('sign_in_required',401);
  const now = seconds();
  const {price_units, days} = memberPlan(env);
  const checkout = {ready: !!account && await memberReady(env), price_units, days, chain: 'bsc', token: 'USDT'};
  if (!account) {
    const quota = guestTradeQuota(request,env.ADS_WATCH_SECRET,now);
    try {
      if (quota) return json({ok: true, ...guestTradeAllowance(await guestTradeUsage(env.HITS,quota)), checkout});
    } catch { /* unavailable guest quota is closed */ }
    return fail('temporarily_unavailable',503,{...guestTradeAllowance(GUEST_DAILY_RUNS),checkout});
  }

  const [activeMember, used] = await Promise.all([
    workbenchMember(env.HITS, account.id, now),
    workbenchUsage(env.HITS, account.id, utcDay(now)),
  ]);
  return json({ok: true, ...workbenchAllowance(activeMember, used), checkout});
}

function measureUse(request, toolId) {
  if (request.headers.get('X-BPJ-Trade-Use') !== '1' || request.headers.get('Sec-Fetch-Site') !== 'same-origin' ||
      trafficClass(request) !== 'unclassified' || !qualityEligible(request, '/api/trade-workbench', '')) return false;
  try {
    const referrer = new URL(request.headers.get('Referer') || '');
    const path = '/studio/trade-tools/' + toolId;
    return referrer.origin === origin && [path, '/en' + path].includes(referrer.pathname);
  } catch { return false; }
}

async function run(ctx) {
  const {request, env} = ctx;
  const account = await getAccount(request, env);
  if (!account && tokenFrom(request)) return fail('sign_in_required', 401);
  const body = await readBody(request);
  const tool = body && getTool(body.id);
  if (!tool) return fail('invalid_input', 400);

  const now = seconds();
  const activeMember = account && await workbenchMember(env.HITS, account.id, now);
  if (body.format === 'csv' && !activeMember) return fail('membership_required', 403);

  let rows;
  try {
    rows = evaluateTool(body.id, body.input);
  } catch (error) {
    if (error instanceof RangeError) return fail('invalid_input', 400);
    throw error;
  }
  const result = body.format === 'csv' ? {csv: createCsv(tool, rows, body.lang)} : {rows};

  if (!account) {
    const quota = guestTradeQuota(request,env.ADS_WATCH_SECRET,seconds());
    try {
      if (quota) {
        const usage = await recordGuestTradeRun(env.HITS,quota);
        if (!usage) return fail('rate_limited',429,guestTradeAllowance(GUEST_DAILY_RUNS));
        return json({ok: true, ...result, ...guestTradeAllowance(usage.runs)});
      }
    } catch { /* unavailable guest quota is closed */ }
    return fail('temporarily_unavailable',503,guestTradeAllowance(GUEST_DAILY_RUNS));
  }

  const acceptedAt = seconds();
  const usage = await recordWorkbenchRun(env.HITS, request, account, activeMember, acceptedAt);
  if (!usage) {
    const current = await getAccount(request, env);
    if (!current || current.id !== account.id || current.session_version !== account.session_version) return fail('sign_in_required', 401);
    if (activeMember && !await workbenchMember(env.HITS, account.id, seconds())) {
      return fail(body.format === 'csv' ? 'membership_required' : 'access_changed', body.format === 'csv' ? 403 : 409);
    }
    return fail('rate_limited', 429, {...workbenchAllowance(activeMember, 0), remaining: 0});
  }
  if (account.qa === 0 && body.format !== 'csv' && measureUse(request, tool.id)) {
    const measurement = Promise.resolve().then(() => {
      if (!matchesWorkbenchExample(tool, body.input)) return recordTradeQuoteWorkbenchUse(env.HITS, request, account.id, acceptedAt);
    }).catch(() => {});
    if (ctx.waitUntil) ctx.waitUntil(measurement);
    else await measurement;
  }
  return json({ok: true, ...result, ...workbenchAllowance(activeMember, usage.runs)});
}

export async function onRequest(ctx) {
  const {request, env} = ctx;
  const url = new URL(request.url);
  const source = request.headers.get('Origin');
  if (url.origin !== origin || (source && source !== origin) ||
      request.headers.get('Sec-Fetch-Site') === 'cross-site' ||
      (request.method === 'POST' && source !== origin)) return fail('origin_rejected', 403);
  if (request.headers.has('Authorization')) return fail('mixed_authentication', 400);
  if (!['GET', 'POST'].includes(request.method)) {
    const response = fail('method_not_allowed', 405);
    response.headers.set('Allow', 'GET, POST');
    return response;
  }
  try {
    if (!env.HITS || memberSite(env) !== 'bpj') return fail('temporarily_unavailable', 503);
    return await (request.method === 'GET' ? status(request, env) : run(ctx));
  } catch {
    return fail('temporarily_unavailable', 503);
  }
}
