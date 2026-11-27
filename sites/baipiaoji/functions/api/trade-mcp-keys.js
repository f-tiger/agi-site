import {json, seconds} from '../../lib/ad-commerce.js';
import {consumeRate, getAccount} from '../../lib/free-account.js';
import {memberSite} from '../../lib/membership.js';
import {changeTradeMcpKey, listTradeMcpKeys, TRADE_MCP_KEY_LIMITS, TRADE_MCP_SCOPE} from '../../lib/trade-mcp-access.mjs';

const origin = 'https://baipiaoji.com';
const maxBytes = 1024;
const fail = (code, status) => json({ok: false, code}, status);
const uuidPattern = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/;
const commandStatus = {key_not_found: 404, account_changed: 409, key_limit: 409};

async function readCommand(request) {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('Content-Type') || '') ||
      Number(request.headers.get('Content-Length')) > maxBytes || !request.body) return null;
  const reader = request.body.getReader();
  const bytes = new Uint8Array(maxBytes);
  let length = 0;
  for (;;) {
    const {done, value} = await reader.read();
    if (done) break;
    if (length + value.byteLength > maxBytes) {
      await reader.cancel();
      return null;
    }
    bytes.set(value, length);
    length += value.byteLength;
  }
  try {
    const input = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes.subarray(0, length)));
    if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length !== 3 ||
        typeof input.account_id !== 'string' || !input.account_id || input.account_id.length > 100) return null;
    if (input.action === 'create') {
      const label = typeof input.label === 'string' ? input.label.trim() : '';
      return label && label.length <= 40 && !/[\u0000-\u001f\u007f]/.test(label) ? {...input, label} : null;
    }
    if ((input.action === 'rotate' || input.action === 'revoke') &&
        typeof input.id === 'string' && uuidPattern.test(input.id)) return input;
    return null;
  } catch {
    return null;
  }
}

export async function onRequest({request, env}) {
  const source = request.headers.get('Origin');
  if (new URL(request.url).origin !== origin || (source !== null && source !== origin) ||
      request.headers.get('Sec-Fetch-Site') === 'cross-site' ||
      (request.method === 'POST' && source !== origin)) return fail('origin_rejected', 403);
  if (request.headers.has('Authorization')) return fail('mixed_authentication', 400);
  if (request.method !== 'GET' && request.method !== 'POST') {
    const response = fail('method_not_allowed', 405);
    response.headers.set('Allow', 'GET, POST');
    return response;
  }
  try {
    if (!env.HITS || memberSite(env) !== 'bpj') return fail('temporarily_unavailable', 503);
    const account = await getAccount(request, env);
    if (!account) return fail('sign_in_required', 401);
    if (request.method === 'GET') return json(await listTradeMcpKeys(env.HITS, request, account, seconds()));

    const command = await readCommand(request);
    if (!command) return fail('invalid_input', 400);
    if (command.account_id !== account.id) return fail('account_changed', 409);
    if (!await consumeRate(env, 'trade-mcp-keys', account.id, 12, 60)) return fail('rate_limited', 429);
    const result = await changeTradeMcpKey(env.HITS, request, account, command, seconds());
    if (!result.ok) return fail(result.code, commandStatus[result.code]);
    return json({...result, scope: TRADE_MCP_SCOPE, limits: TRADE_MCP_KEY_LIMITS});
  } catch {
    return fail('temporarily_unavailable', 503);
  }
}
