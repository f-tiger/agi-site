// Narrow, reversible protection at the zone firewall, before billable Workers.
// Targets are fixed public host/path/UA combinations observed on 2026-10-31.
// They are NOT a complete traffic inventory and are never expanded at runtime.
export const RULE_REF = 'fleet_mcp_liveness_budget_v1';
export const MONITORS = Object.freeze([
  'mcpbeat/0.1 (+https://mcpbeat.com/bot/; liveness check)',
  'SentinelOracle/0.1 (+https://glimind.com/opt-out; liveness-only, never invokes tools)',
]);
const group = (userAgents, hosts, paths) => Object.freeze({
  userAgents: Object.freeze(userAgents), hosts: Object.freeze(hosts), paths: Object.freeze(paths),
});
export const TARGETS = Object.freeze({
  'agiscorecard.com': Object.freeze([
    group([MONITORS[0]], [
      'agiscorecard.com', 'calls.agiscorecard.com', 'compute.agiscorecard.com',
      'disclosures.agiscorecard.com', 'evidence.agiscorecard.com', 'incentives.agiscorecard.com',
      'mcppulse.agiscorecard.com', 'permit.agiscorecard.com', 'proof.agiscorecard.com',
      'protocol.agiscorecard.com', 'reconcile.agiscorecard.com', 'route.agiscorecard.com',
      'web3.agiscorecard.com',
    ], ['/mcp']),
    group([MONITORS[1]], ['agiscorecard.com', 'mcppulse.agiscorecard.com', 'web3.agiscorecard.com'], ['/mcp']),
    group([...MONITORS], ['source.agiscorecard.com'], ['/api/mcp']),
  ]),
  'baipiaoji.com': Object.freeze([
    group([MONITORS[0]], ['baipiaoji.com'], ['/api/mcp', '/api/ai-mcp', '/api/startup-mcp', '/api/video-mcp']),
    group([MONITORS[1]], ['baipiaoji.com'], ['/api/mcp']),
  ]),
  'getecoback.com': Object.freeze([
    group([...MONITORS], ['getecoback.com'], ['/mcp', '/mcp/', '/mcp/v1']),
  ]),
  'thedollscout.com': Object.freeze([
    group([MONITORS[0]], ['thedollscout.com'], ['/mcp']),
  ]),
});
export const ZONES = Object.freeze(Object.keys(TARGETS));
const PHASE = 'http_request_firewall_custom';
const MAX_RULES = 5; // Conservative free-plan allowance; never upgrade or replace owner rules.
const MAX_EXPRESSION_LENGTH = 4096;
const copy = value => structuredClone(value);
const canonical = value => JSON.stringify(value, function (_key, item) {
  return item && !Array.isArray(item) && typeof item === 'object'
    ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item;
});

export function matchesMonitorBudget({ method, path, userAgent, hostname }) {
  return ['GET', 'POST'].includes(method) && Object.values(TARGETS).some(groups => groups.some(target =>
    target.userAgents.includes(userAgent) && target.hosts.includes(hostname) && target.paths.includes(path)));
}
const set = (field, values) => values.length === 1
  ? `${field} eq ${JSON.stringify(values[0])}`
  : `${field} in {${values.map(value => JSON.stringify(value)).join(' ')}}`;
