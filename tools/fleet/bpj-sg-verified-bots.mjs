import {pathToFileURL} from 'node:url';

const ZONE = 'baipiaoji.com';
const PHASE = 'http_request_firewall_custom';
const RULE = Object.freeze({
  ref: 'bpj_sg_verified_bots',
  description: 'BPJ: block verified bots from Singapore',
  expression: '(ip.src.country eq "SG" and cf.client.bot)',
  action: 'block',
  enabled: true,
});

class ApiError extends Error {
  constructor(status, errors) {
    const codes = errors.map(error => Number(error.code)).filter(Number.isFinite);
    super(`Cloudflare HTTP ${status}, codes ${codes.join(',') || 'none'}`);
    this.status = status;
    this.permission = status === 401 || status === 403 || codes.includes(10000);
    this.noEntrypoint = status === 404 && errors.some(error =>
      /entry[ -]?point/i.test(error.message) && /not found|could not find|does not exist/i.test(error.message));
  }
}

export function apiClient(token, fetchFn = fetch) {
  return async (path, method = 'GET', body) => {
    const response = await fetchFn('https://api.cloudflare.com/client/v4' + path, {
      method, redirect: 'error', signal: AbortSignal.timeout(20000),
      headers: {Authorization: 'Bearer ' + token, 'Content-Type': 'application/json'},
      ...(body && {body: JSON.stringify(body)}),
    });
    if (method === 'DELETE' && response.status === 204) return;
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success !== true) throw new ApiError(response.status, data.errors || []);
    if (path.endsWith('/rulesets?per_page=50') && (data.result_info?.cursors?.after || data.result_info?.total_pages > 1)) {
      throw Error('Cannot establish whether the zone ruleset list is complete');
    }
    return data.result;
  };
}

export async function reconcile(mode, request) {
  if (!['apply', 'status', 'rollback'].includes(mode)) throw Error('Unsupported operation');
  const zones = await request('/zones?name=' + ZONE);
  const matches = zones.filter(zone => zone.name === ZONE && zone.status === 'active');
  if (matches.length !== 1) throw new ApiError(403, []);
  const root = '/zones/' + matches[0].id + '/rulesets';
  const entry = root + '/phases/' + PHASE + '/entrypoint';
  async function inspect() {
    let set;
    try {
      set = await request(entry);
    } catch (error) {
      if (error.noEntrypoint) return {state: 'absent'};
      if (error.status !== 404 || error.permission) throw error;
      // A generic 404 alone says nothing about whether this token can see the phase.
      const list = await request(root + '?per_page=50');
      if (!Array.isArray(list)) throw Error('Unexpected zone ruleset list');
      const entries = list.filter(item => item.phase === PHASE && item.kind === 'zone');
      if (entries.length > 1 || list.length >= 50) throw Error('Ambiguous or truncated zone ruleset list');
      if (!entries.length) return {state: 'absent'};
      if (!entries[0].id) throw Error('Unexpected zone ruleset identifier');
      set = await request(root + '/' + entries[0].id);
    }
    if (set.kind !== 'zone' || set.phase !== PHASE || !set.id || !Array.isArray(set.rules)) {
      throw Error('Unexpected zone ruleset response');
    }
    const owned = set.rules.filter(rule => rule.ref === RULE.ref);
    if (owned.length > 1) throw Error('Ambiguous managed rule');
    if (!owned.length) return {set, state: 'absent'};
    const rule = owned[0];
    if (!rule.id || rule.action !== RULE.action || rule.expression !== RULE.expression ||
        rule.description !== RULE.description || (rule.action_parameters && Object.keys(rule.action_parameters).length)) {
      throw Error('Managed rule definition changed externally; review before modifying it');
    }
    return {set, rule, state: rule.enabled !== false && set.rules[0].id === rule.id ? 'active-first' : 'inactive-or-out-of-order'};
  }

  const before = await inspect();
  if (mode === 'status' || (mode === 'rollback' && !before.rule) ||
      (mode === 'apply' && before.state === 'active-first')) return before.state;
  if (mode === 'rollback') {
    await request(root + '/' + before.set.id + '/rules/' + before.rule.id, 'DELETE');
  } else if (!before.set) {
    // POST only. A concurrent creator cannot have its rules overwritten by this operation.
    await request(root, 'POST', {name: 'Custom rules', kind: 'zone', phase: PHASE, rules: [RULE]});
  } else {
    const path = root + '/' + before.set.id + '/rules';
    const first = before.set.rules[0]?.id;
    const body = first && first !== before.rule?.id ? {...RULE, position: {before: first}} : RULE;
    if (before.rule) await request(path + '/' + before.rule.id, 'PATCH', body);
    else await request(path, 'POST', body);
  }
  const after = await inspect();
  const expected = mode === 'rollback' ? 'absent' : 'active-first';
  if (after.state !== expected) throw Error('Rule read-back mismatch: ' + after.state);
  return after.state;
}

async function main() {
  const mode = process.argv[2];
  const tokens = [...new Set(['BPJ_WAF_API_TOKEN', 'CLOUDFLARE_API_TOKEN_ZONE', 'CLOUDFLARE_API_TOKEN', 'CF_API_TOKEN']
    .map(key => process.env[key]).filter(Boolean))];
  if (!tokens.length) throw Error('No configured Cloudflare credential');
  for (const token of tokens) {
    try {
      const state = await reconcile(mode, apiClient(token));
      console.log('BPJ Singapore verified-bot rule: ' + state);
      return;
    } catch (error) {
      if (!error.permission) throw error;
      console.error(error.message);
    }
  }
  throw Error('No configured credential could complete this zone WAF operation; check Zone WAF permissions and entitlement');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