export function desiredRule(zone) {
  if (!Object.hasOwn(TARGETS, zone)) throw Error('Unsupported zone');
  const groups = TARGETS[zone].map(target => `(${set('http.host', target.hosts)} and ${set('http.request.uri.path', target.paths)} and ${set('http.user_agent', target.userAgents)})`);
  const expression = `(http.request.method in {"GET" "POST"} and (${groups.join(' or ')}))`;
  if (expression.length > MAX_EXPRESSION_LENGTH) throw Error('Expression exceeds 4096 characters; scope not broadened');
  return { ref: RULE_REF, description: 'Fleet request budget: exact named MCP liveness monitors', action: 'block', enabled: true, expression };
}
function validateRuleset(ruleset) {
  if (ruleset === null) return;
  if (!ruleset || !ruleset.id || !Array.isArray(ruleset.rules)) throw Error('Invalid ruleset response');
  if (ruleset.phase && ruleset.phase !== PHASE) throw Error('Unexpected ruleset phase');
  if (ruleset.kind && ruleset.kind !== 'zone') throw Error('Unexpected ruleset kind');
  if (ruleset.rules.some(rule => !rule.id)) throw Error('Missing rule ID; refuse unsafe change');
}
export function rulePlan(ruleset, mode = 'inspect', zone) {
  if (!['inspect', 'apply', 'disable'].includes(mode)) throw Error('Unsupported rule mode');
  validateRuleset(ruleset);
  const desired = desiredRule(zone), rules = ruleset?.rules || [];
  const matches = rules.map((rule, index) => ({ rule, index })).filter(({ rule }) => rule.ref === RULE_REF);
  if (matches.length > 1) return { operation: 'blocked', reason: 'Duplicate managed references; refuse ambiguous change' };
  const own = matches[0];
  const precedingSkips = rules.slice(0, own?.index ?? rules.length)
    .map((rule, index) => ({ ...copy(rule), order: index + 1 }))
    .filter(rule => rule.action === 'skip' && rule.enabled !== false);
  const context = { desired, ruleId: own?.rule.id, precedingSkips };
  // Revocation touches only enabled; leave the existing expression, ID and order intact.
  if (mode === 'disable') return own
    ? { ...context, operation: own.rule.enabled === false ? 'unchanged' : 'update', patch: { enabled: false } }
    : { ...context, operation: 'absent' };
  // Even an apparently unrelated skip may bypass later rules. Do not guess its semantics.
  if (precedingSkips.length) return { ...context, operation: 'blocked', reason: 'Preceding enabled skip rule; owner rule order retained, effectiveness requires review' };
  if (own) return { ...context, operation: ['expression', 'action', 'enabled'].every(key => own.rule[key] === desired[key]) ? 'unchanged' : 'update', patch: desired };
  if (rules.length >= MAX_RULES) return { ...context, operation: 'blocked', reason: 'No free custom-rule slot; existing rules retained, no plan upgrade' };
  return { ...context, operation: ruleset ? 'append' : 'create' };
}
function snapshot(ruleset) {
  return ruleset ? {
    id: ruleset.id, version: ruleset.version ?? null, phase: ruleset.phase ?? null,
    rules: ruleset.rules.map((rule, index) => ({ ...copy(rule), order: index + 1 })),
  } : null;
}
function unchangedOthers(before, after) {
  return canonical((before?.rules || []).filter(rule => rule.ref !== RULE_REF)) ===
    canonical((after?.rules || []).filter(rule => rule.ref !== RULE_REF));
}
function verifiedMutation(before, after, mode, zone, plan) {
  validateRuleset(after);
  if (!after) return 'Ruleset missing after write';
  if (before && before.id !== after.id) return 'Ruleset ID changed unexpectedly';
  const matches = after.rules.filter(rule => rule.ref === RULE_REF);
  if (matches.length !== 1) return 'Managed rule missing or duplicated after write';
  const own = matches[0];
  if (plan.ruleId && own.id !== plan.ruleId) return 'Managed rule ID changed unexpectedly';
  if (!unchangedOthers(before, after)) return 'Unrelated rule content or order changed; no automatic overwrite attempted';
  if (plan.operation === 'update' && before.rules.findIndex(rule => rule.id === own.id) !== after.rules.findIndex(rule => rule.id === own.id)) return 'Managed rule order changed unexpectedly';
  if (['append', 'create'].includes(plan.operation) && after.rules.at(-1).id !== own.id) return 'Managed rule not appended at the expected position';
  if (mode === 'disable') {
    const original = before.rules.find(rule => rule.id === own.id);
    if (canonical({ ...original, enabled: false, version: own.version, last_updated: own.last_updated }) !== canonical(own)) return 'Disable changed fields beyond enabled/version/timestamp';
    if (own.enabled !== false) return 'Managed rule remains enabled';
  } else if (!['expression', 'action', 'enabled'].every(key => own[key] === desiredRule(zone)[key])) return 'Managed rule does not match the requested scope';
  return null;
}

export async function monitorBudget({ candidates = [], mode = 'inspect', fetcher = fetch }) {
  if (!['inspect', 'apply', 'disable'].includes(mode)) throw Error('Unsupported rule mode');
  const credentials = candidates.filter(candidate => typeof candidate.token === 'string' && candidate.token);
  const safeMessage = error => {
    let message = String(error?.message || error);
    for (const { token } of credentials) message = message.split(token).join('[redacted]');
    return message.slice(0, 700);
  };
  async function api(path, credential, method = 'GET', body) {
    const response = await fetcher(`https://api.cloudflare.com/client/v4/${path}`, {
      method, headers: { authorization: `Bearer ${credential.token}`, 'content-type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(20000),
    });
    const data = await response.json();
    if (!response.ok || data.success !== true || !Object.hasOwn(data, 'result')) {
      const error = Error(`HTTP ${response.status}: ${(data.errors || []).map(item => item.message).join('; ') || 'Invalid API response'}`);
      error.status = response.status;
      throw error;
    }
    return data.result;
  }
  async function discoverZone(name) {
    let last;
    for (const credential of credentials) {
      try {
        const zones = await api(`zones?name=${encodeURIComponent(name)}`, credential);
        if (!Array.isArray(zones) || zones.length !== 1 || zones[0].name !== name || !zones[0].id) throw Error('Expected one exact zone');
        return zones[0];
      } catch (error) { last = error; }
    }
    throw last || Error('No configured credential');
  }
  async function readRuleset(zone, credential) {
    let ruleset;
    try {
      ruleset = await api(`zones/${encodeURIComponent(zone.id)}/rulesets/phases/${PHASE}/entrypoint`, credential);
    } catch (error) {
      if (error.status !== 404) throw error;
      // A 404 can conceal missing permissions: require a successful authorized list.
      const listed = await api(`zones/${encodeURIComponent(zone.id)}/rulesets`, credential);
      if (!Array.isArray(listed) || listed.some(item => item.phase === PHASE)) throw Error('Entrypoint unavailable but phase exists or listing is invalid; no create attempted');
      return null;
    }
    validateRuleset(ruleset);
    return ruleset;
  }
  const results = [];
  for (const name of ZONES) {
    const receipt = { zone: name, mode, applied: false };
    try {
      const zone = await discoverZone(name);
      let ruleset, authorized, last;
      for (const credential of credentials) {
        try { ruleset = await readRuleset(zone, credential); authorized = credential; break; }
        catch (error) { last = error; }
      }
      if (!authorized) throw Error(`No credential could read custom rules: ${safeMessage(last || 'missing credential')}`);
      const plan = rulePlan(ruleset, mode, name);
      Object.assign(receipt, {
        rulesetId: ruleset?.id ?? null, rulesetVersion: ruleset?.version ?? null,
        existingRuleCount: ruleset?.rules.length || 0, operation: plan.operation,
        ruleId: plan.ruleId ?? null, expression: plan.desired?.expression,
        before: snapshot(ruleset), precedingSkips: plan.precedingSkips || [],
        ...(plan.reason ? { blockedReason: plan.reason } : {}),
      });
      if (mode === 'inspect' || ['blocked', 'unchanged', 'absent'].includes(plan.operation)) {
        results.push(receipt); continue;
      }
      // Re-read catches intervening changes. Cloudflare offers no atomic compare-and-swap
      // for individual rule writes; never bulk-replace a ruleset to fake that guarantee.
      const fresh = await readRuleset(zone, authorized);
      if (canonical(ruleset) !== canonical(fresh)) {
        Object.assign(receipt, { operation: 'blocked', blockedReason: 'Ruleset changed since preview; no write attempted', latest: snapshot(fresh) });
        results.push(receipt); continue;
      }
      const base = `zones/${encodeURIComponent(zone.id)}/rulesets`;
      const path = plan.operation === 'create' ? base : plan.operation === 'append'
        ? `${base}/${encodeURIComponent(ruleset.id)}/rules`
        : `${base}/${encodeURIComponent(ruleset.id)}/rules/${encodeURIComponent(plan.ruleId)}`;
      const body = plan.operation === 'create'
        ? { name: 'Fleet custom firewall', kind: 'zone', phase: PHASE, rules: [plan.desired] }
        : plan.operation === 'update' ? plan.patch : plan.desired;
      receipt.writeAttempted = true;
      // One mutation with the read-authorized identity. Never retry a write, including
      // timeouts/invalid JSON where the server may already have changed the rule.
      try {
        await api(path, authorized, plan.operation === 'update' ? 'PATCH' : 'POST', body);
      } catch (error) {
        receipt.writeOutcome = [400, 401, 403, 404, 405, 409, 422, 429].includes(error.status) ? 'rejected' : 'unknown';
        if (receipt.writeOutcome === 'unknown') receipt.applied = null;
        throw error;
      }
      receipt.applied = true;
      receipt.writeOutcome = 'acknowledged';
      receipt.verified = false;
      const after = await readRuleset(zone, authorized);
      receipt.after = snapshot(after);
      const verificationError = verifiedMutation(ruleset, after, mode, name, plan);
      if (verificationError) throw Error(verificationError);
      receipt.verified = true;
      receipt.rulesetId = after.id;
      receipt.ruleId = after.rules.find(rule => rule.ref === RULE_REF).id;
    } catch (error) { receipt.error = safeMessage(error); }
    results.push(receipt);
  }
  return results;
}
